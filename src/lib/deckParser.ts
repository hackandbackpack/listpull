export interface ParsedCard {
  quantity: number;
  cardName: string;
  lineRaw: string;
  parseConfidence: number;
  error?: string;
}

export interface ParseResult {
  cards: ParsedCard[];
  errors: string[];
  hasErrors: boolean;
}

// Common patterns for decklist formats (ordered from most specific to least specific)
// Set codes and collector numbers are STRIPPED - only card name is kept for Scryfall compatibility
const PATTERNS = [
  // With set code and collector number + optional suffix: "1 Battle Hymn (AVR) 128" or "1 Rise of the Dark Realms (PFDN) 183s F"
  // Captures just the card name before the set code
  /^(?:SB:|Sideboard:?\s*)?(\d+)\s*[xX]?\s+(.+?)\s*\([A-Za-z0-9]+\)\s*\d+[a-zA-Z]*(?:\s+[A-Z])?.*$/i,
  // With set code only (no collector number): "4 Lightning Bolt (2XM)"
  /^(?:SB:|Sideboard:?\s*)?(\d+)\s*[xX]?\s+(.+?)\s*\([A-Za-z0-9]+\)\s*$/i,
  // With brackets set code and collector number: "4 Lightning Bolt [2XM] 117"
  /^(?:SB:|Sideboard:?\s*)?(\d+)\s*[xX]?\s+(.+?)\s*\[[A-Za-z0-9]+\]\s*\d+.*$/i,
  // With brackets set code only: "4 Lightning Bolt [2XM]"
  /^(?:SB:|Sideboard:?\s*)?(\d+)\s*[xX]?\s+(.+?)\s*\[[A-Za-z0-9]+\]\s*$/i,
  // Standard format: "4 Lightning Bolt" or "4x Lightning Bolt" (fallback - must be last)
  /^(?:SB:|Sideboard:?\s*)?(\d+)\s*[xX]?\s+(.+)$/i,
];

// Lines to ignore
const IGNORE_PATTERNS = [
  /^\/\//,           // Comments
  /^#/,              // Comments
  /^Deck$/i,         // Section headers
  /^Sideboard$/i,
  /^Mainboard$/i,
  /^Main$/i,
  /^Commander$/i,
  /^Companion$/i,
  /^\s*$/,           // Empty lines
];

export function parseDecklistLine(line: string): ParsedCard | null {
  const trimmedLine = line.trim();
  
  // Check if line should be ignored
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(trimmedLine)) {
      return null;
    }
  }

  // Try each pattern
  for (const pattern of PATTERNS) {
    const match = trimmedLine.match(pattern);
    if (match) {
      const quantity = parseInt(match[1], 10);
      const cardName = match[2].trim();
      
      if (quantity > 0 && quantity <= 99 && cardName.length > 0) {
        return {
          quantity,
          cardName,
          lineRaw: line,
          parseConfidence: 1.0,
        };
      }
    }
  }

  // If no pattern matched but line has content, try to salvage it
  if (trimmedLine.length > 0) {
    // Check if it's just a card name without quantity (assume 1)
    if (/^[A-Za-z]/.test(trimmedLine) && !trimmedLine.includes(':')) {
      return {
        quantity: 1,
        cardName: trimmedLine,
        lineRaw: line,
        parseConfidence: 0.5,
        error: 'No quantity found, assuming 1',
      };
    }

    // Return as error
    return {
      quantity: 0,
      cardName: trimmedLine,
      lineRaw: line,
      parseConfidence: 0,
      error: 'Could not parse this line',
    };
  }

  return null;
}

export function parseDecklist(rawText: string): ParseResult {
  const lines = rawText.split('\n');
  const cards: ParsedCard[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    const parsed = parseDecklistLine(line);
    if (parsed) {
      cards.push(parsed);
      if (parsed.error) {
        errors.push(`Line "${line.trim()}": ${parsed.error}`);
      }
    }
  }

  // Consolidate duplicate cards
  const consolidated = new Map<string, ParsedCard>();
  for (const card of cards) {
    const key = card.cardName.toLowerCase();
    if (consolidated.has(key)) {
      const existing = consolidated.get(key)!;
      existing.quantity += card.quantity;
      // Keep the lower confidence if combining
      existing.parseConfidence = Math.min(existing.parseConfidence, card.parseConfidence);
    } else {
      consolidated.set(key, { ...card });
    }
  }

  return {
    cards: Array.from(consolidated.values()),
    errors,
    hasErrors: errors.length > 0 || cards.some(c => c.parseConfidence < 1),
  };
}

export function validateDecklist(cards: ParsedCard[]): string[] {
  const errors: string[] = [];

  if (cards.length === 0) {
    errors.push('No cards found in decklist');
  }

  const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);
  if (totalCards > 500) {
    errors.push('Decklist has more than 500 cards - please check for duplicates');
  }

  const lowConfidenceCards = cards.filter(c => c.parseConfidence < 1);
  if (lowConfidenceCards.length > 0) {
    errors.push(`${lowConfidenceCards.length} card(s) need review`);
  }

  return errors;
}
