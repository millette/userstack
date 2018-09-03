'use strict'

// core
const { writeFileSync } = require('fs')
const url = require('url')

// npm
const got = require('got')
const delay = require('delay')
const opn = require('opn')

const clientID = 13050 // not a secret
const key = 'WT5yyJg7wH7LTFZHls4i)g((' // not a secret
const redirectURI = 'https://stackoverflow.com/oauth/login_success'

const getToken = (x) => {
  const zzz = url.parse(x)
  const { query } = url.parse(url.format({ ...zzz, hash: null, search: `?${zzz.hash.slice(1)}` }), true)

  if (!query.access_token || !query.expires) {
    throw new Error('Malformed. Missing access_token or expires keys.')
  }
  const creds = {
    token: query.access_token,
    expiresAt: query.expires * 1000 + Date.now()
  }
  writeFileSync('creds.json', JSON.stringify(creds, null, '  '), 'utf-8')
  return Promise.resolve(creds.token)
}

process.stdin.setEncoding('utf8')

const auth = async () => {
  try {
    const creds = require('./creds.json')
    const now = Date.now()
    if (creds.token && (now < creds.expiresAt)) {
      return creds.token
    }
  } catch (eee) {
    // no worries
  }
  console.log(`Confirm in your browser you want to give us specified permissions.
After confirmation, you will be taken to a URL like
'https://stackoverflow.com/oauth/login_success#access_token=SomeComplexRandomTokenStuff&expires=86400'

Copy that URL here and press enter.
`)

  const [, query] = await Promise.all([
    opn(`https://stackoverflow.com/oauth/dialog?client_id=${clientID}&redirect_uri=${redirectURI}`, { app: 'firefox' }),
    new Promise((resolve, reject) => {
      let c
      process.stdin.on('readable', () => {
        const chunk = process.stdin.read()
        const c2 = chunk && chunk.trim()
        if (!c2) { return }
        c = c2
        process.stdin.end()
      })

      process.stdin.on('close', () => {
        if (!c) {
          return reject(new Error('No response? Why not...'))
        }
        getToken(c)
          .then(resolve)
          .catch(reject)
      })

      process.stdin.on('error', reject)
    })
  ])
  return query
}

const g1 = (p, token) => got(`https://api.stackexchange.com/2.2/users?page=${p || 1}&pagesize=100&fromdate=1528003000&order=asc&sort=creation&site=stackoverflow&access_token=${token}&key=${key}`, { json: true })
  .catch((e) => {
    if (e.statusCode === 400) {
      let lp = {}
      try {
        lp = require('./last-page-since.json')
      } catch (eee) {
        // no biggie
      }
      lp.remaining = -1
      writeFileSync('last-page-since.json', JSON.stringify(lp, null, '  '), 'utf-8')
    }
    throw e
  })

const g2 = async (token) => {
  let remaining
  let nextPage
  let lp
  try {
    lp = require('./last-page-since.json')
  } catch (eee) {
    // no biggie
  }

  if (lp && lp.remaining < 1) {
    if ((process.argv[2] !== '--force') && (process.argv[2] !== '-f')) {
      console.log('Use --force or -f to force process if you think your quota is now ok.')
      return { throttled: true }
    }
    lp.remaining = 10000
    writeFileSync('last-page-since.json', JSON.stringify(lp, null, '  '), 'utf-8')
  }

  const first = (lp && lp.nextPage) || 1
  const last = first + ((lp && lp.remaining) || 10000) - 1
  console.log(`Processing ${first} to ${last} pages.`)

  for (nextPage = first; nextPage < last; ++nextPage) {
    console.log(`${new Date().toISOString()} fetching page ${nextPage}`)
    const x = await g1(nextPage, token)
    remaining = x.body.quota_remaining
    writeFileSync(`so-page-since-${nextPage}.json`, JSON.stringify({ body: x.body, headers: x.headers }, null, '  '), 'utf-8')
    if (!x.body.has_more) {
      break
    }
    if (x.body.backoff) {
      console.log(`${new Date().toISOString()} sleeping ${x.body.backoff}s`)
      await delay(x.body.backoff * 1000)
    }
  }

  const ret = {
    remaining,
    nextPage
  }

  writeFileSync('last-page.json', JSON.stringify(ret, null, '  '), 'utf-8')
  return ret
}

auth()
  .then(g2)
  .then(console.log)
  .catch(console.error)
