// Print-friendly SVG donut for "Summary By Room" (no external chart lib).
const COLORS = ["#7a1c2b", "#9c2a34", "#b8433c", "#cf5b3f", "#e07a4e", "#eb9a68", "#f0b787", "#caa06f", "#8f5b3a"];

export default function RoomDonut({ data }: { data: { label: string; value: number }[] }) {
  const items = data.filter((d) => d.value > 0);
  const total = items.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 70, cy = 70, r = 52, sw = 22, C = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" width="150" height="150" className="shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#efe7e0" strokeWidth={sw} />
        {items.map((d, i) => {
          const len = (d.value / total) * C;
          const seg = (
            <circle
              key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={COLORS[i % COLORS.length]} strokeWidth={sw}
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          acc += len;
          return seg;
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" className="fill-brand" style={{ fontSize: 9, fontWeight: 700 }}>TOTAL</text>
        <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: "#2b2118" }}>
          ₹{Math.round(total).toLocaleString("en-IN")}
        </text>
      </svg>
      <div className="grid grid-cols-1 gap-0.5 text-[10px]">
        {items.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span style={{ background: COLORS[i % COLORS.length] }} className="inline-block h-2.5 w-2.5 rounded-sm" />
            <span className="text-neutral-800">{d.label}</span>
            <span className="text-neutral-400">— ₹{Math.round(d.value).toLocaleString("en-IN")} ({Math.round((d.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
