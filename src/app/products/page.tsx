
import { ProductGrid } from '@/components/product-grid';
import { Suspense } from 'react';
import type { Metadata } from 'next';

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Products',
  description: 'Discover the full G4L streetwear collection. Ghana-made luxury streetwear for the driven.',
};

export default function ProductsPage() {
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 md:py-16">
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline tracking-wider">All Products</h1>
        <p className="text-base sm:text-lg text-muted-foreground mt-2">Discover the full G4L collection.</p>
      </div>
      <Suspense fallback={<ProductGrid.Skeleton />}>
        <ProductGrid />
      </Suspense>
    </div>
  );
}
