
import { getGalleryImages } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import { Instagram } from "lucide-react";

export async function IgGallery() {
  const allImages = await getGalleryImages();
  // Take the first 6 most recent images for the homepage
  const images = allImages.slice(0, 6);

  return (
    <section className="bg-muted py-8 sm:py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-headline">Join The Movement</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 flex items-center justify-center gap-2">
              Follow us on Instagram
              <Link
                href="https://www.instagram.com/greatness4l"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center hover:text-foreground transition-colors"
                aria-label="Follow @greatness4l on Instagram"
              >
                <Instagram className="h-5 w-5" />
              </Link>
            </p>
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {images.map((image, i) => (
              <Link key={image.id} href="/gallery" className="aspect-square block relative overflow-hidden rounded-lg shadow-sm">
                <Image
                  src={image.url}
                  alt={image.id}
                  data-ai-hint="gallery photo"
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-110"
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <p className="text-sm sm:text-base">No gallery images found.</p>
          </div>
        )}

        <div className="text-center mt-8 sm:mt-12">
            <Button asChild size="lg" className="text-sm sm:text-base px-6 sm:px-8">
                <Link href="/gallery">View Full Gallery</Link>
            </Button>
        </div>
      </div>
    </section>
  );
}
