'use client';
import React, { useState, useEffect, useCallback, createContext, useContext, useMemo, type ReactNode } from 'react';

type WishlistContextType = {
    productIds: string[];
    toggleProductId: (id: string) => void;
    isInWishlist: (id: string) => boolean;
    wishlistCount: number;
    isInitialized: boolean;
};

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const STORAGE_KEY = 'g4l-wishlist';

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [productIds, setProductIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedItems = window.localStorage.getItem(STORAGE_KEY);
      if (storedItems) {
        setProductIds(JSON.parse(storedItems));
      }
    } catch (error) {
      console.error("Failed to parse wishlist items from localStorage", error);
    }
    setIsInitialized(true);
  }, []);

  const toggleProductId = useCallback((id: string) => {
    if (!id) return;
    setProductIds(prevIds => {
      const newIds = prevIds.includes(id) 
        ? prevIds.filter(prevId => prevId !== id)
        : [id, ...prevIds];
      
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newIds));
      } catch (error) {
        console.error("Failed to save wishlist item to localStorage", error);
      }
      return newIds;
    });
  }, []);
  
  const isInWishlist = useCallback((id: string) => {
    return productIds.includes(id);
  }, [productIds]);

  const wishlistCount = useMemo(() => productIds.length, [productIds]);

  const value = useMemo(() => ({
    productIds,
    toggleProductId,
    isInWishlist,
    isInitialized,
    wishlistCount,
  }), [productIds, toggleProductId, isInWishlist, isInitialized, wishlistCount]);

  return React.createElement(WishlistContext.Provider, { value: value }, children);
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (context === undefined) {
      throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
}
