
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import type { Order } from '@/types';
import { Loader2, Package, AlertCircle, Terminal } from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { db } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

export default function OrdersPage() {
  const { user, isLoading: isAuthLoading, isFirebaseConfigured } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfigError, setIsConfigError] = useState(false);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isFirebaseConfigured || !user || !db) {
      setIsLoading(false);
      return;
    }

    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);
      setIsConfigError(false);
      try {
        const ordersRef = ref(db, `orders/${user.uid}`);
        const snapshot = await get(ordersRef);

        if (snapshot.exists()) {
            const ordersData = snapshot.val();
            const ordersArray: Order[] = Object.values(ordersData);
            const sortedOrders = ordersArray.sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
            setOrders(sortedOrders);
        } else {
            setOrders([]);
        }

      } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load your orders. Please try again later.';
        
        if (err instanceof Error && err.message.includes('permission_denied')) {
             setError('Permission Denied. Please check your Realtime Database security rules.');
        } else if (err instanceof Error && (err.message.includes('Missing or insufficient permissions') || err.message.includes('Service Account'))) {
            setIsConfigError(true);
        }
        else {
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user, isAuthLoading, isFirebaseConfigured]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center items-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isFirebaseConfigured || isConfigError) {
    return (
       <div className="container mx-auto px-4 py-16 text-center">
        <Alert variant="destructive" className="max-w-2xl mx-auto text-left">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Database Not Configured</AlertTitle>
          <AlertDescription>
            <p>The application cannot connect to the Realtime Database.</p>
            <p className="mt-2">Please verify the following in your Firebase project:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>You have created a Realtime Database in your Firebase project console.</li>
              <li>The <code>NEXT_PUBLIC_FIREBASE_DATABASE_URL</code> in your <code>.env</code> file is set correctly.</li>
              <li>Your Realtime Database security rules are correct (check the "Rules" tab).</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="text-3xl font-headline mt-4">Access Denied</h1>
        <p className="text-muted-foreground mt-2">
          Please log in to view your order history.
        </p>
      </div>
    );
  }
  
  if (error) {
     return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Alert variant="destructive" className="max-w-3xl mx-auto text-left">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Something Went Wrong</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-headline mb-2">My Orders</h1>
        <p className="text-muted-foreground mb-8">
            Check the status of your recent orders and view details.
        </p>
        
        {orders.length === 0 ? (
           <Card>
            <CardContent className="p-8 text-center flex flex-col items-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="font-semibold text-lg">No orders yet</p>
              <p className="text-muted-foreground mt-1 mb-6">You haven't placed any orders with us yet.</p>
              <Button asChild>
                <Link href="/">Start Shopping</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
            <Accordion type="single" collapsible className="w-full space-y-4">
                {orders.map(order => (
                     <AccordionItem value={order.id} key={order.id} className="border-b-0 rounded-lg bg-card shadow-sm">
                        <AccordionTrigger className="p-4 md:p-6 hover:no-underline">
                             <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 text-left w-full">
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Order ID</p>
                                    <p className="font-mono text-sm">{order.id}</p>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Date</p>
                                    <p className="font-semibold">{format(new Date(order.placedAt), 'MMMM d, yyyy')}</p>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total</p>
                                    <p className="font-bold text-lg">GH₵{order.total.toFixed(2)}</p>

                                </div>
                               <div className="md:flex-none mt-2 md:mt-0">
                                 <Badge variant={order.status === 'pending' ? 'secondary' : 'default'} className="capitalize">{order.status}</Badge>
                               </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                            <Separator className="mb-6" />
                            <h4 className="font-semibold mb-4 text-base">Items in this order</h4>
                            <div className="space-y-4">
                                {order.items.map((item, index) => (
                                    <div key={`${item.productId}-${index}`} className="flex items-start gap-4">
                                         <Image 
                                            src={item.imageUrl} 
                                            alt={item.productName} 
                                            width={96} 
                                            height={128} 
                                            className="w-24 h-32 bg-muted rounded-md flex-shrink-0 object-cover border" 
                                          />
                                         <div className="flex-1">
                                            <p className="font-semibold">G4L {item.productName}</p>
                                            <p className="text-sm text-muted-foreground">Size: {item.size}</p>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span>Color:</span>
                                                <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: item.color }} />
                                            </div>
                                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                         </div>
                                         <p className="font-medium">GH₵{(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>
                        </AccordionContent>
                     </AccordionItem>
                ))}
            </Accordion>
        )}
      </div>
    </div>
  );
}
