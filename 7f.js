'use strict'

// https://archive.org/download/stackexchange/stackoverflow.com-Users.7z

// core
const { spawn } = require('child_process')

// npm
const stdout = require('stdout')
const xml = require('xml-flow')
// const got = require('got')

// const input = got.stream('https://archive.org/download/stackexchange/stackoverflow.com-Users.7z')

const ls = spawn('7z', ['x', '-so', '/home/millette/so/official/stackoverflow.com-Users.7z'])
// const ls = spawn('7z', ['x', '-so', '-si'])
// { stdio: ['pipe'] }

// my 7z (9.2.0) can't handle stdin
// neither can 16.02
// const inp = got.stream('https://archive.org/download/stackexchange/stackoverflow.com-Users.7z')

// inp.pipe(ls.stdin)

const oy = xml(ls.stdout)
const std = stdout()

oy.on('tag:row', (row) => {
  delete row.$name
  std.write(JSON.stringify(row))
  ls.kill()
})

ls.on('close', () => {
  console.error('ls close:')
})

ls.on('error', (er) => {
  console.error('ls error:', er)
})

oy.on('close', () => {
  console.error('oy close:')
})

oy.on('error', (er) => {
  console.error('oy error:', er)
})

/*
inp.on('close', () => {
  console.error('inp close:')
})

inp.on('error', (er) => {
  console.error('inp error:', er)
})
*/
