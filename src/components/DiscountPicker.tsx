"use client";
// Optional extra discount (On-Spot / Festive / …) chosen from the left panel.
// It only appears on the quotation when an amount is entered. The modular
// discount is separate and always applies.
const PRESETS = ["On-Spot Discount", "Festive Discount", "Referral Discount", "Loyalty Discount", "Negotiated Discount"];

export default function DiscountPicker({
  label, amount, onLabel, onAmount,
}: { label: string; amount: number; onLabel: (v: string) => void; onAmount: (v: number) => void }) {
  const isPreset = PRESETS.includes(label);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select
          className="input" value={isPreset ? label : "__custom"}
          onChange={(e) => { const v = e.target.value; onLabel(v === "__custom" ? "" : v); }}
        >
          {PRESETS.map((p) => <option key={p}>{p}</option>)}
          <option value="__custom">Custom…</option>
        </select>
        <input className="input" type="number" placeholder="Amount ₹" value={amount || ""} onChange={(e) => onAmount(Number(e.target.value) || 0)} />
      </div>
      {!isPreset && (
        <input className="input" placeholder="Discount name (e.g. Diwali Offer)" value={label} onChange={(e) => onLabel(e.target.value)} />
      )}
      <p className="text-[10.5px] text-neutral-400">Applies only when an amount is set; shown on the quotation with this name. Modular discount is separate.</p>
    </div>
  );
}
