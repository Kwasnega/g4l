'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';

type AuthContextType = {
  user: User | null;
  loading: boolean; // Changed from isLoading to loading
  isAuthenticated: boolean; // Added for convenience
  isFirebaseConfigured: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Changed from isLoading to loading

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      console.log("Auth: Firebase is configured, setting up auth listener.");
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false); // Changed from setIsLoading to setLoading
        console.log("Auth: User state changed:", user ? user.email : "No user");
      });
      return () => {
        console.log("Auth: Cleaning up auth listener.");
        unsubscribe();
      };
    } else {
      console.warn("Auth: Firebase is not configured. Auth features will be disabled.");
      setLoading(false); // Changed from setIsLoading to setLoading
      setUser(null);
    }
  }, []);

  // Memoize the value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    loading, // Use 'loading'
    isAuthenticated: !!user, // Derive isAuthenticated from user presence
    isFirebaseConfigured
  }), [user, loading, isFirebaseConfigured]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
