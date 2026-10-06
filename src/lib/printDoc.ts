"use client";
// Browsers use document.title as the default filename when "printing" to PDF.
// This sets a client-friendly name for the save dialog, then restores it.
export function printWithFilename(name: string) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const prev = document.title;
  const clean = (name || "Hauspire Quotation")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  document.title = clean;
  const restore = () => { document.title = prev; window.removeEventListener("afterprint", restore); };
  window.addEventListener("afterprint", restore);
  window.print();
  setTimeout(restore, 2000);
}

// ---- Quotation date ----
// Stored as a plain "YYYY-MM-DD" (India date), chosen on the builder pages.

/** Today in India as "YYYY-MM-DD" — the default quotation date. */
export function todayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** "YYYY-MM-DD" → Date at local midnight; anything invalid/missing → today. */
function toDate(iso?: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
}

/** As printed on the quotation, e.g. "06 Oct 2026". */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function quoteDateLabel(iso?: string): string {
  // Fixed format (browsers differ: some print "Sept").
  const d = toDate(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** e.g. "Ravi Sharma Hauspire Quotation 2300 08-09-2026" — uses the quotation date. */
export function quoteFilename(client: string, quoteNo: string, final = false, iso?: string): string {
  const c = (client || "Client").trim();
  const no = (quoteNo || "").trim();
  const d = toDate(iso);
  const date = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  return `${c} Hauspire ${final ? "Final " : ""}Quotation${no ? " " + no : ""} ${date}`;
}
