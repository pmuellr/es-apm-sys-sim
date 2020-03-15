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

  on (name, handler) {
    this.keyDefs.set(name, handler)
  }

  _processKeypress (string, state) {
    let keyDefName = `${state.sequence}`

    if (state.name === 'c' && state.ctrl) {
      keyDefName = 'ctrl-c'
    }

    let fn = this.keyDefs.get(keyDefName)
    if (fn == null) {
      fn = this.keyDefs.get(null)
    }

    if (fn == null) return

    setImmediate(fn, keyDefName)
  }
}
