// Pokemon TCG API utilities for Pokemon cards
// Uses TCGdex API via backend proxy

import { CONFIG } from './config';
import { pokemonLimiter, chunk, delay } from './rateLimiter';

const POKEMON_PROXY_URL = `${CONFIG.api.baseUrl}/proxy/pokemon-tcg`;
// External card page (free, stable URLs by TCGdex card id)
const DEX_TCG_CARD_BASE_URL = 'https://dextcg.com/cards';
const DEX_TCG_SEARCH_URL = 'https://dextcg.com/search';

// Helper to strip set identifier from card name, e.g., "Pikachu (cel25)" -> "Pikachu"
function stripSetIdentifierFromName(name: string): string {
  return name.replace(/\s*\([^)]+\)\s*$/, '').trim();
}

/**
 * Generate a Pokemon TCG search URL for a card name
 * Strips set identifiers for better search compatibility
 */
export function getPokemonCardUrl(cardName: string, card?: PokemonCard | null): string {
  if (card?.id) {
    return `${DEX_TCG_CARD_BASE_URL}/${encodeURIComponent(card.id)}`;
  }

  const cleanName = stripSetIdentifierFromName(cardName);
  return `${DEX_TCG_SEARCH_URL}?q=${encodeURIComponent(cleanName)}`;
}

export interface PokemonCard {
  id: string;
  name: string;
  images: {
    small: string | null;
    large: string | null;
  };
  set: {
    id: string;
    name: string;
  };
  rarity?: string;
}

interface PokemonApiCard {
  id: string;
  name: string;
  set_name: string | null;
  set_id: string | null;
  rarity: string | null;
  image_url: string | null;
}

interface PokemonApiResponse {
  cards: PokemonApiCard[];
}

// Convert API response to internal format
function mapApiCard(card: PokemonApiCard): PokemonCard {
  return {
    id: card.id,
    name: card.name,
    images: {
      small: card.image_url,
      large: card.image_url,
    },
    set: {
      id: card.set_id || '',
      name: card.set_name || '',
    },
    rarity: card.rarity || undefined,
  };
}

/**
 * Autocomplete card names using TCGdex API
 * Returns card names with set info to help disambiguate (e.g., "Pikachu (Base Set)")
 * Rate limited to prevent overwhelming the proxy
 */
export async function autocompleteCardName(query: string): Promise<string[]> {
  if (!query || query.length < 2) {
    return [];
  }

  return pokemonLimiter.execute(async () => {
    try {
      const params = new URLSearchParams({
        action: 'search',
        query: query,
      });

      const response = await fetch(`${POKEMON_PROXY_URL}?${params}`);

      if (!response.ok) {
        return [];
      }

      const data: PokemonApiResponse = await response.json();

      if (!data.cards || data.cards.length === 0) {
        return [];
      }

      // Format as "Card Name (Set ID)" for disambiguation
      const suggestions = data.cards.map(card => {
        const setId = card.set_id || card.id.split('-')[0] || '';
        return setId ? `${card.name} (${setId})` : card.name;
      });

      // Remove duplicates (same card + set combo)
      const uniqueSuggestions = [...new Set(suggestions)];
      return uniqueSuggestions.slice(0, 10);
    } catch (error) {
      console.error('Pokemon TCG autocomplete error:', error);
      return [];
    }
  });
}

/**
 * Fetch card data from TCGdex API using exact name matching
 * Rate limited to prevent overwhelming the proxy
 */
export async function fetchCardData(cardName: string): Promise<PokemonCard | null> {
  return pokemonLimiter.execute(async () => {
    try {
      // Strip set identifier before searching
      const searchName = stripSetIdentifierFromName(cardName);

      const params = new URLSearchParams({
        action: 'search',
        query: searchName,
      });

      const response = await fetch(`${POKEMON_PROXY_URL}?${params}`);

      if (!response.ok) {
        return null;
      }

      const data: PokemonApiResponse = await response.json();

      if (!data.cards || data.cards.length === 0) {
        return null;
      }

      // If original name had a set identifier, try to match it
      const setMatch = cardName.match(/\(([^)]+)\)$/);
      if (setMatch) {
        const setId = setMatch[1].toLowerCase();
        const matchingCard = data.cards.find(c => c.id.toLowerCase().startsWith(setId));
        if (matchingCard) return mapApiCard(matchingCard);
      }

      // Find exact name match or first result
      const exactMatch = data.cards.find(c => c.name.toLowerCase() === searchName.toLowerCase());
      return mapApiCard(exactMatch || data.cards[0]);
    } catch (error) {
      console.error('Pokemon TCG API error:', error);
      return null;
    }
  });
}

/**
 * Batch fetch card data with parallel processing
 * TCGdex doesn't have pricing, returns card info only
 * Uses batching to avoid overwhelming the API while still being faster than sequential
 */
export async function fetchCardPrices(
  cardNames: string[]
): Promise<Map<string, { usd: string | null; card: PokemonCard | null }>> {
  const results = new Map<string, { usd: string | null; card: PokemonCard | null }>();

  const uniqueNames = [...new Set(cardNames.map(n => n.toLowerCase()))];

  // Process in batches of 5 for parallel execution
  const BATCH_SIZE = 5;
  const batches = chunk(uniqueNames, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    // Add delay between batches (not for first batch)
    if (i > 0) {
      await delay(CONFIG.api.pokemonRateLimitMs);
    }

    // Fetch batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (name) => {
        try {
          const card = await fetchCardData(name);
          return { name, card };
        } catch (error) {
          console.error('Pokemon TCG fetch error:', error);
          return { name, card: null };
        }
      })
    );

    // Store results
    for (const { name, card } of batchResults) {
      results.set(name, {
        usd: null, // TCGdex doesn't provide pricing
        card: card,
      });
    }
  }

  return results;
}

/**
 * Calculate total estimated price for a Pokemon decklist
 */
export function calculateDeckPrice(
  cards: { cardName: string; quantity: number }[],
  priceMap: Map<string, { usd: string | null; card: PokemonCard | null }>
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
