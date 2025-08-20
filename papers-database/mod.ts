import { Cite } from "npm:@citation-js/core";
import "npm:@citation-js/plugin-bibtex";
import "npm:@citation-js/plugin-csl";

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
const cite = new Cite(bibtex);

// Output in plain-text APA style
console.log(cite.format("bibliography", {
  format: "text",
  template: "apa",
  lang: "en",
}));
