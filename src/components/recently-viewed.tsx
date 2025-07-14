
"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { getProductById } from "@/lib/data";
import { ProductCard } from "./product-card";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";

export function RecentlyViewed() {
  const { productIds, isInitialized } = useRecentlyViewed();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isInitialized) {
      if (productIds.length === 0) {
        setIsLoading(false);
        return;
      }

      const fetchProducts = async () => {
        setIsLoading(true);
        const viewedProducts = await Promise.all(
          productIds.map((id) => getProductById(id))
        );
        const validProducts = viewedProducts.filter((p): p is Product => p !== null);
        setProducts(validProducts);
        setIsLoading(false);
      };
      fetchProducts();
    }
  }, [productIds, isInitialized]);
  
  if (!isInitialized || productIds.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-3xl md:text-4xl font-headline text-center mb-8">Recently Viewed</h2>
      {isLoading ? (
        <div className="flex space-x-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-1/2 md:w-1/4">
               <Skeleton className="aspect-[3/4] w-full" />
               <Skeleton className="h-5 w-3/4 mt-2" />
               <Skeleton className="h-6 w-1/4 mt-1" />
            </div>
          ))}
        </div>
      ) : (
        <ScrollArea>
          <div className="flex space-x-4 pb-4">
            {products.map((product) => (
              <div key={product.id} className="w-64 flex-shrink-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}
