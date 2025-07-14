"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from './ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ref, get } from 'firebase/database'; // Import Firebase functions
import { db } from '@/lib/firebase'; // Import Firebase database instance
import { Loader2 } from 'lucide-react'; // For loading spinner

// Assuming this type matches your Firebase data structure for slideshow images
interface GallerySlideshowImage {
  id: string;
  url: string;
  uploadedAt: string;
  public_id?: string;
  // If you want dynamic text per slide, you'd add properties like:
  // headline?: string;
  // subheadline?: string;
  // buttonText?: string;
}

export function HeroSection() {
  const [slides, setSlides] = useState<GallerySlideshowImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingImages, setLoadingImages] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch slideshow images from Firebase
  useEffect(() => {
    const fetchSlideshowImages = async () => {
      setLoadingImages(true);
      setError(null);
      try {
        if (!db) {
          throw new Error("Firebase database not initialized.");
        }
        const slideshowRef = ref(db, 'gallery_slideshow_images');
        const snapshot = await get(slideshowRef);
        const fetchedImages: GallerySlideshowImage[] = [];

        if (snapshot.exists()) {
          snapshot.forEach(childSnapshot => {
            const img = childSnapshot.val();
            if (img && img.url && img.uploadedAt) {
              fetchedImages.push({ id: childSnapshot.key!, ...img });
            }
          });
        }
        setSlides(fetchedImages);
      } catch (err: any) {
        console.error("Error fetching slideshow images:", err);
        setError("Failed to load slideshow images.");
      } finally {
        setLoadingImages(false);
      }
    };

    fetchSlideshowImages();
  }, []); // Empty dependency array means this runs once on mount

  // Automatic slide change interval
  useEffect(() => {
    if (slides.length <= 1) return; // No need for interval if 0 or 1 slide
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [slides.length]); // Re-run effect if the number of slides changes

  // Handle loading state
  if (loadingImages) {
    return (
      <section className="relative h-[60vh] md:h-[80vh] w-full flex items-center justify-center bg-gray-900 text-gray-400 overflow-hidden">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="ml-4 text-xl">Loading slideshow...</p>
      </section>
    );
  }

  // Handle error state
  if (error) {
    return (
      <section className="relative h-[60vh] md:h-[80vh] w-full flex items-center justify-center bg-red-900/20 text-red-400 overflow-hidden">
        <p className="text-xl">Error: {error}</p>
      </section>
    );
  }

  // Handle no images state
  if (slides.length === 0) {
    return (
      <section className="relative h-[60vh] md:h-[80vh] w-full flex items-center justify-center text-white bg-muted overflow-hidden rounded-lg mb-12 shadow-2xl">
        <div className="text-center p-4">
          <h1 className="font-headline text-4xl md:text-6xl text-muted-foreground">No Slideshow Images</h1>
          <p className="text-muted-foreground mt-2">Please add images to the 'Slideshow Images' tab in your Admin Gallery.</p>
          <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700">
            <Link href="/admin/gallery">Manage Gallery</Link>
          </Button>
        </div>
      </section>
    );
  }

  const currentSlide = slides[currentIndex]; // Now using dynamically fetched slides

  // Define static text content for the hero section (can be made dynamic if needed)
  const staticHeroContent = {
    headline: 'EMBODY GREATNESS',
    subheadline: 'Luxury Streetwear, crafted in the heart of Ghana.',
    buttonText: 'Explore Collection'
  };

  return (
    <section className="relative h-[60vh] md:h-[80vh] w-full flex items-center justify-center text-white overflow-hidden">
      {/* Image Slides */}
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
            // Alt text now more descriptive, using index for uniqueness
            alt={`G4L Streetwear Slideshow Image ${index + 1}`}
            data-ai-hint={`Slideshow image for G4L Streetwear, uploaded on ${new Date(slide.uploadedAt).toLocaleDateString()}`}
            fill
            className="object-cover"
            priority={index === 0} // Prioritize loading the first image
            onError={(e) => {
              e.currentTarget.src = 'https://placehold.co/1800x1200.png?text=Image+Load+Error';
              console.error(`Failed to load image: ${slide.url}`);
            }}
          />
          <div className="absolute inset-0 bg-black/50" /> {/* Overlay for text readability */}
        </div>
      ))}
      
      {/* Text Content */}
      <div className="relative z-10 text-center p-4">
        {/* Using a key on the parent div to re-trigger animations on slide change */}
        <div key={currentIndex} className="animate-fade-in-up">
            <h1 className="font-headline text-5xl md:text-7xl lg:text-9xl tracking-wider mb-4">
                {staticHeroContent.headline}
            </h1>
            <p className="max-w-xl mx-auto text-lg md:text-xl text-neutral-200 mb-8">
                {staticHeroContent.subheadline}
            </p>
            <Button size="lg" asChild className="font-bold text-lg">
                <Link href="/products">{staticHeroContent.buttonText}</Link>
            </Button>
        </div>
      </div>
    </section>
  );
}
