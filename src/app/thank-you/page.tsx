
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import type { Order } from '@/types';
import { db } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, ShieldCheck, ShoppingBag, Download } from 'lucide-react';
import dynamic from 'next/dynamic';
import { getCertificateUrl } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/use-cart';

const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

export default function ThankYouPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const { clearCart } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [progress, setProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [isCertLoading, setIsCertLoading] = useState(true);
  const [tagline, setTagline] = useState('');

  useEffect(() => {
    clearCart();

    const taglines = [
      '“Built by hustle. Worn by greatness.”',
      '“Greatness isn\'t given, it\'s worn.”',
      '“The uniform for your ambition.”',
      '“Wear the legacy. Embody the greatness.”',
      '“Crafted for the driven. Destined for greatness.”',
    ];
    setTagline(taglines[Math.floor(Math.random() * taglines.length)]);

    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [clearCart]);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user || !db) {
      setIsLoading(false);
      return;
    }

    const fetchLatestOrder = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const ordersRef = ref(db, `orders/${user.uid}`);
        const snapshot = await get(ordersRef);

        if (snapshot.exists()) {
          const ordersData = snapshot.val();
          const ordersArray: Order[] = Object.values(ordersData);
          const sortedOrders = ordersArray.sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
          setOrder(sortedOrders[0]);
        } else {
          setOrder(null);
        }
      } catch (err) {
        console.error("Failed to fetch order:", err);
        setError("There was a problem fetching your order details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestOrder();
  }, [user, isAuthLoading]);
  
  useEffect(() => {
    // Only run the celebration animation if we have a confirmed order.
    if (!order || isLoading) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 8000);
          return 100;
        }
        return prev + 4;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [order, isLoading]);


  useEffect(() => {
    if (!order) return;

    let attempts = 0;
    const maxAttempts = 5;
    const pollInterval = 3000; // 3 seconds

    const pollForCertificate = async () => {
      if (attempts >= maxAttempts) {
        setIsCertLoading(false);
        toast({
            title: "Certificate Is On Its Way",
            description: "Your certificate is being created and will be emailed to you shortly.",
            duration: 5000,
        });
        return;
      }
      
      attempts++;
      try {
        const url = await getCertificateUrl(order.id);
        if (url) {
          setCertificateUrl(url);
          setIsCertLoading(false);
        } else {
          setTimeout(pollForCertificate, pollInterval);
        }
      } catch (err) {
         console.error("An unexpected error occurred while fetching the certificate:", err);
         setIsCertLoading(false);
      }
    };

    pollForCertificate();
  }, [order, toast]);
  
  const renderCertificateButton = () => {
    if (isCertLoading) {
      return (
        <Button disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating Certificate...
        </Button>
      );
    }

    if (certificateUrl) {
      return (
        <Button asChild>
          <a href={certificateUrl} download={`G4L-Certificate-${order.id.substring(0, 8)}.pdf`}>
            <Download className="mr-2 h-4 w-4" />
            Download Certificate
          </a>
        </Button>
      );
    }
    
    return null; // Button disappears if polling fails, user relies on email.
  }

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center p-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Finding your latest order...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center p-4 text-center">
        <p className="text-destructive text-center">{error}</p>
      </div>
    );
  }

  // Handle case where user lands here but has no recent, valid order
  if (!order) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center p-4 text-center">
        <div className="w-full max-w-md mx-auto">
           <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
           <h1 className="text-3xl font-headline">No recent order found.</h1>
           <p className="text-muted-foreground mt-2">Ready to find your next great piece?</p>
           <Button asChild className="mt-6">
             <Link href="/">Return to Shop</Link>
           </Button>
        </div>
      </div>
    );
  }

  // If we have an order, render the celebration
  return (
    <>
      {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} />}
      <div className="flex min-h-[80vh] flex-col items-center justify-center p-4 text-center">
        <div className="w-full max-w-2xl mx-auto">
          {progress < 100 ? (
            <div className="w-full max-w-sm mx-auto flex flex-col items-center">
              <div className="font-headline text-5xl md:text-6xl text-white animate-pulse-glow mb-4">G4L</div>
              <p className="text-lg font-semibold mb-2">Finalizing your order...</p>
              <Progress value={progress} className="w-full h-2" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 animate-fade-in-down">
                <div className="font-headline text-5xl md:text-6xl text-white animate-pulse-glow">G4L</div>
                
                <h1 className="text-3xl md:text-4xl font-headline tracking-wider flex items-center gap-2">
                    ORDER CONFIRMED <ShieldCheck className="h-8 w-8 text-green-500" />
                </h1>
                <p className="text-muted-foreground max-w-md">
                    Your greatness is on the way. Expect delivery in 1-2 days.
                </p>

                <div className="my-6 w-full">
                  <div className="text-center">
                      <p className="font-semibold">Thank you, {order.name}!</p>
                      <p className="text-sm text-muted-foreground font-mono">
                          Order #{order.id.substring(0, 8).toUpperCase()}
                      </p>
                  </div>

                  <div className="w-full max-w-md mx-auto my-6">
                      <h3 className="text-center font-semibold mb-3 flex items-center justify-center gap-2"><ShoppingBag className="h-5 w-5" /> Items Ordered</h3>
                      <div className="space-y-3 max-h-48 overflow-y-auto rounded-lg bg-muted/50 p-4 border">
                      {order.items.map((item, index) => (
                          <div key={`${item.productId}-${index}`} className="flex items-center gap-4 text-sm">
                          <Image 
                              src={item.imageUrl} 
                              alt={item.productName} 
                              width={48} 
                              height={64}
                              className="w-12 h-16 bg-muted rounded-md object-cover border" 
                          />
                          <div className="flex-1">
                              <p className="font-semibold leading-tight">G4L {item.productName}</p>
                              <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-medium">GH₵{(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                      ))}
                      </div>
                  </div>
                </div>

                {tagline && (
                    <p className="font-semibold italic text-lg tracking-wide">
                        {tagline}
                    </p>
                )}
                
                <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                  <Button asChild size="lg">
                      <Link href="/">Return to Shop</Link>
                  </Button>
                  {renderCertificateButton()}
                </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
