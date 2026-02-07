import { useState, useEffect, useCallback } from 'react';
import { autocompleteCardName } from '@/lib/scryfall';

export function useScryfallAutocomplete(debounceMs = 200) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(async () => {
      const results = await autocompleteCardName(query);
      setSuggestions(results);
      setIsLoading(false);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, debounceMs]);

  const reset = useCallback(() => {
    setQuery('');
    setSuggestions([]);
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    isLoading,
    reset,
  };
}
