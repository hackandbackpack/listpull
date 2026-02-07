

# Staff Deck View Enhancements

This plan adds three major features to help staff pull cards more efficiently:
1. **Group cards by color identity** (matching your store's organization)
2. **Sort by price within each color group** (highest to lowest)
3. **Export button** to generate a customer-ready message

---

## What You'll Get

### Color Identity Groups
Cards will be displayed in collapsible sections organized by Magic color identity:
- **White** (Plains symbol)
- **Blue** (Island symbol)
- **Black** (Swamp symbol)
- **Red** (Mountain symbol)
- **Green** (Forest symbol)
- **Multicolor** (cards with 2+ colors)
- **Colorless** (artifacts, lands with no color identity)

Each section header will show:
- Color name with icon
- Card count for that section
- Subtotal price (if priced)

### Price Sorting
Within each color section, cards are sorted from highest to lowest by:
- Manual price you entered (if set)
- API reference price (as fallback for sorting)

### Export Message Button
A new "Copy Customer Message" button will generate a plain-text message like:

```
Hi [Customer Name]!

Your order BOG-XXXXXXXX is ready for pickup at Blast Off Gaming.

WHAT WE FOUND (45 cards):
- 4x Lightning Bolt - $8.00
- 2x Counterspell - $3.50
...

COULDN'T FIND:
- Mox Diamond (out of stock)
- Black Lotus (requested 1, found 0)

ESTIMATED TOTAL: $127.50

See you soon!
```

Clicking the button copies this to your clipboard so you can paste it into Discord, text, or wherever you message customers.

---

## How It Works (Non-Magic Games)

- **Pokemon / Other Games**: Cards won't have color identity data, so they'll display in a single list (sorted by price if available)
- The export button works for all games

---

## Technical Details

### 1. Update Scryfall Types & Fetch Logic
**File:** `src/lib/scryfall.ts`

Add `color_identity` field to the `ScryfallCard` interface and ensure the collection API response includes it (it already does by default).

```typescript
export interface ScryfallCard {
  // ... existing fields
  color_identity: string[]; // Array of 'W', 'U', 'B', 'R', 'G'
}
```

### 2. Create Color Grouping Utility
**New File:** `src/lib/colorUtils.ts`

Utility functions to:
- Categorize cards by color identity (single color, multicolor, colorless)
- Define display order and icons for each color
- Sort cards by price within groups

### 3. Update DeckCardList Component
**File:** `src/components/staff/DeckCardList.tsx`

- Add logic to group `localItems` by color identity using the price map data
- Render collapsible `Accordion` sections for each color group
- Sort cards within each group by price (descending)
- Add "Copy Customer Message" button that generates and copies the export text
- For non-Magic games, render the flat list as before

### 4. Update EditableCardListItem Props
**File:** `src/components/staff/EditableCardListItem.tsx`

Pass through the color identity data from the card for display (optional enhancement: show color pip icons on each row).

---

## Dependencies

No new packages needed - uses existing:
- `@radix-ui/react-accordion` (already installed)
- Clipboard API (built into browsers)

