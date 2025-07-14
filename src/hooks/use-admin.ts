
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';
import { db } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

type AdminContextType = {
  isAdmin: boolean;
  isLoading: boolean;
};

// This hook doesn't need a provider as it relies on the useAuth hook.
export function useAdmin(): AdminContextType {
  const { user, isLoading: isAuthLoading, isFirebaseConfigured } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user || !isFirebaseConfigured || !db) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    const checkAdminStatus = async () => {
      setIsLoading(true);
      try {
        const adminRef = ref(db, `adminUsers/${user.uid}`);
        const snapshot = await get(adminRef);
        setIsAdmin(snapshot.exists() && snapshot.val() === true);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, isAuthLoading, isFirebaseConfigured]);

  return { isAdmin, isLoading };
}
