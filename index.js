'use strict'

// core
const { writeFileSync } = require('fs')
const url = require('url')

// npm
const got = require('got')
const delay = require('delay')
const opn = require('opn')

const client_id = 13050 // not a secret
const key = 'WT5yyJg7wH7LTFZHls4i)g((' // not a secret
const redirect_uri = 'https://stackoverflow.com/oauth/login_success'

const getToken = (x) => {
  const zzz = url.parse(x)
  const { query } = url.parse(url.format({ ...zzz, hash: null, search: `?${zzz.hash.slice(1)}` }), true)
  const creds = {
    token: query.access_token,
    expiresAt: query.expires * 1000 + Date.now()
  }
  writeFileSync('creds.json', JSON.stringify(creds, null, '  '), 'utf-8')
  return creds
}

process.stdin.setEncoding('utf8')

const auth = async () => {
  try {
    const creds = require('./creds.json')
    const now = Date.now()
    if (creds.token && (now < creds.expiresAt)) {
      return creds
    }
  } catch (e) {
    // no worries
    console.log('CATCHING', e)
  }
  console.log(`Confirm in your browser you want to give us specified permissions.
After confirmation, you will be taken to a URL like
'https://stackoverflow.com/oauth/login_success#access_token=SomeComplexRandomTokenStuff&expires=86400'

Copy that URL here and press enter.
`)

  const [bah, query] = await Promise.all([
    opn(`https://stackoverflow.com/oauth/dialog?client_id=${client_id}&redirect_uri=${redirect_uri}`, { app: 'firefox' }),
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
        if (c) {
          return resolve(getToken(c))
        }
        reject(new Error('No response? Why not...'))
      })

      process.stdin.on('error', reject)
    })
  ])
  return query
}

const g1 = (p, token) => got(`https://api.stackexchange.com/2.2/users?page=${p || 1}&pagesize=100&order=asc&sort=creation&site=stackoverflow&access_token=${token}&key=${key}`, { json: true })

const g2 = async (token) => {
  let quota_remaining
  let nextPage
  let lp
  try {
    lp = require('./last-page.json')
  } catch (e) {
    // no biggie
  }

  if (lp && lp.quota_remaining < 1) {
    if ((process.argv[2] !== '--force') && (process.argv[2] !== '-f')) {
      console.log('Use --force or -f to force process if you think your quota is now ok.')
      return { throttled: true }
    }
    lp.quota_remaining = 10000
    writeFileSync('last-page.json', JSON.stringify(lp, null, '  '), 'utf-8')
  }

  const first = lp ? lp.nextPage : 1
  const last = first + lp.quota_remaining - 1
  console.log(`Processing ${first} to ${last} pages.`)

  for (nextPage = first; nextPage < last; ++nextPage) {
    console.log(`${new Date().toISOString()} fetching page ${nextPage}`)
    const x = await g1(nextPage, token)
    quota_remaining = x.body.quota_remaining
    writeFileSync(`so-page-${nextPage}.json`, JSON.stringify({ body: x.body, headers: x.headers }, null, '  '), 'utf-8')
    if (x.body.backoff) {
      console.log(`${new Date().toISOString()} sleeping ${x.body.backoff}s`)
      await delay(x.body.backoff * 1000)
    }
  }

  const ret = {
    quota_remaining,
    nextPage
  }

  writeFileSync('last-page.json', JSON.stringify(ret, null, '  '), 'utf-8')
  return ret
}

const run = async () => {
  const { token } = await auth()
  return g2(token)
}

run()
  .then(console.log)
  .catch((e) => {
    console.error('FINAL ERROR:', e)
  })
