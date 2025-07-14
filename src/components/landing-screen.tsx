
'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useLanding } from '@/hooks/use-landing';

export function LandingScreen() {
  const { isLandingActive, hideLanding } = useLanding();
  const [isMounted, setIsMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // When the component mounts, check session storage. If we've landed before, hide the screen.
    if (sessionStorage.getItem('g4l-landed')) {
      hideLanding();
    }
  }, [hideLanding]);
  
  // When the landing screen is activated from the outside (e.g., replay button),
  // we need to reset the internal `isExiting` state to ensure animations can run again.
  useEffect(() => {
    if (isLandingActive) {
      setIsExiting(false);
    }
  }, [isLandingActive]);

  const handleEnterSite = () => {
    // Don't do anything if we are already in the process of exiting.
    if (isExiting) return;
    setIsExiting(true);
  };

  const onTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    // When the exit animation finishes, update session storage and hide the component via context.
    if (e.propertyName === 'transform' && isExiting) {
        sessionStorage.setItem('g4l-landed', 'true');
        hideLanding();
    }
  };
  
  if (!isMounted || !isLandingActive) {
    return null;
  }

  return (
    <div
      className="group/landing"
      onClick={handleEnterSite}
    >
      <div 
        onTransitionEnd={onTransitionEnd}
        className={cn("fixed inset-y-0 left-0 z-[201] w-1/2 bg-black transition-transform duration-1000 ease-in-out", isExiting ? "-translate-x-full" : "translate-x-0")}
      />
      <div 
        className={cn("fixed inset-y-0 right-0 z-[201] w-1/2 bg-black transition-transform duration-1000 ease-in-out", isExiting ? "translate-x-full" : "translate-x-0")}
      />

      <div 
        className={cn(
          "fixed inset-0 z-[202] flex cursor-pointer items-center justify-center text-center text-white transition-opacity duration-500",
          isExiting ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <div>
          <h1 className="font-headline text-8xl md:text-9xl text-white animate-pulse-glow">G4L</h1>
          <p className="mt-4 font-headline text-2xl tracking-widest transition-all hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
            MAY WE ALL BE GREAT
          </p>
          <p className="mt-8 text-sm uppercase tracking-widest text-neutral-400 animate-pulse">Click to enter</p>
        </div>
      </div>
    </div>
  );
}
