// Regenerates CALCULATIONS.md from the live data so the rate list can never drift.
// Run:  node scripts/gen-calculations.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const products = JSON.parse(readFileSync(join(root, "src/data/productMaster.json"), "utf8"));

const inr = (n) => "Rs " + Number(n).toLocaleString("en-IN");
const priceOf = (p) =>
  p.type === "Unit" ? `${inr(p.unit ?? 0)}` : `${inr(p.rate ?? 0)}/sqft`;

const rows = products
  .map((p) => `| ${p.product} | ${p.wc} | ${p.type} | ${priceOf(p)} | ${p.fq ? "✓" : ""} | ${p.rooms || ""} |`)
  .join("\n");

const fqCount = products.filter((p) => p.fq).length;
const stamp = new Date().toISOString().slice(0, 10);

const md = `# Hauspire Quotation — Logic, Calculations & Numbers

_Reference for the quotation app (\`Quotation hosted\`). All prices come from the ProductMaster; the math below is in \`src/lib/pricing.ts\`._

> **Section 5 is auto-generated from \`src/data/productMaster.json\` by \`scripts/gen-calculations.mjs\`.**
> Do not edit the price table by hand — run \`node scripts/gen-calculations.mjs\` after changing rates. Last generated: ${stamp}.

## 1. Pricing formula

\`\`\`
MO        = sum of MO-01 (modular) line amounts
NM        = sum of NM-01 (non-modular) line amounts
Fee       = (MO + NM) x 7%
Sub-Total = MO + NM + Fee
Discount  = MO x 15%            # modular only
TPV       = Sub-Total - Discount
\`\`\`
Constants: fee **7%**, modular discount **15%**, booking advance **Rs 25,000**, conversion **92,903.04 mm2/sqft** (1 ft = 304.8 mm).

## 2. Line sizing

- Area: \`Amount = round(W_mm x H_mm / 92903.04 x Rate/sqft)\`
- SqFt: \`Amount = round(area_sqft x Rate/sqft)\` (painting/electricals/false-ceiling by area)
- RFT: \`Amount = round(length_rft x Rate/rft)\`
- Unit: \`Amount = Unit price x qty\`
- Per-bedroom: \`Unit price x number_of_bedrooms\`; Per-bathroom: one line per bathroom.

Kitchen run: \`(kitchen_W_mm + kitchen_D_mm) - 900\`. Standard heights: base 750, wall/loft 600, wardrobe 2100, TV 2100, console 900, mandir 1800 (mm).

## 3. Payment stages (of TPV)

Booking Advance Rs 25,000 fixed; remainder (TPV - 25,000) split: Design First Draft 5%, Design Closure 10%, Material Procurement 40%, Material Dispatch 40%, Project Handover 5%.

## 4. BHK -> rooms

1BHK: Kitchen, Master, Living, Other. 2BHK: +Kids. 3BHK: +Guest. 4BHK: +Parents.

## 5. Full ProductMaster price list (${products.length})

_"1Q" marks products included in the auto-built first quotation (${fqCount} of ${products.length}). "Rooms" = first-quote placement categories._

| Product | Work Code | Type | Rate/Unit | 1Q | Rooms |
|---|---|---|---|---|---|
${rows}

## 6. Where the numbers come from

The rates in the table above are the **current-standard** rates held in \`src/data/productMaster.json\` — the single source of truth the app prices from. The 7% fee + 15% modular discount formula was reverse-engineered and verified to the rupee against recent first-quotes. This table is generated directly from that JSON, so it always matches the app; earlier hand-maintained versions of this list drifted and should not be trusted.
`;

writeFileSync(join(root, "CALCULATIONS.md"), md);
console.log(`CALCULATIONS.md regenerated from ${products.length} products (${fqCount} in first quote).`);
