"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ref, get, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { Order, OrderItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, User, Mail, Phone, MapPin, Calendar, DollarSign, Package, ShoppingCart, CreditCard, Truck, XCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default function AdminOrderDetailPage() {
  const { user, loading: authLoading, isAuthenticated, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [fetchingOrder, setFetchingOrder] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract orderId from the URL pathname
  const orderId = pathname.split('/').pop();

  // Authentication and Authorization Logic
  useEffect(() => {
    if (!authLoading && isFirebaseConfigured) {
      if (!isAuthenticated) {
        console.log("AdminOrderDetailPage: Not authenticated, redirecting to /admin/login");
        router.replace('/admin/login');
        setCheckingAuth(false);
      } else {
        const checkAdminStatus = async () => {
          if (!db || !user?.uid) {
            console.error("AdminOrderDetailPage: Firebase DB or user UID not available for admin check.");
            setIsAdmin(false);
            router.replace('/');
            setCheckingAuth(false);
            return;
          }

          try {
            const adminUsersRef = ref(db, 'adminUsers');
            const snapshot = await get(adminUsersRef);

            if (snapshot.exists()) {
              const adminUids: Record<string, boolean> = snapshot.val();
              if (user.uid in adminUids && adminUids[user.uid] === true) {
                setIsAdmin(true);
                console.log("AdminOrderDetailPage: User is authorized admin.");
              } else {
                setIsAdmin(false);
                console.log("AdminOrderDetailPage: User UID not found in adminUsers or not authorized, redirecting to /");
                router.replace('/');
              }
            } else {
              console.log("AdminOrderDetailPage: 'adminUsers' node does not exist in Firebase. No admins configured.");
              setIsAdmin(false);
              router.replace('/');
            }
          } catch (error) {
            console.error("AdminOrderDetailPage: Error checking admin status from Firebase:", error);
            setIsAdmin(false);
            router.replace('/');
          } finally {
            setCheckingAuth(false);
          }
        };

        checkAdminStatus();
      }
    } else if (!isFirebaseConfigured && !authLoading) {
        console.error("AdminOrderDetailPage: Firebase is not configured. Admin access disabled.");
        router.replace('/');
        setCheckingAuth(false);
    }
  }, [authLoading, isAuthenticated, user, isFirebaseConfigured, router]);

  // Fetch Order Details Logic
  useEffect(() => {
    if (isAdmin && isFirebaseConfigured && db && orderId) {
      setFetchingOrder(true);
      setError(null);
      const fetchOrder = async () => {
        try {
          const ordersRef = ref(db, 'orders');
          const snapshot = await get(ordersRef);
          let foundOrder: Order | null = null;

          if (snapshot.exists()) {
            const ordersByUsers: Record<string, Record<string, Order>> = snapshot.val();
            for (const userId in ordersByUsers) {
              if (ordersByUsers.hasOwnProperty(userId)) {
                const userOrders = ordersByUsers[userId];
                for (const id in userOrders) {
                  if (userOrders.hasOwnProperty(id) && id === orderId) {
                    foundOrder = userOrders[id];
                    break;
                  }
                }
              }
              if (foundOrder) break;
            }
          }

          if (foundOrder) {
            setOrder(foundOrder);
          } else {
            setError("Order not found or you don't have access.");
            setOrder(null);
          }
        } catch (err: any) {
          console.error("Error fetching order details:", err);
          setError(`Failed to load order details: ${err.message}`);
          setOrder(null);
        } finally {
          setFetchingOrder(false);
        }
      };
      fetchOrder();
    } else if (isAdmin && !orderId) {
      setError("No Order ID provided in the URL.");
      setFetchingOrder(false);
    }
  }, [isAdmin, isFirebaseConfigured, db, orderId]);

  // Function to update order status (can be used here too)
  const handleUpdateOrderStatus = async (newStatus: string) => {
    if (!db || !user?.uid || !order) {
      console.error("Firebase DB, user UID, or order not available for status update.");
      return;
    }

    try {
      const orderPath = `orders/${order.userId}/${order.id}`;
      const orderRef = ref(db, orderPath);

      await update(orderRef, { status: newStatus });

      setOrder(prevOrder => prevOrder ? { ...prevOrder, status: newStatus } : null);
      console.log(`Order ${order.id} status updated to ${newStatus}`);
    } catch (err) {
      console.error(`Failed to update status for order ${order.id}:`, err);
    }
  };

  if (authLoading || checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-300">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="ml-4 text-xl">Verifying Admin Access to Order Details...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (fetchingOrder) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-300">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="ml-4 text-xl">Loading Order Details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-800 text-red-400 p-8 flex flex-col items-center justify-center">
        <XCircle className="h-20 w-20 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Error Loading Order</h1>
        <p className="text-lg text-gray-300">{error}</p>
        <Button asChild className="mt-8 bg-blue-600 hover:bg-blue-700 text-white">
          <Link href="/admin/orders">Back to Orders</Link>
        </Button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-800 text-gray-300 p-8 flex flex-col items-center justify-center">
        <XCircle className="h-20 w-20 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Order Not Found</h1>
        <p className="text-lg">The requested order could not be found.</p>
        <Button asChild className="mt-8 bg-blue-600 hover:bg-blue-700 text-white">
          <Link href="/admin/orders">Back to Orders</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-800 text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-blue-700/30">
          <h1 className="text-4xl font-bold tracking-tight text-blue-400 flex items-center">
            <Package className="h-10 w-10 mr-3 text-blue-500 animate-pulse" />
            Order Details: <span className="ml-2 text-white">{order.id.substring(0, 8)}...</span>
          </h1>
          <Button asChild variant="ghost" className="text-gray-400 hover:text-blue-300 hover:bg-gray-800 transition-colors duration-200">
            <Link href="/admin/orders">
              <ArrowLeft className="h-5 w-5 mr-2" /> Back to Orders
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-1 bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl">
            <CardHeader className="border-b border-blue-700/20 pb-4">
              <CardTitle className="text-xl text-blue-400 flex items-center">
                <DollarSign className="h-6 w-6 mr-2 text-green-500" /> Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid gap-4 text-gray-300">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-gray-500" />
                <span className="font-semibold">Placed At:</span> {new Date(order.placedAt).toLocaleString()}
              </div>
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-gray-500" />
                <span className="font-semibold">Total:</span> <span className="text-green-400 font-bold text-lg">GH₵{order.total.toFixed(2)}</span>
              </div>
              <div className="flex items-center">
                <Badge
                  className={
                    order.status === 'processing'
                      ? 'bg-yellow-600 text-yellow-50'
                      : order.status === 'shipped'
                      ? 'bg-blue-600 text-blue-50'
                      : order.status === 'delivered'
                      ? 'bg-green-600 text-green-50'
                      : order.status === 'cancelled'
                      ? 'bg-red-600 text-red-50'
                      : order.status === 'refunded'
                      ? 'bg-purple-600 text-purple-50'
                      : 'bg-gray-600 text-gray-50'
                  }
                >
                  Status: {order.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="ml-auto bg-gray-700 hover:bg-gray-600 text-blue-300 border-blue-700/50">
                      Change Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-gray-800 border-blue-700/50 text-white">
                    {ORDER_STATUSES.map(status => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => handleUpdateOrderStatus(status)}
                        className="hover:bg-gray-700 cursor-pointer"
                      >
                        {status}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-gray-500" />
                <span className="font-semibold">Payment Method:</span> {order.paymentMethod}
              </div>
              {order.paystackReference && (
                <div className="flex items-center">
                  <span className="font-semibold text-gray-500 mr-2">Paystack Ref:</span> {order.paystackReference}
                </div>
              )}
              <div className="flex items-center">
                <Truck className="h-5 w-5 mr-2 text-gray-500" />
                <span className="font-semibold">Delivery Method:</span> {order.deliveryMethod}
              </div>
              {order.trackingNumber && (
                <div className="flex items-center">
                  <span className="font-semibold text-gray-500 mr-2">Tracking Number:</span> {order.trackingNumber}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1 bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl">
            <CardHeader className="border-b border-blue-700/20 pb-4">
              <CardTitle className="text-xl text-blue-400 flex items-center">
                <User className="h-6 w-6 mr-2 text-cyan-500" /> Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid gap-4 text-gray-300">
              <div className="flex items-center">
                <span className="font-semibold text-gray-500 mr-2">Name:</span> {order.name}
              </div>
              <div className="flex items-center">
                <Mail className="h-5 w-5 mr-2 text-gray-500" />
                <span className="font-semibold">Email:</span> {order.email}
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 mr-2 text-gray-500" />
                <span className="font-semibold">Phone:</span> {order.phone}
              </div>
              <div className="flex items-start">
                <MapPin className="h-5 w-5 mr-2 text-gray-500 mt-1" />
                <span className="font-semibold">Address:</span> <p className="ml-1">{order.address}</p>
              </div>
              <div className="flex items-center">
                <span className="font-semibold text-gray-500 mr-2">User ID:</span> {order.userId}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1 bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl">
            <CardHeader className="border-b border-blue-700/20 pb-4">
              <CardTitle className="text-xl text-blue-400 flex items-center">
                <ShoppingCart className="h-6 w-6 mr-2 text-orange-500" /> Order Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid gap-4 text-gray-300">
              {order.items.length > 0 ? (
                order.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between border-b border-gray-700/50 pb-2 last:border-b-0 last:pb-0">
                    <div className="flex items-center">
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.productName} className="h-10 w-10 object-cover rounded-md mr-3" onError={(e) => e.currentTarget.src = 'https://placehold.co/40x40?text=No+Image'} />
                      )}
                      <div>
                        <p className="font-semibold text-white">{item.productName}</p>
                        <p className="text-sm text-gray-400">
                          Qty: {item.quantity} | Size: {item.size} | Color: <span style={{ backgroundColor: item.color, display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', border: '1px solid #555' }}></span>
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-green-400">GH₵{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">No items found for this order.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
