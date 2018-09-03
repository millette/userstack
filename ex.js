// core
const fs = require('fs')

// npm
const tar = require('tar-stream')
const gunzip = require('gunzip-maybe')
const JSONStream = require('JSONStream')
const stdout = require('stdout')

const pack = fs.createReadStream('so-first-500.tar.gz').pipe(gunzip())
const extract = tar.extract()

const skipper = (x) => {
  const loc = x.location ? x.location.toLowerCase() : ''
  if ((loc.indexOf('qc') !== -1) || (loc.indexOf('quebec') !== -1) || (loc.indexOf('canada') !== -1) || (loc.indexOf('montreal') !== -1)) {
    return Object.keys(x).sort().map((y) => JSON.stringify(x[y])).join(',')
  }
}

extract.on('entry', (header, stream, next) => {
  stream
    .pipe(JSONStream.parse('body.items.*', skipper))
    .pipe(stdout())
  stream.on('end', next)
  stream.resume()
})

pack.pipe(extract)
