
'use client';

import type { Product } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { WishlistButton } from "./wishlist-button";
import { Button } from "./ui/button";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useStoreStatus } from "@/hooks/use-store-status";
import { animateFlyToCart } from "@/lib/utils";
import { useRef } from "react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const { isStoreOpen } = useStoreStatus();
  const imageRef = useRef<HTMLDivElement>(null);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if store is open
    if (!isStoreOpen) {
      toast({
        variant: "destructive",
        title: "Store Closed",
        description: "The G4L store is currently closed. Please check back later.",
      });
      return;
    }

    const defaultSize = product.sizes[0];
    const defaultColor = product.colors[0];

    if (defaultSize && defaultColor) {
      addItem(product.id, defaultSize, defaultColor, 1);
      toast({
        title: "Added to bag!",
        description: `G4L ${product.name} (Size: ${defaultSize}, Color: ${defaultColor}) was added.`,
      });

      const cartIconEl = document.querySelector<HTMLElement>('[data-cart-icon]');
      if (imageRef.current && cartIconEl) {
          animateFlyToCart(imageRef.current, cartIconEl);
      }
    } else {
      toast({
        variant: "destructive",
        title: "Oops!",
        description: "This product is missing size or color options.",
      });
    }
  };

  return (
    <div className="group relative">
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <CardContent className="p-0">
          <div className="aspect-[3/4] relative" ref={imageRef}>
            <Link href={`/products/${product.id}`} aria-label={`View details for G4L ${product.name}`}>
              <Image
                src={product.images[0] || "https://placehold.co/600x800.png"}
                alt={product.name}
                data-ai-hint="logo"
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </Link>
            <WishlistButton productId={product.id} productName={`G4L ${product.name}`} />
          </div>
          <div className="p-2 sm:p-3 md:p-4">
            <Link href={`/products/${product.id}`} className="hover:underline">
              <h3 className="font-medium truncate text-sm sm:text-base">G4L {product.name}</h3>
            </Link>
            <p className="font-bold text-base sm:text-lg">GH₵{product.price.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>
      
      <div className="absolute bottom-0 left-0 right-0 p-1 sm:p-2 opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-in-out z-10">
        <Button
          className="w-full font-bold shadow-lg text-xs sm:text-sm py-1 sm:py-2"
          onClick={handleQuickAdd}
          disabled={!isStoreOpen}
          variant={!isStoreOpen ? "secondary" : "default"}
        >
            <ShoppingBag className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            {!isStoreOpen ? "Store Closed" : "Quick Add"}
        </Button>
      </div>
    </div>
  );
}
