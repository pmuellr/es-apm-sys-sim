#!/usr/bin/env node

'use strict'

const readline = require('readline')

module.exports = {
  createKeyboard
}

function createKeyboard () {
  return new Keyboard()
}

class Keyboard {
  constructor () {
    this.keyDefs = new Map()

    readline.emitKeypressEvents(process.stdin)
    try {
      process.stdin.setRawMode(true)
    } catch (err) {
      // ignore, fails when debugging in vsCode
    }
    process.stdin.on('keypress', this._processKeypress.bind(this))
  }

  // name: `a`, `c-a`, `s-a`
  on (name, handler) {
    this.keyDefs.set(name, handler)
  }

  _processKeypress (string, state) {
    let keyDefName = `${state.name}`
    if (state.ctrl) keyDefName = `c-${keyDefName}`
    if (state.shift) keyDefName = `s-${keyDefName}`

    let fn = this.keyDefs.get(keyDefName)
    if (fn == null) {
      fn = this.keyDefs.get(null)
    }

    if (fn == null) return

    setImmediate(fn, keyDefName)
  }
}

//@ts-ignore
if (require.main === module) test()

function test () {
  console.log('press ctrl-c to exit')
  console.log('press combinations of a, shift-a, ctrl-a')

  const kbd = new Keyboard()
  kbd.on('c-c', key => {
    console.log('exiting ...')
    process.exit(1)
  })

  kbd.on('a', key => logKey(key, '          a'))
  kbd.on('c-a', key => logKey(key, '     ctrl-a'))
  kbd.on('s-a', key => logKey(key, '    shift-a'))
  kbd.on(null, key => logKey(key, '(not bound)'))

  function logKey (keyDefName, message) {
    console.log(`${message}: ${keyDefName}`)
  }
}
