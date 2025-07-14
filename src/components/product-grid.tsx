
import { getProducts } from "@/lib/data";
import { ProductCard } from "./product-card";
import { Skeleton } from "./ui/skeleton";
import type { Product } from "@/types";

interface ProductGridProps {
  limit?: number;
}

const ProductGridSkeleton = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="aspect-[3/4] w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
        </div>
      ))}
    </div>
  );
}

export async function ProductGrid({ limit }: ProductGridProps) {
  const { products } = await getProducts(limit);
  
  return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.length === 0 ? (
            <p className="text-center text-muted-foreground col-span-full">No products found.</p>
        ) : (
            products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
        )}
      </div>
  );
}

ProductGrid.Skeleton = ProductGridSkeleton;
