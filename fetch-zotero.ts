import { z } from "npm:zod@3.23.8";

let CHROMOSTAR_GROUP_ID = "5014170" as const;
let MANUAL_SEARCH_COLLECTION_ID = "V47TH9U4" as const;

export type ZoteroItem = z.infer<typeof zoteroItemSchema>;
type Author = ZoteroItem["creators"][number];

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
        creatorType: z.enum(["author", "editor"]),
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
  csljson: z.object({
    issued: z.object({
      "date-parts": z.array(z.array(z.union([z.number(), z.string()]))),
    }).refine((value) => value["date-parts"].length === 1, {
      message: "Too many dates",
    }).transform((value) => {
      let parts = value["date-parts"][0].map(Number);
      return { year: parts[0], month: parts[1], day: parts[2] };
    }),
  }),
}).transform(({ data, csljson }) => ({ ...data, date: csljson.issued }));
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
  collectionId: string,
  groupId: string = CHROMOSTAR_GROUP_ID,
): Promise<ZoteroItem[]> {
  let baseUrl = new URL(`https://api.zotero.org/groups/${groupId}/`);
  let itemsPerPage = 100;
  let items: ZoteroItem[] = [];
  let start = 0;

  while (true) {
    let url = new URL(`collections/${collectionId}/items`, baseUrl);
    url.searchParams.set("format", "json");
    url.searchParams.set("include", "csljson,data");
    url.searchParams.set("itemType", "-attachment");
    url.searchParams.set("limit", itemsPerPage.toString());
    url.searchParams.set("start", start.toString());

    let response = await fetch(url);
    let json = await response.json();

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

async function main() {
  let pubs = await fetchZoteroCollection(MANUAL_SEARCH_COLLECTION_ID);
  console.log(JSON.stringify(pubs, null, 2));
}

if (import.meta.main) {
  main();
}
