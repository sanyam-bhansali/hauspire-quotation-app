// Renders the editable Terms text as branded, structured content.
// Parsing: a line ending with ":" is a section heading; a line starting with "-"
// is a bullet; any other non-empty line is sub-text under the previous bullet.
export default function TermsView({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");

  return (
    <div className="text-[11px] leading-snug text-neutral-800">
      {lines.map((raw, i) => {
        const line = raw.trim();
        if (!line) return <div key={i} className="h-2" />;
        if (line.endsWith(":")) {
          return (
            <div key={i} className="mt-3 mb-1 text-[12.5px] font-bold text-brand">
              {line.replace(/\s*:$/, "")}
            </div>
          );
        }
        if (line.startsWith("-")) {
          return (
            <div key={i} className="mb-1 flex gap-1.5">
              <span className="text-brand-light">•</span>
              <span>{line.replace(/^-\s*/, "")}</span>
            </div>
          );
        }
        // Continuation / sub-text under the previous bullet.
        return (
          <div key={i} className="mb-1 pl-4 text-neutral-600">
            {line}
          </div>
        );
      })}
    </div>
  );
}
