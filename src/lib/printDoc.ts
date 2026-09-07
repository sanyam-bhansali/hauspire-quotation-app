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

/** e.g. "Ravi Sharma Hauspire Quotation 2300" */
export function quoteFilename(client: string, quoteNo: string, final = false): string {
  const c = (client || "Client").trim();
  const no = (quoteNo || "").trim();
  return `${c} Hauspire ${final ? "Final " : ""}Quotation${no ? " " + no : ""}`;
}
