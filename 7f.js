'use strict'

// core
const { spawn } = require('child_process')

// npm
const stdout = require('stdout')
const xml = require('xml-flow')

const ls = spawn('7z', ['x', '-so', '/home/millette/so/official/stackoverflow.com-Users.7z'])
const oy = xml(ls.stdout)
const std = stdout()

oy.on('tag:row', (row) => {
  delete row.$name
  std.write(JSON.stringify(row))
  ls.kill()
})
