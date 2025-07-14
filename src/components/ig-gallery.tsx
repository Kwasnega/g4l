
import { getGalleryImages } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";

export async function IgGallery() {
  const allImages = await getGalleryImages();
  // Take the first 6 most recent images for the homepage
  const images = allImages.slice(0, 6);

  return (
    <section className="bg-muted py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-headline">Join The Movement</h2>
            <p className="text-muted-foreground mt-2">Follow us on Instagram @greatness4l</p>
        </div>
        
        {images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
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
            <p>No gallery images found.</p>
          </div>
        )}

        <div className="text-center mt-12">
            <Button asChild size="lg">
                <Link href="/gallery">View Full Gallery</Link>
            </Button>
        </div>
      </div>
    </section>
  );
}
