#!/usr/bin/env node

'use strict'

const meow = require('meow')
const es = require('@elastic/elasticsearch')

const DEBUG = process.env.DEBUG != null
const MAX_MEM = 1000 * 1000
const { createSineMetric } = require('./lib/sine-metric')

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

const [intervalS, instancesS, indexName, clusterURL] = cliOptions.input

if (intervalS == null) logError('interval parameter missing')
const interval = parseInt(intervalS, 10)
if (isNaN(interval)) logError(`invalid interval parameter: ${intervalS}`)

if (instancesS == null) logError('instances parameter missing')
const instances = parseInt(instancesS, 10)
if (isNaN(instances)) logError(`invalid instances parameter: ${intervalS}`)

if (indexName == null) logError('indexName parameter missing')
if (clusterURL == null) logError('clusterURL parameter missing')

let DocsWritten = 0

setImmediate(main)

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
  
  const hosts = []
  for (let i = 0; i < instances; i++) {
    hosts.push(new Host(i, 16 * (i + 1)))
  }

  setInterval(update, 1000 * interval)
  setInterval(logDocsWritten, 1000 * 30)

  function update() {
    for (const host of hosts) {
      const doc = host.nextDocument()
      writeDoc(esClient, doc)
    }
  }
}

class Host {
  constructor(instance, period) {
    this.hostName = `host-${String.fromCharCode(instance + 65)}`
    this.cpuMetric = createSineMetric({
      min: 0,
      max: 100,
      period,
    })    
    this.memMetric = createSineMetric({
      min:  0,
      max: MAX_MEM * 4 / 10,
      period,
    })    
  }

  nextDocument() {
    const cpu = this.cpuMetric.next()
    const mem = this.memMetric.next()
    return getDocument(this.hostName, cpu, mem)
  }
}

function logDocsWritten () {
  console.log(`total docs written: ${DocsWritten}`)
}

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

function getHelp () {
  return `
es-apm-sys-sim <intervalSeconds> <instances> <indexName> <clusterURL>

Writes apm system metrics documents on an interval, the cpu usage and
free mem metrics changing based on sine waves.

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
