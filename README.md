es-apm-sys-sim - elasticsearch apm system metrics simulator
================================================================================

`es-apm-sys-sim` is an elasticsearch apm system metrics simulator, indexing
documents directly into elasticsearch, changing the values based on a sine
wave, or random walk.

These metrics - and many more! - are typically written into indices named
`apm-{stack-version}-metric-{ilm-rollover-index}`

The following fields are written to the elasticsearch index by this utility:

    @timestamp                - current time
    host.name                 - from parameter
    system.cpu.total.norm.pct - changes over time
    system.memory.actual.free - changes over time
    system.memory.total       - 1,000,000


example
================================================================================

```console
$ es-apm-sys-sim 1 1 apm-sys-sim https://elastic:changeme@localhost:9200

total docs written: 116
total docs written: 236
...
...
```


usage
================================================================================

```
es-apm-sys-sim [--random|-r] <interval> <instances> <index-name> <elastic-search-url>
```

Every `<interval>` seconds, documents will be written to `<index-name>` at
the elasticsearch cluster `<elastic-search-url>` for `<instances>` number
of hosts.

The `-r` `--random` flag will change the values based on a random walk, instead
of basing the changing values on sine waves.

You can quit the program by pressing `control-c`.  

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