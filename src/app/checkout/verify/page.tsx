
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { verifyPaystackTransaction, handleOrderConfirmation } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { ref, get, update } from 'firebase/database';
import type { Order } from '@/types';


function VerifyComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment, please wait...');

  useEffect(() => {
    // Wait until we know the auth state
    if (isAuthLoading) {
      return;
    }

    const reference = searchParams.get('reference');
    const orderId = searchParams.get('orderId');

    // Now that auth is loaded, we can safely check for user
    if (!reference || !orderId || !user) {
      setStatus('error');
      setMessage('Invalid verification link or you are not logged in. Please contact support.');
      return;
    }
    
    if (!db) {
        setStatus('error');
        setMessage('Database connection is not available. Please contact support.');
        return;
    }

    const verify = async () => {
      try {
        const verificationResult = await verifyPaystackTransaction(reference);

        if (verificationResult.success) {
          // Logic to update DB now happens on the client, which is authenticated.
          const orderRef = ref(db, `orders/${user.uid}/${orderId}`);
          const snapshot = await get(orderRef);

          if (!snapshot.exists()) {
            throw new Error('Could not find your order details. Please contact support.');
          }

          const order: Order = snapshot.val();
          
          await update(orderRef, { status: 'processing', paystackReference: reference });
          
          order.status = 'processing';
          order.paystackReference = reference;
            
          // Send confirmation emails after successful payment and DB update
          handleOrderConfirmation(order).catch(emailError => {
            console.error("Failed to send emails in background:", emailError);
          });

          setStatus('success');
          setMessage('Payment successful! Your order is confirmed.');
          
          setTimeout(() => {
            router.replace('/thank-you');
          }, 3000);

        } else {
          throw new Error(verificationResult.error || 'Payment verification failed. Please contact support.');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
      }
    };

    verify();
  }, [searchParams, router, user, isAuthLoading]);
  
  const StatusIcon = {
    loading: <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />,
    success: <CheckCircle className="h-12 w-12 text-green-500" />,
    error: <AlertCircle className="h-12 w-12 text-destructive" />,
  }[status];

  return (
    <div className="flex flex-col items-center justify-center text-center">
      {StatusIcon}
      <h1 className="text-2xl font-headline mt-6">{
        {loading: 'Verifying Payment', success: 'Payment Confirmed', error: 'Payment Issue'}[status]
      }</h1>
      <p className="mt-2 text-muted-foreground max-w-md">{message}</p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
      <Suspense fallback={<Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />}>
        <VerifyComponent />
      </Suspense>
    </div>
  );
}
