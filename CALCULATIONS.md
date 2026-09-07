# Hauspire Quotation — Logic, Calculations & Numbers

_Reference for the quotation app (`Quotation hosted`). All prices come from the ProductMaster; the math below is in `src/lib/pricing.ts`._

> **Section 5 is auto-generated from `src/data/productMaster.json` by `scripts/gen-calculations.mjs`.**
> Do not edit the price table by hand — run `node scripts/gen-calculations.mjs` after changing rates. Last generated: 2026-09-07.

## 1. Pricing formula

```
MO        = sum of MO-01 (modular) line amounts
NM        = sum of NM-01 (non-modular) line amounts
Fee       = (MO + NM) x 7%
Sub-Total = MO + NM + Fee
Discount  = MO x 15%            # modular only
TPV       = Sub-Total - Discount
```
Constants: fee **7%**, modular discount **15%**, booking advance **Rs 25,000**, conversion **92,903.04 mm2/sqft** (1 ft = 304.8 mm).

## 2. Line sizing

- Area: `Amount = round(W_mm x H_mm / 92903.04 x Rate/sqft)`
- SqFt: `Amount = round(area_sqft x Rate/sqft)` (painting/electricals/false-ceiling by area)
- RFT: `Amount = round(length_rft x Rate/rft)`
- Unit: `Amount = Unit price x qty`
- Per-bedroom: `Unit price x number_of_bedrooms`; Per-bathroom: one line per bathroom.

Kitchen run: `(kitchen_W_mm + kitchen_D_mm) - 900`. Standard heights: base 750, wall/loft 600, wardrobe 2100, TV 2100, console 900, mandir 1800 (mm).

## 3. Payment stages (of TPV)

Booking Advance Rs 25,000 fixed; remainder (TPV - 25,000) split: Design First Draft 5%, Design Closure 10%, Material Procurement 40%, Material Dispatch 40%, Project Handover 5%.

## 4. BHK -> rooms

1BHK: Kitchen, Master, Living, Other. 2BHK: +Kids. 3BHK: +Guest. 4BHK: +Parents.

## 5. Full ProductMaster price list (52)

_"1Q" marks products included in the auto-built first quotation (27 of 52). "Rooms" = first-quote placement categories._

