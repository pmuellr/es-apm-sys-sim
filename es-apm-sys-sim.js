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

const [intervalS, indexName, clusterURL] = cliOptions.input

if (intervalS == null) logError('intervalSeconds parameter missing')
const interval = parseInt(intervalS, 10)
if (isNaN(interval)) logError(`invalid interval parameter: ${intervalS}`)
if (indexName == null) logError('indexName parameter missing')
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
const CpuMetrics = {
  A: createMetric(0.4, 0.1, 0, 1),
  B: createMetric(0.4, 0.1, 0, 1),
  C: createMetric(0.4, 0.1, 0, 1)
}

const MemMetrics = {
  A: createMetric(400 * 1000, 100 * 1000, 0, 900 * 1000),
  B: createMetric(400 * 1000, 100 * 1000, 0, 900 * 1000),
  C: createMetric(400 * 1000, 100 * 1000, 0, 900 * 1000)
}

printRuntimeHelp()

setInterval(writeDocs, interval * 1000)
setInterval(logDocsWritten, 30 * 1000)

kbd.on(null, printRuntimeHelp)
kbd.on('h', printFullHelp)
kbd.on('c-c', () => process.exit())
kbd.on('s-q', () => process.exit())

kbd.on('q', () => { CpuMetrics.A.down(); printCurrent() })
kbd.on('w', () => { CpuMetrics.A.up(); printCurrent() })
kbd.on('e', () => { MemMetrics.A.down(); printCurrent() })
kbd.on('r', () => { MemMetrics.A.up(); printCurrent() })

kbd.on('a', () => { CpuMetrics.B.down(); printCurrent() })
kbd.on('s', () => { CpuMetrics.B.up(); printCurrent() })
kbd.on('d', () => { MemMetrics.B.down(); printCurrent() })
kbd.on('f', () => { MemMetrics.B.up(); printCurrent() })

kbd.on('z', () => { CpuMetrics.C.down(); printCurrent() })
kbd.on('x', () => { CpuMetrics.C.up(); printCurrent() })
kbd.on('c', () => { MemMetrics.C.down(); printCurrent() })
kbd.on('v', () => { MemMetrics.C.up(); printCurrent() })

function printCurrent () {
  console.log(`current data written:`);
  for (const name of Object.keys(CpuMetrics)) {
    const cpuMetric = CpuMetrics[name]
    const memMetric = MemMetrics[name]
    const cpu = `${cpuMetric.currentValue}`.padStart(4)
    const mem = `${memMetric.currentValue / 1000}`.padStart(3)
    console.log(`  host-${name} cpu: ${cpu} free mem: ${mem}KB`)
  }
}

function logDocsWritten () {
  console.log(`total docs written: ${DocsWritten}`)
}

async function writeDocs () {
  for (const name of Object.keys(CpuMetrics)) {
    await writeDoc(name)
  }
}

async function writeDoc (name) {
  const doc = generateDoc(name)

  let response
  try {
    response = await esClient.index({
      index: indexName,
      body: doc
    })
  } catch (err) {
    logError(`error indexing document: ${JSON.stringify(err, null, 4)}`)
  }

  if (response.statusCode !== 201) {
    logError(`unexpected error indexing document: ${JSON.stringify(response, null, 4)}`)
  }

  DocsWritten++
}

function printFullHelp () {
  console.log('')
  console.log('-------------------------------------------------------')
  console.log(getHelp())
  console.log('-------------------------------------------------------')
  console.log('')
}

function printRuntimeHelp () {
  console.log('')
  console.log('-------------------------------------------------------')
  console.log('help: press "shift-q" or "ctrl-c" to exit, "h" for help')
  console.log('  host-A: press q/w to modify cpu, e/r to modify mem')
  console.log('  host-B: press a/s to modify cpu, d/f to modify mem')
  console.log('  host-C: press z/x to modify cpu, c/v to modify mem')
  console.log()
  printCurrent()
  console.log('-------------------------------------------------------')
  console.log('')
}

function generateDoc (name) {
  return {
    '@timestamp': new Date().toISOString(),
    host: {
        name: `host-${name}`
    },
    system: {
        cpu: {
            total: {
                norm: {
                    pct: CpuMetrics[name].currentValue
                }
            }
        },
        memory: {
            actual: {
                free: MemMetrics[name].currentValue
            },
            total: 1000000
        }
    }
  }
}

function getHelp () {
  return `
es-apm-sys-sim <intervalSeconds> <indexName> <clusterURL>

Writes apm system metrics documents on an interval, allowing the cpu usage and
free mem metrics to be changed with keyboard presses.

Fields in documents written:
  @timestamp                 current time
  host.name                  host name 
  host.name.keyword          host name (keyword field for aggregations)
  system.cpu.total.norm.pct  cpu usage,    0 -> 1 
  memory.actual.free         free memory,  0 -> 900KB 
  memory.total               total memory, 1MB heh
`.trim()
}

function logError (message) {
  console.log(message)
  process.exit(1)
}
