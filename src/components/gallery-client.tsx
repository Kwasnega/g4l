
"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import type { GalleryImage } from "@/types";

interface GalleryClientProps {
  images: GalleryImage[];
}

export function GalleryClient({ images }: GalleryClientProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  return (
    <>
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {images.map((image, i) => (
          <div
            key={image.id}
            className="group relative overflow-hidden rounded-lg shadow-lg break-inside-avoid cursor-pointer animate-pop-in"
            style={{ animationDelay: `${i * 75}ms`}}
            onClick={() => setSelectedImage(image)}
          >
             <Image
                src={image.url}
                alt={image.id}
                data-ai-hint="gallery photo"
                width={600}
                height={800}
                className="w-full h-auto object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-300 flex items-center justify-center">
                  <div className="text-white text-center p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out transform translate-y-4 group-hover:translate-y-0">
                      <Eye className="h-8 w-8 mx-auto mb-2" />
                      <p className="font-semibold text-lg capitalize">View Image</p>
                  </div>
              </div>
          </div>
        ))}
      </div>
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="p-0 border-0 max-w-5xl bg-transparent shadow-none">
          {selectedImage && (
            <Image
              src={selectedImage.url}
              alt={selectedImage.id}
              width={1600}
              height={1200}
              className="w-auto h-auto max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
