import "./env";
import { loadContent } from "../content";

const { docs, codeLists, problems } = await loadContent();
const metrics = docs.filter((d) => d.type === "METRIC").length;
console.log(
  `${docs.length} concepts (${docs.length - metrics} terms, ${metrics} metrics), ${codeLists.length} code lists`,
);
for (const p of problems) console.error(`✗ ${p.file}${p.slug ? ` [${p.slug}]` : ""}: ${p.message}`);
if (problems.length) {
  console.error(`${problems.length} problem(s) found`);
  process.exit(1);
}
console.log("✓ Seed content is valid");
