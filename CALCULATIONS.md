# Hauspire Quotation — Logic, Calculations & Numbers

_Reference for the quotation app (`Quotation hosted`). All prices come from the enriched ProductMaster; the math below is in `src/lib/pricing.ts`._

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
- Unit: `Amount = Unit price (x qty)`
- Per-bedroom: `Unit price x number_of_bedrooms`

Kitchen run: `(kitchen_W_mm + kitchen_D_mm) - 900`. Standard heights: base 750, wall/loft 600, wardrobe 2100, TV 2100, console 900, mandir 1800 (mm).

## 3. Payment stages (of TPV)

Booking Advance Rs 25,000 fixed; remainder (TPV - 25,000) split: Design First Draft 5%, Design Closure 10%, Material Procurement 40%, Material Dispatch 40%, Project Handover 5%.

## 4. BHK -> rooms

1BHK: Kitchen, Master, Living, Other. 2BHK: +Kids. 3BHK: +Guest. 4BHK: +Parents.

## 5. Full ProductMaster price list (53)

| Product | Work Code | Type | Rate/Unit |
|---|---|---|---|
| Base Cabinets- Tandems | NM-01 | Unit | Rs 16000 |
| Wall Cabinets | MO-01 | Area | Rs 2065/sqft |
| Base Cabinets | MO-01 | Area | Rs 2035/sqft |
| Wall Cabinets- Glass Profile Shutters | NM-01 | Unit | Rs 8000 |
| Dry Balcony- Base Storage | MO-01 | Area | Rs 1855/sqft |
| Dry Balcony- Overhead Storage | MO-01 | Area | Rs 2035/sqft |
| Tall Unit | MO-01 | Area | Rs 2065/sqft |
| Tall Pantry Unit | MO-01 | Area | Rs 2065/sqft |
| Appliance Unit | MO-01 | Unit | Rs 22000 |
| Breakfast Counter | NM-01 | Unit | Rs 20000 |
| Platform Creation | NM-01 | Unit | Rs 18500 |
| Granite Change | NM-01 | Unit | Rs 35000 |
| Civil & Plumbing Changes | NM-01 | Unit | Rs 30000 |
| Storage Unit | MO-01 | Area | Rs 2580/sqft |
| Loft (Frame with Shutter) | MO-01 | Area | Rs 1910/sqft |
| Premium Shutter Wardrobe | MO-01 | Area | Rs 2065/sqft |
| Headboard | NM-01 | Unit | Rs 12000 |
| Queen size Bed- Hydraulic Storage | MO-01 | Unit | Rs 54000 |
| Dressing Unit- Mirror | NM-01 | Unit | Rs 5000 |
| Workstation | MO-01 | Unit | Rs 12000 |
| Dressing Unit- Base Storage | MO-01 | Unit | Rs 7500 |
| Workstation- Overhead | MO-01 | Unit | Rs 12500 |
| King size Bed- Hydraulic Storage | MO-01 | Unit | Rs 64000 |
| Dressing Unit- Back Storage | MO-01 | Area | Rs 1240/sqft |
| Side Table | MO-01 | Unit | Rs 7500 |
| Bed | NM-01 | Unit | Rs 15000 |
| Window Seatout | NM-01 | Unit | Rs 20000 |
| Single Bed | MO-01 | Unit | Rs 40000 |
| Study Unit | MO-01 | Area | Rs 1650/sqft |
| Sofa Cum Bed | NM-01 | Unit | Rs 55000 |
| Walk-In Premium Shutter Wardrobe | MO-01 | Area | Rs 2580/sqft |
| Bay Window | NM-01 | Unit | Rs 24000 |
| Murphy Bed | NM-01 | Unit | Rs 60000 |
| Sliding Wardrobe | MO-01 | Area | Rs 2260/sqft |
| Day Bed | NM-01 | Unit | Rs 52500 |
| Sliding Mechanism | NM-01 | Unit | Rs 12000 |
| TV Unit | NM-01 | Area | Rs 1265/sqft |
| Mandir | NM-01 | Area | Rs 1890/sqft |
| Console Unit/Shoe Rack | MO-01 | Area | Rs 1910/sqft |
| Safety Door | NM-01 | Unit | Rs 39000 |
| Foyer Unit | MO-01 | Area | Rs 1910/sqft |
| Sofa Back Wall Décor | NM-01 | Unit | Rs 15000 |
| Crockery Unit | MO-01 | Unit | Rs 36500 |
| Partition | NM-01 | Unit | Rs 20000 |
| Entrance Décor | NM-01 | Unit | Rs 20000 |
| Foldable Dining | NM-01 | Unit | Rs 17000 |
| Foyer Décor | NM-01 | Unit | Rs 15000 |
| Bookshelf | MO-01 | Area | Rs 2065/sqft |
| False Ceiling (per room) | NM-01 | Unit | Rs 34500 |
| Vanity Unit | MO-01 | Unit | Rs 20000 |
| Minimal False Ceiling (per room) | NM-01 | Unit | Rs 27000 |
| Painting | NM-01 | Unit | Rs 55000 |
| Electricals | NM-01 | Unit | Rs 50000 |

## 6. Where the numbers come from

Rates are archive medians from 25,581 line items across 940 past quotations (the enriched ProductMaster). The 7% fee + 15% modular discount formula was reverse-engineered and verified to the rupee against 4 recent first-quotes (Rahul, Sumit, Akanksha, Yashkumar). Note: these archive-median rates run ~15-20% below the current-standard rates seen in the newest quotes.
