import { Suspense } from 'react';
import { getProducts } from "@/lib/data";
import { ProductGrid } from './product-grid';

interface FeaturedProductsSectionProps {
  limit?: number;
}

async function FeaturedProductsContent({ limit }: FeaturedProductsSectionProps) {
  const { products } = await getProducts(limit);
  
  // Don't render the section if there are no products
  if (products.length === 0) {
    return null;
  }
  
  return (
    <section id="featured-products" className="py-8 sm:py-12 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-headline text-center mb-6 sm:mb-8">Featured Products</h2>
        <ProductGrid limit={limit} />
      </div>
    </section>
  );
}

export function FeaturedProductsSection({ limit = 8 }: FeaturedProductsSectionProps) {
  return (
    <Suspense fallback={
      <section id="featured-products" className="py-8 sm:py-12 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-headline text-center mb-6 sm:mb-8">Featured Products</h2>
          <ProductGrid.Skeleton />
        </div>
      </section>
    }>
      <FeaturedProductsContent limit={limit} />
    </Suspense>
  );
}
