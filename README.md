# Dataform tools - a vscode extension

[![Version](https://img.shields.io/github/v/release/ashish10alex/vscode-dataform-tools)](https://github.com/ashish10alex/vscode-dataform-tools/releases)
![Installs](https://img.shields.io/vscode-marketplace/i/ashishalex.dataform-lsp-vscode.svg)
![Linux](https://img.shields.io/badge/Linux-supported-success)
![macOS](https://img.shields.io/badge/macOS-supported-success)
![Windows](https://img.shields.io/badge/windows-supported-success)

⚠️ ***This is not an officially supported Google product.***


[VS Code extension](https://marketplace.visualstudio.com/items?itemName=ashishalex.dataform-lsp-vscode) for [Dataform](https://github.com/dataform-co/dataform) with following features


| Feature | Description |
|---------|-------------|
| [Compilation & Dry run stats](#compilation) | Compiled query in a vertical split |
| [Dependancy graph](#depgraph) | Interative dependancy graph with external sources higlighted in distinct colors |
| [Inline diagnostics on `.sqlx` file](#diagnostics) ❗ | Native lsp like experience with diagnostics being directly put on both the sqlx file & compiled query |
| [Preview query results](#preview_query_results) | Preview query results in a table by running the file |
| [Go to definition](#definition) | Go to definition for source in `$ref{("MY_SOURCE")}`. Takes you to `MY_SOURCE.sqlx` or `sources.js` at the line where `MY_SOURCE` is defined |
| [Auto-completion](#autocomplete) | - declarations in `${ref("..")}` trigger when `$` character is typed <br><br> - Dependencies when `"` or `'` is typed inside the config block which has `dependencies` keyword is in the line prefix <br><br> - `tags` when `"` or `'` is typed inside the config block which has `tags` keyword is in the line prefix |
| [Code actions](#codeactions) | Apply dry run suggestions at the speed of thought |
| [Run file(s)/tag(s)](#filetagruns) | Run file(s)/tag(s), optionally with dependencies/dependents/full refresh using vscode command pallet / menu icons |
| [Format using Sqlfluff](#formatting) 🪄 | Fromat `.sqlx` files using [sqlfluff](https://github.com/sqlfluff/sqlfluff)|


## Requirements

1. [Dataform cli](https://cloud.google.com/dataform/docs/use-dataform-cli)

   `npm i -g @dataform/cli`

   Run `dataform compile` from the root of your Dataform project to ensure that you are able to use the cli

2. [Setup default application credentials for GCP](https://cloud.google.com/docs/authentication/provide-credentials-adc)


3. To enable formatting using [sqlfluff](https://github.com/sqlfluff/sqlfluff) install [sqlfluff](https://github.com/sqlfluff/sqlfluff)

   ```bash
   # install python and run
   pip install sqlfluff
   ```


4. To enable prettier diagnostics install [Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens) extension [ **optional** ]

> [!NOTE]
Trouble installing ? Please see [FAQ section](FAQ.md), if you are still stuck, please [raise an issue here](https://github.com/ashish10alex/vscode-dataform-tools/issues)

## Features

### <a id="compilation">Compilation & Dry run stats</a>
Compiled query in a vertical split
![compilation](media/images/compiled_query_preview.png)

### <a id="depgraph">Dependency graph</a>
![depgraph](/media/images/dependancy_tree.png)

### <a id="diagnostics">Inline diagnostics errors on `.sqlx` files ❗</a>
![diagnostics](media/images/diagnostics.png)

### <a id="preview_query_results">Preview query results</a>
![preview_query_results](/media/images/preview_query_results.png)


### <a id="autocomplete">Autocomplete model, tags, dependencies</a>

Auto completion support for `dependencies` when `"` or `'` is typed inside the config block which has `dependencies` keyword is in the line prefix

![auto-completion](media/images/dependencies_autocompletion.gif)

Declarations in `${ref("..")}` trigger when <kdb>$<kdb> character is typed
![auto-completion](media/images/sources_autocompletion.gif)

Auto completion support for `tags` when `"` or `'` is typed inside the config block which has `tags` keyword is in the line prefix

![auto-completion](media/images/tags_autocompletion.gif)


### <a id="definition">Go to definition</a>
Go to definition for source in `$ref{("MY_SOURCE")}`. Takes you to `MY_SOURCE.sqlx` or `sources.js` at the line where `MY_SOURCE` is defined

![go-to-definition](media/images/go_to_definition.gif)

### <a id="formatting">Formatting using sqlfluff</a>

![formatting](media/images/formatting.gif)



### <a id="filetagruns">Run file/tag with dependencies/dependents</a>

Open vscode command pallet by pressing <kbd>CTLR</kbd> + <kbd>SHIFT</kbd> + <kbd>p</kbd> or <kbd>CMD</kbd> + <kbd>SHIFT</kbd> + <kbd>p</kbd> on mac and run one of the required commands

| Commands                                               |
|------------------------------------------------------  |
| `Dataform: Run current file`                           |
| `Dataform: Run current file with dependencies`         |
| `Dataform: Run current file with dependents`           |
| `Dataform: Run current tag`                            |
| `Dataform: Run current tag with dependencies`          |
| `Dataform: Run current tag with dependents`            |
| `Dataform: Format current file`                        |
| `Dataform: Run file(s) / tag(s) with options`          |

## Known Issues

- [ ] Features such as go to definition / dependancy graph might not work with consistantly with `${ref("dataset", "table")}` or when it is multiline or a different format works best with `${ref('table_name')}` format

## TODO

- [ ] Bundle javascript files in the extension using [esbuild or webpack](https://code.visualstudio.com/api/working-with-extensions/bundling-extension)
- [ ] Handle case where user is not connected to internet or on vpn where network request for dry run cannot be made


