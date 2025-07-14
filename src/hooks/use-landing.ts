
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

type LandingContextType = {
  isLandingActive: boolean;
  showLanding: () => void;
  hideLanding: () => void;
};

const LandingContext = createContext<LandingContextType | undefined>(undefined);

export function LandingProvider({ children }: { children: ReactNode }) {
  const [isLandingActive, setIsLandingActive] = useState(true);

  const showLanding = useCallback(() => {
    // Clear the session storage item so it shows on next refresh too
    sessionStorage.removeItem('g4l-landed');
    // Activate the landing screen
    setIsLandingActive(true);
  }, []);

  const hideLanding = useCallback(() => {
    setIsLandingActive(false);
  }, []);

  const value = useMemo(
    () => ({
      isLandingActive,
      showLanding,
      hideLanding,
    }),
    [isLandingActive, showLanding, hideLanding]
  );

  return React.createElement(LandingContext.Provider, { value: value }, children);
}

export function useLanding() {
  const context = useContext(LandingContext);
  if (context === undefined) {
    throw new Error('useLanding must be used within a LandingProvider');
  }
  return context;
}
