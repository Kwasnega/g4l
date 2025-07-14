import { WishlistClient } from "@/components/wishlist-client";

export default function WishlistPage() {
    // The suggested products grid has been removed to prevent database errors.
    const suggestedProducts = null;

    return <WishlistClient suggestedProducts={suggestedProducts} />;
}
