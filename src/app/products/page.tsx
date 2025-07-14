
import { ProductGrid } from '@/components/product-grid';
import { Suspense } from 'react';

export default function ProductsPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-headline tracking-wider">All Products</h1>
        <p className="text-lg text-muted-foreground mt-2">Discover the full G4L collection.</p>
      </div>
      <Suspense fallback={<ProductGrid.Skeleton />}>
        <ProductGrid />
      </Suspense>
    </div>
  );
}
