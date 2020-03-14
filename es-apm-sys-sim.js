#!/usr/bin/env node

'use strict'

const meow = require('meow')
const hJSON = require('hjson')
const es = require('@elastic/elasticsearch')

const { createSineMetric } = require('./lib/sine-metric')
const { createRandomMetric } = require('./lib/random-metric')
const { createStepMetric } = require('./lib/step-metric')
const { createKeyboard } = require('./lib/keyboard')

const DEBUG = process.env.DEBUG != null
const MAX_MEM = 1000 * 1000 // ONE WHOLE MEGABYTE OF MEMORY!!!

const hostKeys = [
  { inc: '1', dec: 'q' },
  { inc: '2', dec: 'w' },
  { inc: '3', dec: 'e' },
  { inc: '4', dec: 'r' },
]

const cliOptions = meow(getHelp(), {
  flags: {
    help: {
      type: 'boolean',
      alias: 'h',
      default: false
    },
    keys: {
      type: 'boolean',
      alias: 'k',
      default: false
    },
    random: {
      type: 'boolean',
      alias: 'r',
      default: false
    }
  }
})

if (cliOptions.flags.help || cliOptions.input.length === 0) {
  console.log(getHelp())
  process.exit(1)
}

const isRandom = !!cliOptions.flags.random
const isKeys = !!cliOptions.flags.keys
if (isRandom && isKeys) logError('--random and --keys can not be used together')

const mode = isRandom ? 'random walks' : isKeys ? 'keys pressed' : 'sine waves'
console.log(`generating data based on ${mode}`)

const maxInstances = isKeys ? 4 : 1000

const [intervalS, instancesS, indexName, clusterURL] = cliOptions.input

if (intervalS == null) logError('interval parameter missing')
const interval = parseInt(intervalS, 10)
if (isNaN(interval)) logError(`invalid interval parameter: ${intervalS}`)

if (instancesS == null) logError('instances parameter missing')
const instances = Math.min(maxInstances, parseInt(instancesS, 10))
if (isNaN(instances)) logError(`invalid instances parameter: ${intervalS}`)

if (indexName == null) logError('indexName parameter missing')
if (clusterURL == null) logError('clusterURL parameter missing')

let DocsWritten = 0

/** @type { Host[] } */
const hosts = []

setImmediate(main)

/** @type { () =>void } */
function main() {
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
  
  for (let i = 0; i < instances; i++) {
    hosts.push(new Host(i, 16 * (i + 1), isRandom, isKeys))
  }

  const kbd = createKeyboard()
  kbd.on(null, printRuntimeHelp)
  kbd.on('x', () => process.exit())
  if (isKeys) {
    for (const host of hosts) {
      const key = String.fromCharCode(49 + host.instance)
      kbd.on(hostKeys[host.instance].inc, () => host.inc())
      kbd.on(hostKeys[host.instance].dec, () => host.dec())
    }
  }

  setImmediate(update)
  setInterval(update, 1000 * interval)
  setInterval(logDocsWritten, 1000 * 30)

  let wroteSampleDoc = false
  function update() {
    for (const host of hosts) {
      const doc = host.nextDocument()
      writeDoc(esClient, doc)

      if (!wroteSampleDoc) {
        wroteSampleDoc = true
        const printable = hJSON.stringify(doc, {
          //@ts-ignore doesn't like condense option
          condense: 10000,
          bracesSameLine: true,
        })
        //@ts-ignore doesn't like condense option
        console.log(`sample doc:`, printable)
        console.log('')
      }

      printCurrentStatus()
    }
  }
}

function printRuntimeHelp () {
  if (isKeys) {
    console.log(`\n\nhelp: press "1" ... "${instances}" to increase, "q", "w", ... to decrease, "x" to exit`)
  } else {
    console.log(`\n\nhelp: press "x" to exit`)
  }
  printCurrentStatus()
}

function printCurrentStatus() {
  const statuses = hosts.slice(0, 4).map(host => host.statusString())
  const missing = hosts.length <= 4 ? '' : ` (${hosts.length - 4} hosts not shown)`
  process.stdout.write(`\r${statuses.join('   ')}${missing}`)
}

function logDocsWritten () {
  console.log(`\ntotal docs written: ${DocsWritten}`)
}

class Host {
  constructor(instance, period, isRandom, isKeys) {
    this.instance = instance
    this.hostName = `host-${instance + 1}`
    this.isKeys = isKeys

    this.cpuMetric = createMetric({
      isKeys,
      isRandom,
      min: 0,
      max: 1,
      period,
    })    
    this.memMetric = createMetric({
      isKeys,
      isRandom,
      min:  0,
      max: MAX_MEM * 4 / 10,
      period,
    })    
  }

  statusString() {
    const cpu = this.cpuMetric.current.toFixed(2)
    const mem = Math.round(this.memMetric.current / 1000)
    const memS = `${mem}`.padStart(3)

    return `${this.hostName}: cpu: ${cpu} mfr: ${memS}K`
  }

  /** @type { () => any } */
  nextDocument() {
    const cpu = this.cpuMetric.next()
    const mem = this.memMetric.next()
    return getDocument(this.hostName, cpu, mem)
  }

  inc() {
    if (!this.isKeys) return
    this.cpuMetric.inc()
    this.memMetric.inc()
    printCurrentStatus()
  }

  dec() {
    if (!this.isKeys) return
    this.cpuMetric.dec()
    this.memMetric.dec()
    printCurrentStatus()
  }
}

function createMetric ({isRandom, isKeys, min, max, period}) {
  if (isRandom) return createRandomMetric({ min, max });
  if (isKeys) return createStepMetric({ min, max });
  return createSineMetric({ min, max, period });
}

/** @type { (esClient: any, doc: any) => Promise<void> } */
async function writeDoc (esClient, doc) {
  if (DEBUG) console.log(`writing doc ${indexName}: ${JSON.stringify(doc)}`)
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

/** @type { (hostName: string, cpu: number, mem: number) => any } */
function getDocument(hostName, cpu, mem) {
  return {
    '@timestamp': new Date().toISOString(),
    host: {
        name: hostName
    },
    system: {
        cpu: {
            total: {
                norm: {
                    pct: cpu
                }
            }
        },
        memory: {
            actual: {
                free: mem
            },
            total: MAX_MEM
        }
    }
  }
}

/** @type { () => string } */
function getHelp () {
  return `
es-apm-sys-sim [options] <intervalSeconds> <instances> <indexName> <clusterURL>

Writes apm system metrics documents on an interval, the cpu usage and
free mem metrics.

options:
  -r, --random
  -k, --keys

If the --random or -r flag is used, the data generated is based on random walks,
otherwise it's based on sine waves.

If the --keys or -k flag is used, the data generated based on keys pressed.  The
maximum number of instances will be 4.

Otherwise, the data generated is based on sine waves.

Fields in documents written:
  @timestamp                 current time
  host.name                  host name 
  host.name.keyword          host name (keyword field for aggregations)
  system.cpu.total.norm.pct  cpu usage,    0 -> 1 
  memory.actual.free         free memory,  0 -> 900KB 
  memory.total               total memory, 1MB heh
`.trim()
}

/** @type { (string) => void } */
function logError (message) {
  console.log(message)
  process.exit(1)
}
