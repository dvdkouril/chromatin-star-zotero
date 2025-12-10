# chromatin-star-zotero

Script for downloading data from a collection in a Zotero group. The goal is
simply to fetch the data, transform them into a workable format (JSON), and
host somewhere public.

Install [deno](https://docs.deno.com/runtime/getting_started/installation/) (if
not yet installed):
```
curl -fsSL https://deno.land/install.sh | sh
```

Then:
```
deno run -A fetch-zotero.ts
```

TODO:
- [ ] set up a GA workflow for running the script (so that others can update
the `papers.json` file)
