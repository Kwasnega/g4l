
'use client';
import React, { useState, useEffect, useCallback, createContext, useContext, useMemo, type ReactNode } from 'react';

export type CartItem = {
  productId: string;
  quantity: number;
  size: string;
  color: string;
};

type CartContextType = {
  items: CartItem[];
  addItem: (productId: string, size: string, color: string, quantity?: number) => void;
  removeItem: (productId: string, size: string, color: string) => void;
  updateItemQuantity: (productId: string, size: string, color: string, newQuantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  isInitialized: boolean;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'g4l-cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedItems = window.localStorage.getItem(STORAGE_KEY);
      if (storedItems) {
        setItems(JSON.parse(storedItems));
      }
    } catch (error) {
      console.error("Failed to parse cart items from localStorage", error);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.error("Failed to save cart items to localStorage", error);
      }
    }
  }, [items, isInitialized]);
  

  const addItem = useCallback((productId: string, size: string, color: string, quantity: number = 1) => {
    if (!productId || !size || !color) return;
    
    setItems(prevItems => {
        const existingItem = prevItems.find(item => item.productId === productId && item.size === size && item.color === color);

        if (existingItem) {
            return prevItems.map(item => 
                item.productId === productId && item.size === size && item.color === color 
                ? { ...item, quantity: item.quantity + quantity }
                : item
            );
        } else {
            return [...prevItems, { productId, quantity, size, color }];
        }
    });
  }, []);
  
  const removeItem = useCallback((productId: string, size: string, color: string) => {
    setItems(prevItems => {
        return prevItems.filter(item => !(item.productId === productId && item.size === size && item.color === color));
    });
  }, []);

  const updateItemQuantity = useCallback((productId: string, size: string, color: string, newQuantity: number) => {
    // If newQuantity is not a valid number or is <= 0, remove the item.
    if (isNaN(newQuantity) || newQuantity <= 0) {
      removeItem(productId, size, color);
      return;
    }
    setItems(prevItems => {
        return prevItems.map(item => 
            item.productId === productId && item.size === size && item.color === color
            ? { ...item, quantity: newQuantity }
            : item
        );
    });
  }, [removeItem]);
  
  const clearCart = useCallback(() => {
    setItems([]);
  }, []);
  
  const cartCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);

  const value = useMemo(() => ({
      items,
      addItem,
      removeItem,
      updateItemQuantity,
      clearCart,
      cartCount,
      isInitialized,
  }), [items, addItem, removeItem, updateItemQuantity, clearCart, cartCount, isInitialized]);

  return React.createElement(CartContext.Provider, { value: value }, children);
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
