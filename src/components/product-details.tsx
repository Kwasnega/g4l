
"use client";

import { useState, useEffect, useRef } from "react";
import type { Product } from "@/types";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { cn, animateFlyToCart } from "@/lib/utils";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCart } from "@/hooks/use-cart";
import { Heart, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";


interface ProductDetailsProps {
  product: Product;
}

export function ProductDetails({ product }: ProductDetailsProps) {
  const [selectedImage, setSelectedImage] = useState(product.images[0]);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addProductId } = useRecentlyViewed();
  const { toast } = useToast();

  const { toggleProductId, isInWishlist } = useWishlist();
  const { addItem: addItemToCart } = useCart();
  
  const productImageRef = useRef<HTMLDivElement>(null);

  const isProductInWishlist = isInWishlist(product.id);
  const productName = `G4L ${product.name}`;

  useEffect(() => {
    addProductId(product.id);
  }, [product.id, addProductId]);

  const handleAddToCart = () => {
      if (selectedSize && selectedColor) {
          addItemToCart(product.id, selectedSize, selectedColor, quantity);
          toast({
            title: "Added to bag!",
            description: `${productName} (${selectedColor}, ${selectedSize}) has been added to your bag.`,
          });
          
          const productImageEl = productImageRef.current;
          const cartIconEl = document.querySelector<HTMLElement>('[data-cart-icon]');
          if (productImageEl && cartIconEl) {
              animateFlyToCart(productImageEl, cartIconEl);
          }
      }
  };

  const handleWishlistToggle = () => {
      toggleProductId(product.id);
      toast({
        title: isProductInWishlist ? "Removed from wishlist" : "Added to wishlist",
        description: `${productName} has been ${isProductInWishlist ? 'removed from' : 'added to'} your wishlist.`,
      });
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-12">
      <div className="md:col-span-1 lg:col-span-3 flex flex-col-reverse md:flex-row gap-4">
         <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          {product.images.map((img, index) => (
            <button
              key={index}
              className={cn(
                "relative aspect-square w-20 flex-shrink-0 rounded-lg overflow-hidden transition-all",
                selectedImage === img ? "ring-2 ring-primary ring-offset-2" : "opacity-70 hover:opacity-100"
              )}
              onClick={() => setSelectedImage(img)}
            >
              <Image src={img} alt={`${product.name} thumbnail ${index + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
        <div className="relative aspect-[3/4] flex-1 rounded-xl overflow-hidden shadow-lg" ref={productImageRef}>
          <Image src={selectedImage} alt={product.name} fill className="object-cover" />
        </div>
      </div>

      <div className="md:col-span-1 lg:col-span-2 flex flex-col">
        <h1 className="font-headline text-4xl md:text-5xl">{productName}</h1>
        <p className="font-bold text-3xl my-4">GH₵{product.price.toFixed(2)}</p>
        
        <div className="prose prose-sm dark:prose-invert text-muted-foreground">
          <p>{product.description || 'This is where a detailed product description would go. It would highlight the quality of the materials, the fit, and the story behind the design, connecting back to the G4L brand identity.'}</p>
        </div>

        <div className="mt-6 space-y-6">
          <div>
            <Label className="font-bold text-lg">Color</Label>
            <RadioGroup 
              onValueChange={setSelectedColor} 
              className="flex flex-wrap gap-3 mt-2"
            >
              {product.colors.map((color) => (
                <Label
                  key={color}
                  htmlFor={`color-${color}`}
                  className={cn(
                    "relative flex items-center justify-center rounded-full w-8 h-8 cursor-pointer transition-all",
                    selectedColor === color ? "ring-2 ring-primary ring-offset-2" : ""
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  <RadioGroupItem value={color} id={`color-${color}`} className="sr-only" />
                  {selectedColor === color && <Check className="h-4 w-4 text-primary-foreground" />}
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label className="font-bold text-lg">Size</Label>
            <RadioGroup 
              onValueChange={setSelectedSize} 
              className="flex flex-wrap gap-2 mt-2"
            >
              {product.sizes.map((size) => (
                <Label
                  key={size}
                  htmlFor={`size-${size}`}
                  className={cn(
                    "flex items-center justify-center rounded-md border-2 px-4 py-2 text-sm font-medium cursor-pointer transition-colors",
                    selectedSize === size ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                  )}
                >
                  <RadioGroupItem value={size} id={`size-${size}`} className="sr-only" />
                  {size}
                </Label>
              ))}
            </RadioGroup>
          </div>
          
          <div>
            <Label className="font-bold text-lg" htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-24 mt-2"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-8">
            <Button size="lg" className="w-full text-lg font-bold" disabled={!selectedSize || !selectedColor} onClick={handleAddToCart}>
                {!selectedSize || !selectedColor ? 'Select options' : 'Add to Bag'}
            </Button>
            <Button size="lg" variant="outline" className="px-4" onClick={handleWishlistToggle} aria-label="Toggle Wishlist">
                <Heart className={cn("h-6 w-6", isProductInWishlist && "fill-destructive text-destructive")} />
            </Button>
        </div>

        <p className="text-sm text-muted-foreground mt-4">
            {product.stock > 0 ? `${product.stock} items in stock` : 'Out of stock'}
        </p>
      </div>
    </div>
  );
}
