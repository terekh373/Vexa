import { useEffect, useState } from 'react';

import { getCourseSuggestions } from '../services/coursesService.js';

const SUGGESTION_DELAY_MS = 250;

export const useCourseSuggestions = (value) => {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const query = value.trim();

    if (query.length < 2) {
      setSuggestions([]);
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      getCourseSuggestions(query)
        .then((items) => {
          if (!cancelled) setSuggestions(items);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        });
    }, SUGGESTION_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [value]);

  return suggestions;
};
