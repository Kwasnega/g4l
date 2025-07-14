
'use client';
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'g4l-recently-viewed';

export function useRecentlyViewed() {
  const [productIds, setProductIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedItems = window.localStorage.getItem(STORAGE_KEY);
      if (storedItems) {
        setProductIds(JSON.parse(storedItems));
      }
    } catch (error) {
      console.error("Failed to parse recently viewed items from localStorage", error);
    }
    setIsInitialized(true);
  }, []);

  const addProductId = useCallback((id: string) => {
    if (!id) return;
    setProductIds(prevIds => {
      const newIds = [id, ...prevIds.filter(prevId => prevId !== id)].slice(0, 10); // keep max 10
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newIds));
      } catch (error) {
        console.error("Failed to save recently viewed item to localStorage", error);
      }
      return newIds;
    });
  }, []);

  return { productIds, addProductId, isInitialized };
}
