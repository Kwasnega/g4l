
import { CheckoutForm, CheckoutFormSkeleton } from "@/components/checkout-form";
import { Suspense } from "react";

export default function CheckoutPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <h1 className="text-3xl md:text-4xl font-headline text-center mb-8">Checkout</h1>
      <Suspense fallback={<CheckoutFormSkeleton />}>
        <CheckoutForm />
      </Suspense>
    </div>
  );
}
