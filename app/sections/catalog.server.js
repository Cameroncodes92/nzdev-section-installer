import fs from "node:fs";
import path from "node:path";

export const SECTION_CATALOG = [
  {
    handle: "p5-trust-builder-bar",
    title: "Highlights Bar",
    description:
      "A clean highlights/trust bar (icons + text) to boost confidence near add-to-cart.",
    priceUsd: 9.99,
    billingPlan: "TRUST_BAR_999",
    themeFilename: "sections/p5-trust-builder-bar.liquid",
  },
];

export function getSectionByHandle(handle) {
  return SECTION_CATALOG.find((s) => s.handle === handle) || null;
}

export function readSectionLiquid(handle) {
  const section = getSectionByHandle(handle);
  if (!section) throw new Error(`Unknown section handle: ${handle}`);

  const repoRoot = process.cwd();
  const filePath = path.join(repoRoot, "SECTION_LIBRARY", `${section.handle}.liquid`);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Missing section source file at ${filePath}. Add it to SECTION_LIBRARY before installing.`,
    );
  }
  return fs.readFileSync(filePath, "utf8");
}
