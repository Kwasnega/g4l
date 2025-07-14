
"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types";
import { useCart } from "@/hooks/use-cart";
import { getProductById } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type CartDisplayItem = {
  product: Product;
  quantity: number;
  size: string;
  color: string;
};

export default function CartPage() {
  const { items, isInitialized, updateItemQuantity, removeItem } = useCart();
  const [displayItems, setDisplayItems] = useState<CartDisplayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isInitialized) {
      if (items.length === 0) {
        setDisplayItems([]);
        setIsLoading(false);
        return;
      }

      const fetchProducts = async () => {
        setIsLoading(true);
        const productPromises = items.map(async (item) => {
          const product = await getProductById(item.productId);
          return product ? { product, quantity: item.quantity, size: item.size, color: item.color } : null;
        });
        const resolvedItems = await Promise.all(productPromises);
        setDisplayItems(resolvedItems.filter((i): i is CartDisplayItem => i !== null));
        setIsLoading(false);
      };
      fetchProducts();
    }
  }, [items, isInitialized]);
  
  const subtotal = displayItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  if (isInitialized && !isLoading && displayItems.length === 0) {
    return (
       <div className="container mx-auto px-4 py-16 text-center">
         <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground" />
         <h1 className="text-3xl font-headline mt-4">Your Bag is Empty</h1>
         <p className="text-muted-foreground mt-2">Looks like you haven't added anything to your bag yet.</p>
         <Button asChild className="mt-6">
           <Link href="/">Continue Shopping</Link>
         </Button>
       </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <h1 className="text-3xl md:text-4xl font-headline text-center mb-8">My Bag</h1>
      {isLoading || !isInitialized ? (
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
                <Skeleton className="h-36 w-full rounded-lg" />
                <Skeleton className="h-36 w-full rounded-lg" />
            </div>
            <div className="md:col-span-1">
                <Skeleton className="h-64 w-full rounded-lg" />
            </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            {displayItems.map(item => (
              <div key={`${item.product.id}-${item.size}-${item.color}`} className="flex items-start gap-4 p-4 border rounded-lg">
                <Image src={item.product.images[0]} alt={item.product.name} width={100} height={133} className="rounded-md object-cover" />
                <div className="flex-1">
                  <Link href={`/products/${item.product.id}`} className="font-semibold hover:underline">G4L {item.product.name}</Link>
                  <p className="text-sm text-muted-foreground">Size: {item.size}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Color:</span>
                    <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: item.color }} />
                  </div>
                  <p className="font-bold mt-1">GH₵{item.product.price.toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Input 
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(item.product.id, item.size, item.color, parseInt(e.target.value, 10))}
                      className="w-20 h-9"
                      aria-label="Quantity"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.product.id, item.size, item.color)} aria-label="Remove item">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="font-bold">GH₵{(item.product.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="md:col-span-1">
            <div className="p-6 border rounded-lg sticky top-24">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>GH₵{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-muted-foreground">Free</span>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>GH₵{subtotal.toFixed(2)}</span>
              </div>
              <Button size="lg" className="w-full mt-6" asChild>
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
