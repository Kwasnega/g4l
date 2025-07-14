"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Product } from "@/types";
import { useWishlist } from "@/hooks/use-wishlist";
import { getProductById } from "@/lib/data";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface WishlistClientProps {
    suggestedProducts: ReactNode;
}

export function WishlistClient({ suggestedProducts }: WishlistClientProps) {
  const { productIds, isInitialized } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isInitialized) {
      if (productIds.length === 0) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      const fetchProducts = async () => {
        setIsLoading(true);
        const wishedProducts = await Promise.all(
          productIds.map((id) => getProductById(id))
        );
        setProducts(wishedProducts.filter((p): p is Product => p !== null));
        setIsLoading(false);
      };
      fetchProducts();
    }
  }, [productIds, isInitialized]);

  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <h1 className="text-3xl md:text-4xl font-headline text-center mb-8 flex items-center justify-center gap-2">
        <Heart className="h-8 w-8" /> My Wishlist
      </h1>
      {isInitialized && !isLoading && products.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-muted-foreground">Your wishlist is empty.</p>
          <p className="text-muted-foreground mt-2">Add some products you love by clicking the heart icon.</p>
            <Button asChild className="mt-6">
              <Link href="/">Discover Products</Link>
            </Button>
             <div className="mt-16 md:mt-24">
              <h2 className="text-3xl font-headline text-center mb-8">You Might Also Like</h2>
              {suggestedProducts}
            </div>
        </div>
      )}
      {(isLoading || !isInitialized) ? (
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
            </div>
          ))}
        </div>
      ) : (
        products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
