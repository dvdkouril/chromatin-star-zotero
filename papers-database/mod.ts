import { Cite } from "npm:@citation-js/core";
import "npm:@citation-js/plugin-bibtex";
import "npm:@citation-js/plugin-csl";

const inputFile1 = "./input/3d-chromatin/1-1000.bib";

//~ load the file content as string:
const bibFile1 = await Deno.readTextFile(inputFile1);

// Your BibTeX string
const bibtex = `
@article{einstein1905,
  author = {Einstein, Albert},
  title = {Zur Elektrodynamik bewegter Körper},
  journal = {Annalen der Physik},
  volume = {322},
  number = {10},
  pages = {891--921},
  year = {1905},
  publisher = {Wiley Online Library}
}
`;

// Parse with Citation.js
// const cite = new Cite(bibtex);
const cite = new Cite(bibFile1);

for (const entry of cite.data) {
  console.log(entry.DOI);
}

// // Output in plain-text APA style
// console.log(cite.format("bibliography", {
//   format: "text",
//   template: "apa",
//   lang: "en",
// }));
