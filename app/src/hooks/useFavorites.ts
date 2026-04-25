import { useState, useCallback } from 'react';

const STORAGE_KEY = 'bustracker';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useFavorites() {
  const [data, setData] = useState(load);

  const favorites = data.favorites || [];
  const recentSearches = data.recentSearches || [];
  const userLocation = data.userLocation || null;

  const update = useCallback((fn) => {
    setData(prev => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  const addFavorite = useCallback((fav) => {
    update(d => ({
      ...d,
      favorites: [...(d.favorites || []).filter(f => f.id !== fav.id), fav],
    }));
  }, [update]);

  const removeFavorite = useCallback((id) => {
    update(d => ({
      ...d,
      favorites: (d.favorites || []).filter(f => f.id !== id),
    }));
  }, [update]);

  const isFavorite = useCallback((id) => {
    return favorites.some(f => f.id === id);
  }, [favorites]);

  const addRecentSearch = useCallback((term) => {
    update(d => {
      const recent = [term, ...(d.recentSearches || []).filter(s => s !== term)].slice(0, 10);
      return { ...d, recentSearches: recent };
    });
  }, [update]);

  const setUserLocation = useCallback((lat, lon) => {
    update(d => ({ ...d, userLocation: { lat, lon } }));
  }, [update]);

  return {
    favorites,
    recentSearches,
    userLocation,
    addFavorite,
    removeFavorite,
    isFavorite,
    addRecentSearch,
    setUserLocation,
  };
}
