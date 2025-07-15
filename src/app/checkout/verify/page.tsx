
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { verifyPaystackTransaction, handleOrderConfirmation } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { ref, get, update } from 'firebase/database';
import type { Order } from '@/types';
import { Button } from '@/components/ui/button';


function VerifyComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment, please wait...');
  const [hasAttemptedVerification, setHasAttemptedVerification] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    const reference = searchParams.get('reference');
    const orderId = searchParams.get('orderId');

    // Check for required parameters first
    if (!reference || !orderId) {
      setStatus('error');
      setMessage('Invalid verification link. Missing payment reference or order ID.');
      return;
    }

    // If auth is still loading, show loading state
    if (isAuthLoading) {
      setMessage('Authenticating user, please wait...');
      return;
    }

    // If no user after auth loading is complete, wait a bit more or show error
    if (!user) {
      // Give it a bit more time for auth to complete (up to 10 seconds total)
      if (retryCount < 5) {
        setRetryCount(prev => prev + 1);
        setMessage(`Waiting for authentication... (${retryCount + 1}/5)`);
        setTimeout(() => {
          // This will trigger the useEffect again
        }, 2000);
        return;
      }

      setStatus('error');
      setMessage('Authentication required. Please log in and try again, or contact support if you were already logged in.');
      return;
    }

    if (!db) {
      setStatus('error');
      setMessage('Database connection is not available. Please contact support.');
      return;
    }

    // Prevent multiple verification attempts
    if (hasAttemptedVerification) {
      return;
    }

    const verify = async () => {
      setHasAttemptedVerification(true);
      setMessage('Verifying payment with Paystack...');

      try {
        console.log('Starting payment verification for reference:', reference);
        const verificationResult = await verifyPaystackTransaction(reference);

        if (verificationResult.success) {
          setMessage('Payment verified! Updating your order...');

          // Logic to update DB now happens on the client, which is authenticated.
          const orderRef = ref(db, `orders/${user.uid}/${orderId}`);
          const snapshot = await get(orderRef);

          if (!snapshot.exists()) {
            throw new Error('Could not find your order details. Please contact support.');
          }

          const order: Order = snapshot.val();

          setMessage('Confirming your order...');
          await update(orderRef, { status: 'processing', paystackReference: reference });

          order.status = 'processing';
          order.paystackReference = reference;

          // Send confirmation emails after successful payment and DB update
          setMessage('Sending confirmation emails...');
          handleOrderConfirmation(order).catch(emailError => {
            console.error("Failed to send emails in background:", emailError);
          });

          setStatus('success');
          setMessage('Payment successful! Your order is confirmed. Redirecting...');

          setTimeout(() => {
            router.replace('/thank-you');
          }, 2000);

        } else {
          // If verification failed and we haven't exceeded retry limit, try again
          if (retryCount < maxRetries) {
            setRetryCount(prev => prev + 1);
            setHasAttemptedVerification(false);
            setMessage(`Payment verification failed. Retrying... (${retryCount + 1}/${maxRetries})`);
            setTimeout(() => {
              // This will trigger the useEffect again
            }, 2000);
            return;
          }
          throw new Error(verificationResult.error || 'Payment verification failed after multiple attempts. Please contact support.');
        }
      } catch (err) {
        console.error('Payment verification error:', err);

        // If it's a network error and we haven't exceeded retry limit, try again
        if (retryCount < maxRetries && (err instanceof Error && err.message.includes('fetch'))) {
          setRetryCount(prev => prev + 1);
          setHasAttemptedVerification(false);
          setMessage(`Connection error. Retrying... (${retryCount + 1}/${maxRetries})`);
          setTimeout(() => {
            // This will trigger the useEffect again
          }, 2000);
          return;
        }

        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
      }
    };

    verify();
  }, [searchParams, router, user, isAuthLoading, hasAttemptedVerification, retryCount]);
  
  const handleManualRetry = () => {
    setStatus('loading');
    setMessage('Retrying payment verification...');
    setHasAttemptedVerification(false);
    setRetryCount(0);
  };

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

      {status === 'error' && retryCount >= maxRetries && (
        <div className="mt-6 space-y-3">
          <Button
            onClick={handleManualRetry}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <p className="text-sm text-muted-foreground">
            If the issue persists, please contact support with your payment reference.
          </p>
        </div>
      )}
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
