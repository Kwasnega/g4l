
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import Link from 'next/link';
import type { GallerySlideshowImage } from '@/types';

interface GalleryHeroProps {
  slides: GallerySlideshowImage[];
}

export function GalleryHero({ slides }: GalleryHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [slides.length]);

  if (slides.length === 0) {
    return (
        <div className="relative h-[60vh] md:h-[70vh] w-full flex items-center justify-center text-white bg-muted overflow-hidden rounded-lg mb-12 shadow-2xl">
            <div className="text-center p-4">
                <h1 className="font-headline text-4xl md:text-6xl text-muted-foreground">No Slideshow Images</h1>
                <p className="text-muted-foreground mt-2">Please add images to the 'gallery_slideshow_images' node in your database.</p>
            </div>
        </div>
    );
  }

  const currentSlide = slides[currentIndex];

  return (
    <div className="relative h-[60vh] md:h-[70vh] w-full flex items-center justify-center text-white overflow-hidden rounded-lg mb-12 shadow-2xl">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={cn(
            "absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out",
            index === currentIndex ? "opacity-100" : "opacity-0"
          )}
        >
          <Image
            src={slide.url}
            alt={slide.public_id}
            data-ai-hint="gallery slideshow"
            fill
            className="object-cover"
            priority={index === 0}
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      ))}
      
      <div className="relative z-10 text-center p-4">
        <div key={currentIndex}>
            {/* The text is hardcoded for now, can be added to DB later if needed */}
            <h1 className="font-headline text-4xl md:text-6xl tracking-wider mb-3 animate-fade-in-down">
                Art of the Streets
            </h1>
            <p className="max-w-md mx-auto text-lg text-neutral-200 mb-6 animate-fade-in-up">
                Where fashion meets creative expression.
            </p>
            <Button size="lg" asChild className="font-bold animate-fade-in-up">
                <Link href="/products">Shop the Look</Link>
            </Button>
        </div>
      </div>
    </div>
  );
}
