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
const DEFAULT_INDEX_NAME = 'es-apm-sys-sim'
const DEFAULT_CLUSTER_URL = 'http://elastic:changeme@localhost:9200'
const DEFAULT_CLUSTER_URL_ENV = 'ES_URL'
const DEFAULT_HOSTS = 2
const MAX_DISPLAYED_HOSTS = 4

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

const maxHosts = isKeys ? MAX_DISPLAYED_HOSTS : 1000

const [
  intervalS, 
  hostsS = `${DEFAULT_HOSTS}`, 
  indexName = DEFAULT_INDEX_NAME, 
  clusterURL = process.env[DEFAULT_CLUSTER_URL_ENV] || DEFAULT_CLUSTER_URL
] = cliOptions.input
if (intervalS == null) logError('interval parameter missing')

const interval = parseInt(intervalS, 10)
if (isNaN(interval)) logError(`invalid interval parameter: ${intervalS}`)

const hosts = Math.min(maxHosts, parseInt(hostsS, 10))
if (isNaN(hosts)) logError(`invalid hosts parameter: ${intervalS}`)

console.log([
  `running with`,
  `interval: ${interval} sec;`,
  `hosts: ${hosts};`,
  `indexName: ${indexName};`,
  `clusterURL: ${clusterURL}`
].join(' '))

let DocsWritten = 0

/** @type { Host[] } */
const Hosts = []

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
  
  for (let i = 0; i < hosts; i++) {
    Hosts.push(new Host(i, 16 * (i + 1), isRandom, isKeys))
  }

  const kbd = createKeyboard()
  kbd.on(null, printRuntimeHelp)
  kbd.on('x', () => process.exit())
  kbd.on('ctrl-c', () => process.exit())
  if (isKeys) {
    for (const host of Hosts) {
      const key = String.fromCharCode(49 + host.instance)
      kbd.on(hostKeys[host.instance].inc, () => host.inc())
      kbd.on(hostKeys[host.instance].dec, () => host.dec())
    }
  }

  setImmediate(update)
  setInterval(update, 1000 * interval)

  let wroteSampleDoc = false
  function update() {
    for (const host of Hosts) {
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
    console.log(`\n\nhelp: press "1" ... "${hosts}" to increase, "q", "w", ... to decrease, "ctrl-c" or "x" to exit`)
  } else {
    console.log(`\n\nhelp: press "ctrl-c" to exit`)
  }
  printCurrentStatus()
}

function printCurrentStatus() {
  const statuses = Hosts.slice(0, MAX_DISPLAYED_HOSTS).map(host => host.statusString())
  const missing = Hosts.length <= MAX_DISPLAYED_HOSTS ? '' : ` (${Hosts.length - MAX_DISPLAYED_HOSTS} not shown)`
  statuses.push(missing)
  statuses.push(`docs: ${DocsWritten}`)
  process.stdout.write(`\r${statuses.join('   ')}`)
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

    return `${this.hostName}: c:${cpu} m:${memS}K`
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
es-apm-sys-sim [options] <intervalSeconds> [<hosts> [<indexName> [<clusterURL>]]]

Writes apm system metrics documents containing cpu usage and free memory
metrics, for the specified number of hosts, on the specified interval, to
the specified index at the specified elasticsearch cluster.

<hosts>      defaults to ${DEFAULT_HOSTS} if not supplied
<indexName>  defaults to es-apm-sys-sim if not supplied
<clusterURL> defaults to the environment variable ${DEFAULT_CLUSTER_URL_ENV} or the value
             ${DEFAULT_CLUSTER_URL}

options:
  -r, --random
  -k, --keys

If the --random or -r flag is used, the data generated is based on random walks.

If the --keys or -k flag is used, the data generated based on keys pressed.  The
maximum number of hosts will be ${MAX_DISPLAYED_HOSTS}.

Otherwise, the data generated is based on sine waves.

Fields in documents written:
  @timestamp                 current time
  host.name                  host name 
  host.name.keyword          host name (keyword field for aggregations)
  system.cpu.total.norm.pct  cpu usage,    0 -> 1 
  memory.actual.free         free memory,  0 -> 400KB 
  memory.total               total memory, 1MB heh
`.trim()
}

/** @type { (string) => void } */
function logError (message) {
  console.log(message)
  process.exit(1)
}
