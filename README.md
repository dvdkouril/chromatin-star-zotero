# chromatin-star-zotero

Script for downloading data from a collection in a Zotero group. The goal is
simply to fetch the data, transform them into a workable format (JSON), and
host somewhere public.

CI is set up to produce the JSON file and upload to Cloudflare:
```
https://pub-58109824e51846eb99fe90884d66e2f9.r2.dev/papers.json
```

## dev
Install [deno](https://docs.deno.com/runtime/getting_started/installation/):
```
curl -fsSL https://deno.land/install.sh | sh
```

Then:
```
deno run -A fetch-zotero.ts
```
