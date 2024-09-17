#!/usr/bin/env node

'use strict'

/** @typedef { import('./types').OnMessage } OnMessage */
/** @typedef { import('./types').MidiPort } MidiPort */

const midiPort = require('./midi-port')

module.exports = {
  createLaunchpad
}

function createLaunchpad() {
  return new Launchpad()
}

class Launchpad {
  constructor() {
    /** @type { number[] } */
    this.history = []

    /** @type { OnMessage } */
    function onMessage(deltaTime, message) {
      const bytes = message.map(toHex).join(' ')
      console.log(`${Math.round(deltaTime * 1000)}`.padStart(7), bytes)
    }
    
    try {
      /** @type { MidiPort } */
      this.port = midiPort.createActualMidiPort({ 
        name: 'LaunchpadMini' || 'LPMiniMK3 MIDI',
        onMessage,
      })
    } catch (err) {
      throw new Error(`error opening LaunchPad midi port: ${err}`)
    }
  
    process.on('SIGINT', () => shutdown(this.port))
    process.on('SIGTERM', () => shutdown(this.port))
    process.on('SIGBREAK', () => shutdown(this.port))
    setProgrammerMode(this.port)
  }

  /** @type { (value: number) => void } */
  valueIndexed(value) {
    this.history.push(value)
    while (this.history.length > 8) {
      this.history.shift()
    }
  }
}

/** @type {(ms: number) => Promise<void>} */
async function delay(ms) {
  return new Promise((resolve, reject) => setTimeout(resolve, ms))

}

/** @type {(ms: number) => Promise<void>} */
async function getButtonPress(ms) {
  return new Promise((resolve, reject) => setTimeout(resolve, ms))

}

// color 0 sets lite off
/** @type { (port: MidiPort, index: number, color: number) => void } */
function liteOn(port, index, color) {
  //                  F0h   00h   20h   29h   02h   0Dh   03h type index color     F7h
  port.sendMessage([0xF0, 0x00, 0x20, 0x29, 0x02, 0x0D, 0x03, 0,   index, color, 0xF7])

}

/** @type { (port: MidiPort) => void } */
function setProgrammerMode(port) {
  //                  F0h   00h   20h   29h   02h   0Dh   0Eh <mode>  F7h
  port.sendMessage([0xF0, 0x00, 0x20, 0x29, 0x02, 0x0D, 0x0E, 0x01, 0xF7])
}

/** @type { (port: MidiPort) => void } */
function setLiveMode(port) {
  //                  F0h   00h   20h   29h   02h   0Dh   0Eh <mode>  F7h
  port.sendMessage([0xF0, 0x00, 0x20, 0x29, 0x02, 0x0D, 0x0E, 0x00, 0xF7])
}

/** @type { (port: MidiPort) => void } */
function shutdown(port) {
  console.log('shutting down, resetting Launchpad')
  setLiveMode(port)
}

/** @type { (n: number) => string } */
function toHex(n) {
  return n.toString(16).toUpperCase().padStart(2, '0')
}
