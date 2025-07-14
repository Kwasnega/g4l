
"use client";

import { useWishlist } from "@/hooks/use-wishlist";
import { Button } from "./ui/button";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface WishlistButtonProps {
    productId: string;
    productName: string;
    className?: string;
}

export function WishlistButton({ productId, productName, className }: WishlistButtonProps) {
    const { toggleProductId, isInWishlist } = useWishlist();
    const { toast } = useToast();
    const isProductInWishlist = isInWishlist(productId);

    const handleWishlistToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleProductId(productId);
        toast({
            title: isProductInWishlist ? "Removed from wishlist" : "Added to wishlist",
            description: `${productName} has been ${isProductInWishlist ? 'removed from' : 'added to'} your wishlist.`,
        });
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn("absolute top-2 right-2 bg-background/70 hover:bg-background rounded-full h-8 w-8 z-10", className)}
            onClick={handleWishlistToggle}
            aria-label="Toggle Wishlist"
        >
            <Heart className={cn("h-4 w-4", isProductInWishlist && "fill-destructive text-destructive")} />
        </Button>
    )
}
