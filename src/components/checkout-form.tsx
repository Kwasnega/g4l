
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/hooks/use-cart";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CartDisplayItem, Order } from "@/types";
import { getProductById } from "@/lib/data";
import Image from "next/image";
import { Separator } from "./ui/separator";
import { Info, Loader2, PackageCheck } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { ref, push, set } from "firebase/database";
import { initializePaystackTransaction } from "@/lib/actions";

const checkoutSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Please enter a valid phone number."),
  address: z.string().min(10, "Please enter a complete address."),
  deliveryMethod: z.enum(["bolt", "yango"], {
    required_error: "You need to select a delivery method.",
  }),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export function CheckoutForm() {
  const router = useRouter();
  const { items, isInitialized } = useCart();
  const { user, isFirebaseConfigured, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [displayItems, setDisplayItems] = useState<CartDisplayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      address: "",
      deliveryMethod: "bolt",
    },
  });

  useEffect(() => {
    if (user?.email) {
      form.setValue("email", user.email, { shouldValidate: true });
    }
    if (user?.displayName) {
      form.setValue("fullName", user.displayName, { shouldValidate: true });
    }
  }, [user, form]);

  useEffect(() => {
    if (isInitialized) {
      if (items.length === 0) {
        // This was the cause of the redirect bug. Now it's safe to just return.
        // It prevents fetching products for an empty cart.
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
  }, [items, isInitialized, router]);

  const subtotal = displayItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const shippingFee = 0; // Free shipping
  const total = subtotal + shippingFee;

  async function onSubmit(data: CheckoutFormValues) {
    if (!user || !db) {
      toast({ variant: "destructive", title: "Error", description: "Could not place order. Please make sure you are logged in." });
      return;
    }

    setIsSubmitting(true);
    try {
      const userOrdersRef = ref(db, `orders/${user.uid}`);
      const newOrderRef = push(userOrdersRef);
      const orderId = newOrderRef.key;

      if (!orderId) {
        throw new Error('Failed to generate a new order ID.');
      }
      
      const orderData: Order = {
        id: orderId,
        userId: user.uid,
        name: data.fullName,
        email: data.email,
        phone: data.phone,
        items: displayItems.map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            price: item.product.price,
            imageUrl: item.product.images[0] || '',
        })),
        total,
        deliveryMethod: data.deliveryMethod,
        paymentMethod: 'paystack',
        address: data.address,
        status: 'pending payment',
        placedAt: new Date().toISOString(),
      };
      
      const callbackUrl = `${window.location.origin}/checkout/verify?orderId=${orderId}`;
      const paystackResponse = await initializePaystackTransaction(data.email, total, callbackUrl);

      if (paystackResponse.success && paystackResponse.url) {
        // Only set order in DB if Paystack initialization is successful
        await set(newOrderRef, { ...orderData, paystackReference: paystackResponse.reference });
        window.location.href = paystackResponse.url;
      } else {
        toast({
          variant: "destructive",
          title: "Payment Initialization Failed",
          description: paystackResponse.error || "An unknown error occurred. Please try again.",
        });
        setIsSubmitting(false);
      }

    } catch (error: any) {
        console.error("Failed to place order:", error);
        toast({
            variant: "destructive",
            title: "Order Failed",
            description: error.message || "An unexpected error occurred. Please try again.",
        });
        setIsSubmitting(false);
    }
  }

  if (isAuthLoading || (isFirebaseConfigured && !isInitialized)) {
    return <CheckoutFormSkeleton />;
  }

  if (isFirebaseConfigured && !user) {
    return (
        <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Please Log In</AlertTitle>
            <AlertDescription>
                You need to be logged in to place an order. Please use the account icon in the header to log in or create an account.
            </AlertDescription>
        </Alert>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-12">
      <div className="md:col-span-1">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Delivery Information</h2>
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email for Confirmation</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="024 123 4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Your street, building, and apartment number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Delivery Method</h2>
                <FormField
                  control={form.control}
                  name="deliveryMethod"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="bolt" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Bolt Delivery
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="yango" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Yango Delivery
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <div className="p-4 border rounded-lg bg-muted/50">
              <h2 className="text-xl font-semibold mb-2">Payment</h2>
              <p className="text-sm text-muted-foreground">You will be redirected to Paystack to complete your payment securely.</p>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PackageCheck className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? "Initiating Payment..." : `Proceed to Pay GH₵${total.toFixed(2)}`}
            </Button>
          </form>
        </Form>
      </div>

      <div className="md:col-span-1">
        <div className="p-6 border rounded-lg sticky top-24">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            {isLoading ? (
               <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
               </div>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                  {displayItems.map(item => (
                      <div key={`${item.product.id}-${item.size}-${item.color}`} className="flex items-start gap-4 text-sm">
                          <Image src={item.product.images[0]} alt={item.product.name} width={64} height={85} className="rounded-md object-cover" />
                          <div className="flex-1">
                              <p className="font-semibold">G4L {item.product.name}</p>
                              <p className="text-muted-foreground">Size: {item.size}</p>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                  <span>Color:</span>
                                  <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: item.color }} />
                              </div>
                              <p className="text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-medium">GH₵{(item.product.price * item.quantity).toFixed(2)}</p>
                      </div>
                  ))}
              </div>
            )}
            <Separator className="my-4" />
            <div className="space-y-2">
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>GH₵{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="font-semibold text-green-600">Free</span>
                </div>
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>GH₵{total.toFixed(2)}</span>
            </div>
        </div>
      </div>
    </div>
  );
}

export function CheckoutFormSkeleton() {
  return (
    <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-8">
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-12 w-full" />
        </div>
        <div>
            <Skeleton className="h-96 w-full" />
        </div>
    </div>
  )
}
