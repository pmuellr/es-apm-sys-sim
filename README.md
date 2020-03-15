es-apm-sys-sim - elasticsearch apm system metrics simulator
================================================================================

Writes apm system metrics documents containing cpu usage and free memory
metrics, for the specified number of hosts, on the specified interval, to
the specified index at the specified elasticsearch cluster.

The following fields are written to the elasticsearch index by this utility:

    @timestamp                - current time
    host.name                 - from parameter
    host.name.keyword         - keyword version of host.name
    system.cpu.total.norm.pct - changes over time
    system.memory.actual.free - changes over time
    system.memory.total       - 1,000,000


example
================================================================================

```console
$ es-apm-sys-sim.js 10
generating data based on sine waves
running with interval: 10 sec; hosts: 2; indexName: es-apm-sys-sim; clusterURL: https://elastic:changeme@localhost:9200
sample doc: {
  @timestamp: 2020-03-15T14:57:22.110Z
  host: {name: "host-1"}
  system: {
    cpu: {
      total: {
        norm: {pct: 0.5}
      }
    }
    memory: {
      actual: {free: 200000}
      total: 1000000
    }
  }
}

host-1: c:0.69 m:277K   host-2: c:0.60 m:239K      docs: 2
```


usage
================================================================================

```
es-apm-sys-sim [options] <intervalSeconds> [<hosts> [<indexName> [<clusterURL>]]]
```

Every `<intervalSeconds>` seconds, documents will be written to `<indexName>` at
the elasticsearch cluster `<clusterURL>` for `<hosts>` number of hosts.  The cpu
and free memory values will change over time.  By default, the changes are based
on sine waves, with each subsequent instances using a longer periods.

options:

* `-r` `--random` - change the values based on a random walk, instead of sine waves
* `-k` `--keys` - change the values based on pressed keys; the maximum number of
  instances will be 4.

You can quit the program by pressing `ctrl-c` or `x`.  

The documents written are pretty minimal - open an issue or PR if you want
more fields.


Kibana index pattern, visualization, dashboard
================================================================================

Also included are exported saved objects for the default index name for
an index pattern, lens visualization, and dashboard embedding the visualization.

Import this file in the Kibana / Management / Kibana / Saved Objects page:

* [`es-apm-sys-sim.ndjson`](es-apm-sys-sim.ndjson)

install
================================================================================

    npm install -g pmuellr/es-apm-sys-sim


license
================================================================================

This package is licensed under the MIT license.  See the [LICENSE.md][] file
for more information.


contributing
================================================================================

Awesome!  We're happy that you want to contribute.

Please read the [CONTRIBUTING.md][] file for more information.


[LICENSE.md]: LICENSE.md
[CONTRIBUTING.md]: CONTRIBUTING.md
[CHANGELOG.md]: CHANGELOG.md