#!/usr/bin/env node

'use strict'

const meow = require('meow')
const es = require('@elastic/elasticsearch')

const { createKeyboard } = require('./lib/keyboard')
const { createMetric } = require('./lib/metric')

const kbd = createKeyboard()

const cliOptions = meow(getHelp(), {
  flags: {
    help: {
      type: 'boolean',
      alias: 'h',
      default: false
    }
  }
})

if (cliOptions.flags.help || cliOptions.input.length === 0) {
  console.log(getHelp())
  process.exit(1)
}

const [intervalS, indexName, hostName, clusterURL] = cliOptions.input

if (intervalS == null) logError('intervalSeconds parameter missing')
const interval = parseInt(intervalS, 10)
if (isNaN(interval)) logError(`invalid interval parameter: ${intervalS}`)
if (indexName == null) logError('indexName parameter missing')
if (hostName == null) logError('hostName parameter missing')
if (clusterURL == null) logError('clusterURL parameter missing')

let esClient

try {
  esClient = new es.Client({
    node: clusterURL,
    ssl: {
      rejectUnauthorized: false
    }
  })
} catch (err) {
  logError(`error creating ES client: ${err.message}`)
}

let DocsWritten = 0
const CpuMetric = createMetric(0.4, 0.2, 0, 1)
const MemMetric = createMetric(400 * 1000, 100 * 1000, 0, 400 * 1000)

printRuntimeHelp()

setInterval(writeDoc, interval * 1000)
setInterval(logDocsWritten, 30 * 1000)

kbd.on(null, printRuntimeHelp)
kbd.on('c-c', () => process.exit())
kbd.on('q', () => process.exit())

kbd.on('a', () => { CpuMetric.down(); printCurrent() })
kbd.on('s', () => { CpuMetric.up(); printCurrent() })
kbd.on('d', () => { MemMetric.down(); printCurrent() })
kbd.on('f', () => { MemMetric.up(); printCurrent() })

function printCurrent () {
  console.log(`current data written: hostname: ${hostName} cpu: ${CpuMetric.currentValue} mem: ${MemMetric.currentValue}`)
}

function logDocsWritten () {
  console.log(`total docs written: ${DocsWritten}`)
}

async function writeDoc () {
  const doc = generateDoc()

  let response
  try {
    response = await esClient.index({
      index: indexName,
      body: doc
    })
  } catch (err) {
    logError(`error indexing document: ${err.message}`)
  }

  if (response.statusCode !== 201) {
    logError(`unexpected error indexing document: ${JSON.stringify(response)}`)
  }

  DocsWritten++
}

function printRuntimeHelp () {
  console.log('help: press a/s to modify cpu, d/f to modify mem, "q" to exit')
  printCurrent()
}

function generateDoc () {
  return {
    '@timestamp': new Date().toISOString(),
    host: {
        name: hostName
    },
    system: {
        cpu: {
            total: {
                norm: {
                    pct: CpuMetric.currentValue
                }
            }
        },
        memory: {
            actual: {
                free: MemMetric.currentValue
            },
            total: 1000000
        }
    }
  }
}

function getHelp () {
  return `
es-apm-sys-sim <intervalSeconds> <indexName> <hostName> <clusterURL>

Writes apm system metrics documents on an interval, allowing the cpu usage and
free mem metrics to be changed with keyboard presses.
  `.trim()
}

function logError (message) {
  console.log(message)
  process.exit(1)
}
