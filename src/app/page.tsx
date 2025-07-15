import { Suspense } from 'react';
import { HeroSection } from '@/components/hero-section';
import { IgGallery } from '@/components/ig-gallery';
import { RecentlyViewed } from '@/components/recently-viewed';
import { FeaturedProductsSection } from '@/components/featured-products-section';

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <HeroSection />

      {/* Featured Products - Only shows when products exist */}
      <FeaturedProductsSection limit={8} />

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
