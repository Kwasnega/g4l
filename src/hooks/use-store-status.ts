'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';

interface StoreStatus {
  isStoreOpen: boolean;
  isLoading: boolean;
}

export function useStoreStatus(): StoreStatus {
  const [isStoreOpen, setIsStoreOpen] = useState(true); // Default to open
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    const storeSettingsRef = ref(db, 'admin/storeSettings');
    
    const unsubscribe = onValue(storeSettingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const settings = snapshot.val();
        setIsStoreOpen(settings.isStoreOpen ?? true);
      } else {
        // If no settings exist, default to store being open
        setIsStoreOpen(true);
      }
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching store status:', error);
      // On error, default to store being open
      setIsStoreOpen(true);
      setIsLoading(false);
    });

    return () => {
      off(storeSettingsRef, 'value', unsubscribe);
    };
  }, []);

  return { isStoreOpen, isLoading };
}
