es-apm-sys-sim - elasticsearch apm system metrics simulator
================================================================================

`es-apm-sys-sim` is an elasticsearch apm system metrics simulator, indexing
documents directly into elasticsearch, changing the values based on a sine
wave, random walk, or keys pressed.

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
$ es-apm-sys-sim.js 1 2 es-apm-sys-sim $ES_URL
generating data based on sine waves
...

host-1: cpu: 0.31 mfr: 123K   host-2: cpu: 0.99 mfr: 396K
```


usage
================================================================================

```
es-apm-sys-sim [options] <interval> <instances> <index-name> <elastic-search-url>
```

Every `<interval>` seconds, documents will be written to `<index-name>` at
the elasticsearch cluster `<elastic-search-url>` for `<instances>` number
of hosts.  The cpu and free memory values will change over time.  By default,
the changes are based on sine waves, with each subsequent instances using a
longer periods.

options:

* `-r` `--random` - change the values based on a random walk, instead of sine waves
* `-k` `--keys` - change the values based on pressed keys; the maximum number of
  instances will be 4.

You can quit the program by pressing `x`.  

The documents written are pretty minimal - open an issue or PR if you want
more fields.

```js
{
    @timestamp: '2019-12-15T17:16:44.765Z',
    host: {
        name: 'host-A'
    },
    system: {
        cpu: {
            total: {
                norm: {
                    pct: 0.5
                }
            }
        },
        memory: {
            actual: {
                free: 400000
            }
            total: 1000000
        }
    }
}
```

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