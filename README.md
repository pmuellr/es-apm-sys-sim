es-apm-sys-sim - elasticsearch apm system metrics simulator
================================================================================

`es-apm-sys-sim` is an elasticsearch apm system metrics simulator, indexing
documents directly into elasticsearch, allowing metrics being written to be
modified live via keypress.

These metrics - and many more! - are typically written into indices named
`apm-{stack-version}-metric-{ilm-rollover-index}`

The following fields are written to the elasticsearch index:

    @timestamp                - current time
    host.name                 - from parameter
    system.cpu.total.norm.pct - changeable via keystroke
    system.memory.actual.free - changeable via keystroke
    system.memory.total       - 1,000,000


example
================================================================================

```console
$ es-apm-sys-sim 1 apm-sys-sim example.com https://elastic:changeme@localhost:9200
help: press a/s to modify cpu, d/f to modify mem, "q" to exit
current data written: hostname: example cpu: 0.4 mem: 400000
    (key "a" pressed)
current data written: hostname: example cpu: 0.2 mem: 400000
    (key "a" pressed again)
current data written: hostname: example cpu: 0 mem: 400000
    (30 seconds later)
total docs written: 29
...
```


usage
================================================================================

```
es-apm-sys-sim <interval> <index-name> <host-name> <elastic-search-url>
```

Every `<interval>` seconds, a document will be written to `<index-name>` at
the elasticsearch cluster `<elastic-search-url>` using the specified
`<host-name>`.

You can quit the program by pressing `q` or `control-c`.  

You can change the `system.cpu.total.norm.pct` value written by pressing
`a` to decrease and `s` to increase.

You can change the `system.memory.actual.free` value written by pressing
`d` to decrease and `f` to increase.

Every 30 seconds, the number of documents indexed is logged.

The documents written are pretty minimal - open an issue or PR if you want
more fields.

```js
{
    @timestamp: '2019-12-15T17:16:44.765Z',
    host: {
        name: 'from-parameter'
    },
    system: {
        cpu: {
            total: {
                norm: {
                    pct: 0 // changeable via keypress
                }
            }
        },
        memory: {
            actual: {
                free: 0 // changeable via keypress
            }
            total: 1,000,000
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