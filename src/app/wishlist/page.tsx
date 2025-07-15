import { WishlistClient } from "@/components/wishlist-client";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wishlist',
  description: 'Your G4L wishlist. Save your favorite streetwear pieces for later.',
};

export default function WishlistPage() {
    // The suggested products grid has been removed to prevent database errors.
    const suggestedProducts = null;

    return <WishlistClient suggestedProducts={suggestedProducts} />;
}
