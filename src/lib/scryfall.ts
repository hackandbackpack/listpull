// Scryfall API utilities for Magic: The Gathering cards

import { scryfallLimiter } from './rateLimiter';

const SCRYFALL_BASE_URL = 'https://scryfall.com';
const SCRYFALL_API_URL = 'https://api.scryfall.com';

/**
 * Generate a Scryfall search URL for a card name
 */
export function getScryfallSearchUrl(cardName: string): string {
  const encodedName = encodeURIComponent(cardName);
  return `${SCRYFALL_BASE_URL}/search?q=${encodedName}`;
}

/**
 * Generate a direct Scryfall card URL using exact name search
 */
export function getScryfallCardUrl(cardName: string): string {
  const encodedName = encodeURIComponent(cardName);
  return `${SCRYFALL_BASE_URL}/search?q=!"${encodedName}"`;
}

export interface ScryfallCard {
  id: string;
  name: string;
  uri: string;
  scryfall_uri: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    art_crop: string;
  };
  prices: {
    usd: string | null;
    usd_foil: string | null;
    eur: string | null;
  };
  set_name: string;
  set: string;
  rarity: string;
  color_identity: string[]; // Array of 'W', 'U', 'B', 'R', 'G'
}

export interface ScryfallError {
  object: 'error';
  code: string;
  status: number;
  details: string;
}

export interface ScryfallAutocompleteResult {
  object: 'catalog';
  total_values: number;
  data: string[];
}

function isValidScryfallCard(data: unknown): data is ScryfallCard {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    obj.object !== 'error'
  );
}

/**
 * Fetch card data from Scryfall API using fuzzy name matching
 * Rate limited to prevent 429 errors
 */
export async function fetchCardData(cardName: string): Promise<ScryfallCard | null> {
  return scryfallLimiter.execute(async () => {
    try {
      const response = await fetch(
        `${SCRYFALL_API_URL}/cards/named?fuzzy=${encodeURIComponent(cardName)}`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (!isValidScryfallCard(data)) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Scryfall API error:', error);
      return null;
    }
  });
}

/**
 * Autocomplete card names using Scryfall's autocomplete endpoint
 * Returns up to 20 card names that match the query
 * Rate limited to prevent 429 errors
 */
export async function autocompleteCardName(query: string): Promise<string[]> {
  if (!query || query.length < 2) {
    return [];
  }

  return scryfallLimiter.execute(async () => {
    try {
      const response = await fetch(
        `${SCRYFALL_API_URL}/cards/autocomplete?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        return [];
      }

      const data: ScryfallAutocompleteResult = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Scryfall autocomplete error:', error);
      return [];
    }
  });
}

/**
 * Validate a card name by checking if it exists in Scryfall
 * Rate limited to prevent 429 errors
 */
export async function validateCardName(cardName: string): Promise<{ valid: boolean; suggestion?: string }> {
  return scryfallLimiter.execute(async () => {
    try {
      const response = await fetch(
        `${SCRYFALL_API_URL}/cards/named?fuzzy=${encodeURIComponent(cardName)}`
      );

      if (!response.ok) {
        return { valid: false };
      }

      const data = await response.json();

      if (!isValidScryfallCard(data)) {
        return { valid: false };
      }

      // If the name doesn't match exactly, provide suggestion
      if (data.name.toLowerCase() !== cardName.toLowerCase()) {
        return { valid: true, suggestion: data.name };
      }

      return { valid: true };
    } catch (error) {
      console.error('Scryfall validation error:', error);
      return { valid: false };
    }
  });
}

/**
 * Batch fetch card prices (respects Scryfall rate limits)
 * Uses the collection endpoint for efficiency - NOT rate limited since it's a single call
 */
export async function fetchCardPrices(
  cardNames: string[]
): Promise<Map<string, { usd: string | null; card: ScryfallCard | null }>> {
  const results = new Map<string, { usd: string | null; card: ScryfallCard | null }>();

  // Scryfall collection endpoint accepts up to 75 cards at once
  const identifiers = cardNames.map(name => ({ name }));

  try {
    const response = await fetch(`${SCRYFALL_API_URL}/cards/collection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifiers }),
    });

    if (!response.ok) {
      return results;
    }

    const data = await response.json();

    if (data.data) {
      for (const card of data.data as ScryfallCard[]) {
        results.set(card.name.toLowerCase(), {
          usd: card.prices.usd,
          card,
        });
      }
    }

    // Also check not_found for cards that weren't matched
    if (data.not_found) {
      for (const notFound of data.not_found) {
        if (notFound.name) {
          results.set(notFound.name.toLowerCase(), { usd: null, card: null });
        }
      }
    }
  } catch (error) {
    console.error('Scryfall collection fetch error:', error);
  }

  return results;
}

/**
 * Calculate total estimated price for a decklist
 */
export function calculateDeckPrice(
  cards: { cardName: string; quantity: number }[],
  priceMap: Map<string, { usd: string | null; card: ScryfallCard | null }>
): { total: number; missingPrices: string[] } {
  let total = 0;
  const missingPrices: string[] = [];

  for (const card of cards) {
    const priceData = priceMap.get(card.cardName.toLowerCase());
    if (priceData?.usd) {
      total += parseFloat(priceData.usd) * card.quantity;
    } else {
      missingPrices.push(card.cardName);
    }
  }

  return { total, missingPrices };
}