| Product | Work Code | Type | Rate/Unit | 1Q | Rooms |
|---|---|---|---|---|---|
| Base Cabinets | MO-01 | Area | Rs 2,580/sqft | ✓ | Kitchen |
| Base Cabinets- Tandems (Horizantal) | NM-01 | Unit | Rs 10,000 | ✓ | Kitchen |
| Base Cabinets-Tandems (Vertical) | NM-01 | Unit | Rs 12,000 | ✓ | Kitchen |
| Wall Cabinets | MO-01 | Area | Rs 2,580/sqft | ✓ | Kitchen |
| Wall Cabinets- Glass Profile Shutters | NM-01 | Unit | Rs 8,000 | ✓ | Kitchen |
| Loft (Frame with Shutter) | MO-01 | Area | Rs 2,000/sqft | ✓ | Kitchen,Bedroom,Study |
| Tall Pantry Unit | MO-01 | Area | Rs 2,580/sqft |  | Kitchen |
| Tall Pantry Carcass | MO-01 | Area | Rs 2,000/sqft |  | Kitchen |
| Tall Pantry Glass Profile Shutter | NM-01 | Area | Rs 850/sqft |  | Kitchen |
| Crockery Unit | MO-01 | Area | Rs 2,580/sqft |  | Kitchen,Living |
| Crockery Unit Glass Profile Shutter | NM-01 | Area | Rs 850/sqft |  | Kitchen |
| Appliance Unit | MO-01 | Unit | Rs 16,000 |  | Kitchen |
| Appliance Unit Glass Profile Shutter | NM-01 | Area | Rs 850/sqft |  | Kitchen |
| Appliance Unit Rolling Shutter | NM-01 | Unit | Rs 15,000 |  | Kitchen |
| Breakfast Counter | NM-01 | Unit | Rs 25,000 |  | Kitchen |
| Platform Creation | NM-01 | Unit | Rs 50,000 |  | Kitchen,Other |
| Premium Shutter wardrobe | MO-01 | Area | Rs 2,580/sqft | ✓ | Bedroom,Study |
| Walk In- Premium Shutter wardrobe | MO-01 | Area | Rs 2,580/sqft |  | Bedroom |
| Dressing Unit- Base Storage | MO-01 | Unit | Rs 7,500 | ✓ | Bedroom |
| Dressing Unit- Mirror | NM-01 | Unit | Rs 8,000 | ✓ | Bedroom |
| King size Bed Hydraulic Storage | MO-01 | Unit | Rs 64,000 |  | Bedroom |
| Queen size Bed Hydraulic Storage | MO-01 | Unit | Rs 54,000 | ✓ | Bedroom |
| King Size - Headboard | NM-01 | Unit | Rs 14,000 |  | Bedroom |
| Queen Size - Headboard | NM-01 | Unit | Rs 12,000 | ✓ | Bedroom |
| Side Table | MO-01 | Unit | Rs 7,500 |  | Bedroom |
| Workstation | MO-01 | Area | Rs 2,000/sqft | ✓ | Bedroom,Study |
| Workstation- Overhead | MO-01 | Area | Rs 2,580/sqft | ✓ | Study |
| Bay Window | NM-01 | Unit | Rs 40,000 |  | Bedroom,Living |
| TV Unit | NM-01 | Area | Rs 1,200/sqft | ✓ | Living |
| TV Unit- Base storage | MO-01 | Area | Rs 2,580/sqft |  | Living,Bedroom |
| Foyer Unit | MO-01 | Area | Rs 2,580/sqft |  | Living |
| Console Unit/Shoe Rack | MO-01 | Area | Rs 1,910/sqft | ✓ | Living |
| Mandir | NM-01 | Area | Rs 2,400/sqft | ✓ | Living |
| Safety Door | NM-01 | Unit | Rs 42,000 | ✓ | Living |
| Vanity Unit | MO-01 | Area | Rs 2,580/sqft | ✓ | Other |
| Dry Balcony- Base Storage (Frame with Shutter) | MO-01 | Area | Rs 2,000/sqft | ✓ | Kitchen |
| Dry Balcony- Overhead Storage | MO-01 | Area | Rs 2,580/sqft | ✓ | Kitchen |
| False Ceiling (per room) | NM-01 | Area | Rs 2,000/sqft |  | Other |
| Minimal False Ceiling (per room) | NM-01 | Unit | Rs 20,000 |  | Other |
| Painting - 1BHK (Emulsion) | NM-01 | Unit | Rs 35,000 | ✓ | Other |
| Painting - 2BHK (Emulsion) | NM-01 | Unit | Rs 45,000 | ✓ | Other |
| Painting - 3BHK (Emulsion) | NM-01 | Unit | Rs 55,000 | ✓ | Other |
| Painting - 4BHK (Emulsion) | NM-01 | Unit | Rs 65,000 | ✓ | Other |
| Painting - 1BHK (Lustre) | NM-01 | Unit | Rs 45,000 |  | Other |
| Painting - 2BHK (Lustre) | NM-01 | Unit | Rs 55,000 |  | Other |
| Painting - 3BHK (Lustre) | NM-01 | Unit | Rs 65,000 |  | Other |
| Painting - 4BHK (Lustre) | NM-01 | Unit | Rs 85,000 |  | Other |
| Electricals (2BHK) | NM-01 | Unit | Rs 30,000 | ✓ | Other |
| Electricals (3BHK) | NM-01 | Unit | Rs 40,000 | ✓ | Other |
| Electricals (4BHK) | NM-01 | Unit | Rs 50,000 | ✓ | Other |
| Windows Change | NM-01 | Unit | Rs 30,000 |  | Other |
| Civil and Plumbing Changes | NM-01 | Unit | Rs 1,00,000 |  | Other |

## 6. Where the numbers come from

The rates in the table above are the **current-standard** rates held in `src/data/productMaster.json` — the single source of truth the app prices from. The 7% fee + 15% modular discount formula was reverse-engineered and verified to the rupee against recent first-quotes. This table is generated directly from that JSON, so it always matches the app; earlier hand-maintained versions of this list drifted and should not be trusted.
