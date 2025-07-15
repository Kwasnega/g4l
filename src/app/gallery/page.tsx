import { getGalleryImages, getGallerySlideshowImages } from "@/lib/data";
import { GalleryClient } from "@/components/gallery-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { GalleryHero } from "@/components/gallery-hero";
import type { Metadata } from 'next';

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'Explore the G4L streetwear gallery. See our latest designs and customer showcases.',
};

const GallerySkeleton = () => {
    return (
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-96 w-full rounded-lg break-inside-avoid" />
        ))}
      </div>
    )
}

export default async function GalleryPage() {
  const galleryImages = await getGalleryImages();
  const slideshowImages = await getGallerySlideshowImages();

  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <Suspense fallback={<Skeleton className="h-[60vh] md:h-[70vh] w-full mb-12" />}>
        {/* Pass slideshow images to GalleryHero */}
        <GalleryHero slides={slideshowImages} />
      </Suspense>
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-headline tracking-wider">The G4L Lookbook</h2>
        <p className="text-lg text-muted-foreground mt-2">A canvas of style, worn by the community.</p>
      </div>
      <Suspense fallback={<GallerySkeleton />}>
        {galleryImages.length > 0 ? (
          <GalleryClient images={galleryImages} />
        ) : (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">No gallery images have been added yet.</p>
          </div>
        )}
      </Suspense>
    </div>
  );
}