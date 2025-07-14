import { Suspense } from 'react';
import { HeroSection } from '@/components/hero-section'; // No longer needs props
import { IgGallery } from '@/components/ig-gallery';
import { RecentlyViewed } from '@/components/recently-viewed';
import { ProductGrid } from '@/components/product-grid';

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section (now self-contained with local images) */}
      <HeroSection />
      
      <section id="featured-products" className="py-12 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-headline text-center mb-8">Featured Products</h2>
          <Suspense fallback={<ProductGrid.Skeleton />}>
            <ProductGrid limit={8} />
          </Suspense>
        </div>
      </section>

      <IgGallery />
      
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <Suspense fallback={null}>
            <RecentlyViewed />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
