import { Cite } from "npm:@citation-js/core";
import "npm:@citation-js/plugin-bibtex";
import "npm:@citation-js/plugin-csl";
import { z } from "npm:zod@3.23.8";

/** An optional string that is transformed to undefined if it is an empty string. */
let maybeStringSchema = z
  .string()
  .transform((v) => v === "" ? undefined : v)
  .optional();

let zoteroItemSchema = z.object({
  data: z.object({
    key: z.string(),
    version: z.number(),
    itemType: z.string(),
    title: z.string(),
    creators: z.union([
      z.object({
        creatorType: z.enum(["author", "editor"]),
        name: z.string(),
      }),
      z.object({
        creatorType: z.enum(["author", "editor", "programmer"]),
        firstName: z.string(),
        lastName: z.string(),
      }),
    ]).array(),
    abstractNote: z.string().transform((value) =>
      value.replace(/^Abstract\s+/, "") // remove "Abstract" prefix
    ),
    institution: maybeStringSchema,
    bookTitle: maybeStringSchema,
    proceedingsTitle: maybeStringSchema,
    conferenceName: maybeStringSchema,
    publicationTitle: maybeStringSchema,
    volume: maybeStringSchema,
    issue: maybeStringSchema,
    pages: maybeStringSchema,
    series: maybeStringSchema,
    seriesTitle: maybeStringSchema,
    seriesText: maybeStringSchema,
    journalAbbreviation: maybeStringSchema,
    DOI: maybeStringSchema,
    ISSN: maybeStringSchema,
    shortTitle: maybeStringSchema,
    url: maybeStringSchema,
    tags: z.array(z.object({ tag: z.string() })).transform((tags) =>
      tags.map((tag) => tag.tag)
    ),
  }),
  //csljson: z.object({
  //  issued: z.object({
  //    "date-parts": z.array(z.array(z.union([z.number(), z.string()]))),
  //  }).optional().refine((value) => value && value["date-parts"].length === 1, {
  //    message: "Too many dates or no date",
  //  }).transform((value) => {
  //    if (!value) {
  //      return undefined;
  //    } else {
  //      let parts = value["date-parts"][0].map(Number);
  //      return { year: parts[0], month: parts[1], day: parts[2] };
  //    }
  //  }),
  //}),
});
export type ZoteroItem = z.infer<typeof zoteroItemSchema>;
/**
 * Fetches all items in a Zotero collection. (from:
 * https://github.com/hms-dbmi/gehlenborglab-website/blob/main/scripts/fetch-hidive-zotero-items.ts#L296)
 *
 * Uses the Zotero API to fetch all items in a collection. The API is paginated
 * so this function will make multiple requests to fetch all items.
 *
 * @param collectionId The ID of the collection to fetch items from.
 */
async function fetchZoteroCollection(
  groupId: string,
  collectionId: string | undefined = undefined,
): Promise<ZoteroItem[]> {
  let baseUrl = new URL(`https://api.zotero.org/groups/${groupId}/`);
  let itemsPerPage = 100;
  let items: ZoteroItem[] = [];
  let start = 0;

  const itemTypesWeHave = [
    "book",
    "bookSection",
    "conferencePaper",
    "document",
    "journalArticle",
    "preprint",
    "computerProgram",
    "thesis",
    "webpage",
  ];

  const itemTypeString = itemTypesWeHave.join(" || ");

  while (true) {
    let url = collectionId
      ? new URL(`collections/${collectionId}/items`, baseUrl)
      : new URL(`items`, baseUrl);
    url.searchParams.set("format", "json");
    url.searchParams.set("include", "csljson,data");
    url.searchParams.set("itemType", itemTypeString);
    url.searchParams.set("limit", itemsPerPage.toString());
    url.searchParams.set("start", start.toString());

    console.log(`url: ${url}`);
    let response = await fetch(url);
    console.log(response.status, response.statusText);
    let json = await response.json();
    console.log(`start: ${start}`);
    console.log("---");

    let newItems = zoteroItemSchema.array().parse(
      // deno-lint-ignore no-explicit-any
      json.filter((item: any) => item.data.itemType !== "note"),
    );

    items.push(...newItems);
    if (json.length < itemsPerPage) {
      break; // We've reached the end of the collection
    }
    start += itemsPerPage;
  }

  return items;
}

type ProcessedItem = {
  doi: string | undefined;
  title: string;
  relevant: "yes" | "no" | "maybe";
  tags: string[];
};

function processPapersAndTags(
  fetchedItems: ZoteroItem[],
): ProcessedItem[] {
  const items: ProcessedItem[] = [];
  for (let paper of fetchedItems) {
    // const paperTags: string[] = [];
    const doi = paper.data.DOI;
    const title = paper.data.title;
    const relevant = paper.data.tags.includes("Relevant") ? "yes" : "no";
    items.push({
      doi,
      title,
      relevant,
      tags: [],
    });
  }
  return items;
}

function arrayToCsv(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";

  // Use keys of the first object as headers
  const headers = Object.keys(data[0]);
  const headerLine = headers.join(",");

  // For each row, map fields in the same order as headers
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
  );

  return [headerLine, ...rows].join("\n");
}

/**
 * This function starts the database by fetching the Zotero collection used in
 * writing the VIS 2025 paper. It fetches the papers and marks whether they are
 * relevant or not.
 */
async function initiateDatabaseFromVISSurvey() {
  // const COLLECTION_ID = "";
  const GROUP_ID = "5769710";
  let pubs = await fetchZoteroCollection(GROUP_ID);
  console.log(`Found ${pubs.length} items in Zotero collection.`);
  console.log("first one");
  console.log(pubs[0]);
  let processed = processPapersAndTags(pubs);

  const csv = arrayToCsv(processed);
  await Deno.writeTextFile("./3d-chromatin.csv", csv);
}

async function test() {
  const inputFile1 = "./input/3d-chromatin/1-1000.bib";

  //~ load the file content as string:
  const bibFile1 = await Deno.readTextFile(inputFile1);

  // Parse with Citation.js
  const cite = new Cite(bibFile1);

  for (const entry of cite.data) {
    console.log(`${entry.DOI} (${entry.title}))`);
  }
}

function main() {
  initiateDatabaseFromVISSurvey();
}

if (import.meta.main) {
  main();
}
