import { z } from "npm:zod@3.23.8";

/*
 * Basically copied from:
 * https://github.com/hms-dbmi/gehlenborglab-website/blob/main/scripts/fetch-hidive-zotero-items.ts
 */

let CHROMOSTAR_GROUP_ID = "5014170" as const;
let MANUAL_SEARCH_COLLECTION_ID = "V47TH9U4" as const;

export type ZoteroItem = z.infer<typeof zoteroItemSchema>;
//type Author = ZoteroItem["creators"][number];

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
//}).transform(({ data, csljson }) => ({ ...data, date: csljson.issued }));
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

  /* We have in the library:
	 * Book: "book"
	 * Book Section: "bookSection"
	 * Conference Paper: "conferencePaper"
	 * Document: "document"
	 * Journal Article: "journalArticle"
	 * Preprint: "preprint"
	 * Software: "computerProgram"
	 * Thesis: "thesis"
	 * Web Page: "webpage"
	*/
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
    let url = new URL(`collections/${collectionId}/items`, baseUrl);
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
    //console.log(JSON.stringify(json, null, 2));
    //for (let item of json) {
    //  //if (!item.csljson) {
    //  //  console.log("csljson undefined");
    //  //}
    //  //console.log(item.csljson);
    //  if (!item.csljson.issued) {
    //    console.log(`Title: ${item.csljson.title}`);
    //    //console.log(item);
    //    console.log(`itemType = ${item.data.itemType}`);
    //    //item.data.itemType === "note"
    //  }
    //}
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
  zoteroItem: ZoteroItem;
  assignedTo: string;
  relevant: "yes" | "no" | "maybe";
  tags: string[];
};

function processPapersAndTags(
  fetchedItems: ZoteroItem[],
): ProcessedItem[] {
  const items: ProcessedItem[] = [];
  for (let paper of fetchedItems) {
    const paperTags: string[] = [];
    let processedItem: ProcessedItem = {
      zoteroItem: paper,
      assignedTo: "Bára",
      relevant: "maybe",
      tags: paperTags,
    };
    for (let tag of paper.data.tags) {
      if (
        tag === "RELEVANT" || tag === "MAYBE RELEVANT" || tag === "NOT RELEVANT"
      ) {
        processedItem = {
          ...processedItem,
          relevant: tag === "RELEVANT"
            ? "yes"
            : tag === "MAYBE RELEVANT"
            ? "maybe"
            : "no",
        };
      } else if (
        tag === "Bára" ||
        tag === "Katka" ||
        tag === "Jan" ||
        tag === "Roxana" ||
        tag === "David" ||
        tag === "Adam"
      ) {
        processedItem = {
          ...processedItem,
          assignedTo: tag,
        };
      } else {
        paperTags.push(tag);
      }
    }
    processedItem = {
      ...processedItem,
      tags: paperTags,
    };
    items.push(processedItem);
  }
  return items;
}

function printTagsDistribution(items: ProcessedItem[]): Map<string, number> {
  const tagCounts = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  // Sort tags by count in descending order
  const sortedTags = Array.from(tagCounts.entries()).sort((a, b) =>
    b[1] - a[1]
  );

  console.log("Tags distribution:");
  for (const [tag, count] of sortedTags) {
    console.log(`${tag}: ${count}`);
  }

  return tagCounts;
}

async function writeJson(items: ProcessedItem[]) {
  const simpleItems = items.map((item) => ({
    title: item.zoteroItem.data.title,
    authors: item.zoteroItem.data.creators.map((creator) =>
      creator.name ?? `${creator.firstName} ${creator.lastName}`
    ),
    year: item.zoteroItem.data.date,
    tags: item.tags,
    assignedTo: item.assignedTo,
    relevant: item.relevant,
  }));

  await Deno.writeTextFile("papers.json", JSON.stringify(simpleItems, null, 2));
}

async function main() {
  let pubs = await fetchZoteroCollection(MANUAL_SEARCH_COLLECTION_ID);
  for (let pub of pubs) {
    console.log(`Title: ${pub.data.title}`);
    console.log(pub.data.tags);
  }

  let items = processPapersAndTags(pubs);

  printTagsDistribution(items);
  await writeJson(items);
}

if (import.meta.main) {
  main();
}
