"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Package, ShoppingCart, Loader2, LogOut, LayoutDashboard, Settings, Image as ImageIcon, TrendingUp, BarChart, PieChart } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ref, onValue, off, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import type { Product, Order } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';

export default function AdminDashboardPage() {
  const { user, loading, isAuthenticated, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [newOrdersToday, setNewOrdersToday] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [fetchingStats, setFetchingStats] = useState(true);

  const [ordersOverTimeData, setOrdersOverTimeData] = useState<any[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [fetchingChartData, setFetchingChartData] = useState(true);

  const PIE_COLORS = ['#FFBB28', '#00C49F', '#0088FE', '#FF8042', '#AF19FF', '#FF0000'];

  // Authentication and Authorization Logic
  useEffect(() => {
    if (!loading && isFirebaseConfigured) {
      if (!isAuthenticated) {
        console.log("AdminDashboardPage: Not authenticated, redirecting to /admin/login");
        router.replace('/admin/login');
        setCheckingAuth(false);
      } else {
        const checkAdminStatus = async () => {
          if (!db || !user?.uid) {
            console.error("AdminDashboardPage: Firebase DB or user UID not available for admin check.");
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
                console.log("AdminDashboardPage: User is authorized admin.");
              } else {
                setIsAdmin(false);
                console.log("AdminDashboardPage: User UID not found in adminUsers or not authorized, redirecting to /");
                router.replace('/');
              }
            } else {
              console.log("AdminDashboardPage: 'adminUsers' node does not exist in Firebase. No admins configured.");
              setIsAdmin(false);
              router.replace('/');
            }
          } catch (error) {
            console.error("AdminDashboardPage: Error checking admin status from Firebase:", error);
            setIsAdmin(false);
            router.replace('/');
          } finally {
            setCheckingAuth(false);
          }
        };

        checkAdminStatus();
      }
    } else if (!isFirebaseConfigured && !loading) {
        console.error("AdminDashboardPage: Firebase is not configured. Admin access disabled.");
        router.replace('/');
        setCheckingAuth(false);
    }
  }, [loading, isAuthenticated, user, isFirebaseConfigured, router]);

  // Real-time Data Fetching for Stats and Charts
  useEffect(() => {
    let unsubscribeOrders: (() => void) | undefined;
    let unsubscribeProducts: (() => void) | undefined;

    if (isAdmin && isFirebaseConfigured && db) {
      console.log("AdminDashboardPage: Setting up real-time listeners...");
      setFetchingStats(true);
      setFetchingChartData(true);

      // --- Listen for Real-time Product Changes ---
      const productsRef = ref(db, 'products/products');
      unsubscribeProducts = onValue(productsRef, (snapshot) => {
        console.log("AdminDashboardPage: Products data received!");
        const productsData: (Product | null)[] = snapshot.val() || [];
        const validProductsCount = productsData.filter(p => p !== null && p.id !== undefined).length;
        setTotalProducts(validProductsCount);
        console.log("Total Products:", validProductsCount);
        setFetchingStats(false);
      }, (error) => {
        console.error("AdminDashboardPage: Error listening to products:", error);
        setFetchingStats(false);
      });

      // --- Listen for Real-time Order Changes ---
      const ordersRef = ref(db, 'orders');
      unsubscribeOrders = onValue(ordersRef, (snapshot) => {
        console.log("AdminDashboardPage: Orders data received!");
        console.log("Raw Orders Snapshot Value:", snapshot.val());

        let revenue = 0;
        let ordersCount = 0;
        let todayOrders = 0;
        const allOrders: Order[] = [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (snapshot.exists()) {
          const ordersByUsers: Record<string, Record<string, Order>> = snapshot.val();
          for (const userId in ordersByUsers) {
            if (ordersByUsers.hasOwnProperty(userId)) {
              const userOrders = ordersByUsers[userId];
              for (const orderId in userOrders) {
                if (userOrders.hasOwnProperty(orderId)) {
                  const order = userOrders[orderId];
                  if (order && typeof order.total === 'number' && order.placedAt && order.status) {
                    revenue += order.total;
                    ordersCount++;
                    allOrders.push(order);

                    const orderDate = new Date(order.placedAt);
                    orderDate.setHours(0, 0, 0, 0);
                    if (orderDate.getTime() === today.getTime()) {
                      todayOrders++;
                    }
                  } else {
                    console.warn(`AdminDashboardPage: Skipping malformed order ${orderId} for user ${userId}:`, order);
                  }
                }
              }
            }
          }
        }
        console.log("Processed All Orders for Charting:", allOrders);
        setTotalRevenue(revenue);
        setTotalOrders(ordersCount);
        setNewOrdersToday(todayOrders);
        console.log("Calculated Stats - Revenue:", revenue, "Orders:", ordersCount, "Today's Orders:", todayOrders);


        // --- Prepare Orders Over Time Data (Last 30 Days) ---
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        
        const dailyOrders: { [key: string]: number } = {};
        allOrders.forEach(order => {
          const orderDate = new Date(order.placedAt);
          orderDate.setHours(0, 0, 0, 0);
          if (orderDate >= thirtyDaysAgo) {
            const dateKey = dateKeyFromDate(orderDate);
            dailyOrders[dateKey] = (dailyOrders[dateKey] || 0) + 1;
          }
        });

        const chartData = [];
        for (let i = 0; i < 30; i++) {
          const date = new Date(thirtyDaysAgo);
          date.setDate(thirtyDaysAgo.getDate() + i);
          const dateKey = dateKeyFromDate(date);
          chartData.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            orders: dailyOrders[dateKey] || 0,
          });
        }
        console.log("Orders Over Time Chart Data (last 30 days):", chartData);
        setOrdersOverTimeData(chartData);

        // --- Prepare Order Status Distribution Data ---
        const statusCounts: { [key: string]: number } = {};
        allOrders.forEach(order => {
          statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
        });

        const statusChartData = Object.keys(statusCounts).map(status => ({
          name: status.charAt(0).toUpperCase() + status.slice(1),
          value: statusCounts[status],
        }));
        console.log("Order Status Distribution Chart Data:", statusChartData);
        setOrderStatusData(statusChartData);
        setFetchingChartData(false);
      }, (error) => {
        console.error("AdminDashboardPage: Error listening to orders:", error);
        setFetchingChartData(false);
      });

      // Cleanup function to unsubscribe from listeners when component unmounts or dependencies change
      return () => {
        console.log("AdminDashboardPage: Cleaning up real-time listeners...");
        if (unsubscribeOrders) {
          off(ordersRef, 'value', unsubscribeOrders);
        }
        if (unsubscribeProducts) {
          off(productsRef, 'value', unsubscribeProducts);
        }
      };
    } else if (!isAdmin && !checkingAuth && !loading) {
      console.log("AdminDashboardPage: Not setting up listeners (not admin or Firebase not configured).");
      setFetchingStats(false);
      setFetchingChartData(false);
    }
  }, [isAdmin, isFirebaseConfigured, db, checkingAuth, loading]);

  const dateKeyFromDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
      router.replace('/admin/login');
    }
  };

  if (loading || checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-300">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="ml-4 text-xl">Accessing G4L Command Center...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-800 text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-blue-700/30">
          <h1 className="text-4xl font-bold tracking-tight text-blue-400 flex items-center">
            <LayoutDashboard className="h-10 w-10 mr-3 text-blue-500 animate-pulse" />
            G4L Admin Console
          </h1>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="text-red-400 hover:text-red-300 hover:bg-gray-800 transition-colors duration-200"
          >
            <LogOut className="h-5 w-5 mr-2" /> Log Out
          </Button>
        </div>

        {/* Dashboard Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-10">
          {fetchingStats ? (
            <>
              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl animate-pulse">
                <CardHeader><Skeleton className="h-4 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-8 w-3/4" /></CardContent>
              </Card>
              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl animate-pulse">
                <CardHeader><Skeleton className="h-4 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-8 w-3/4" /></CardContent>
              </Card>
              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl animate-pulse">
                <CardHeader><Skeleton className="h-4 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-8 w-3/4" /></CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-300">Total Revenue</CardTitle>
                  <ShoppingCart className="h-5 w-5 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div>
                    <div className="text-3xl font-bold text-white">GH₵{totalRevenue.toFixed(2)}</div>
                    <p className="text-xs text-gray-400 mt-1">
                      <span className="text-green-400">N/A</span> from last month (Requires historical data)
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-300">Total Orders</CardTitle>
                  <Package className="h-5 w-5 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div>
                    <div className="text-3xl font-bold text-white">+{totalOrders}</div>
                    <p className="text-xs text-gray-400 mt-1">
                      <span className="text-orange-400">+{newOrdersToday}</span> new orders today
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-300">Total Products</CardTitle>
                  <Eye className="h-5 w-5 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div>
                    <div className="text-3xl font-bold text-white">{totalProducts}</div>
                    <p className="text-xs text-gray-400 mt-1">
                      <span className="text-cyan-400">{totalProducts}</span> active listings
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2 mb-10">
          {fetchingChartData ? (
            <>
              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl animate-pulse">
                <CardHeader><Skeleton className="h-6 w-3/4 mb-4" /><Skeleton className="h-40 w-full" /></CardHeader>
              </Card>
              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl animate-pulse">
                <CardHeader><Skeleton className="h-6 w-3/4 mb-4" /><Skeleton className="h-40 w-full" /></CardHeader>
              </Card>
            </>
          ) : (
            <>
              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl">
                <CardHeader className="border-b border-blue-700/20 pb-4">
                  <CardTitle className="text-xl text-blue-400 flex items-center">
                    <TrendingUp className="h-6 w-6 mr-2 text-green-500" /> Orders Over Last 30 Days
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ordersOverTimeData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94A3B8" />
                      <YAxis stroke="#94A3B8" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #3B82F6', borderRadius: '8px', color: '#E2E8F0' }}
                        labelStyle={{ color: '#93C5FD' }}
                        itemStyle={{ color: '#E2E8F0' }}
                      />
                      <Legend wrapperStyle={{ color: '#94A3B8', paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} activeDot={{ r: 8 }} name="Orders Placed" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl">
                <CardHeader className="border-b border-blue-700/20 pb-4">
                  <CardTitle className="text-xl text-blue-400 flex items-center">
                    <PieChart className="h-6 w-6 mr-2 text-purple-500" /> Order Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 h-[300px] flex items-center justify-center">
                  {orderStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={orderStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {orderStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #3B82F6', borderRadius: '8px', color: '#E2E8F0' }}
                          labelStyle={{ color: '#93C5FD' }}
                          itemStyle={{ color: '#E2E8F0' }}
                        />
                        <Legend wrapperStyle={{ color: '#94A3B8', paddingTop: '10px' }} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-400">No order status data available.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Management Sections */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-blue-400 flex items-center">
                <Package className="h-6 w-6 mr-2 text-green-500" /> Order Management
              </CardTitle>
              <CardDescription className="text-gray-400 mt-1">Oversee all customer orders and their fulfillment.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full py-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold rounded-lg shadow-md">
                <Link href="/admin/orders">View Orders</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-blue-400 flex items-center">
                <ShoppingCart className="h-6 w-6 mr-2 text-yellow-500" /> Product Catalog
              </CardTitle>
              <CardDescription className="text-gray-400 mt-1">Add, modify, or remove products from your store.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold rounded-lg shadow-md">
                <Link href="/admin/products">Manage Products</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-blue-400 flex items-center">
                <ImageIcon className="h-6 w-6 mr-2 text-purple-500" /> Gallery & Content
              </CardTitle>
              <CardDescription className="text-gray-400 mt-1">Manage website images, slideshows, and static content.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg shadow-md">
                <Link href="/admin/gallery">Manage Gallery</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl md:col-span-2 lg:col-span-3">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-blue-400 flex items-center">
                <Settings className="h-6 w-6 mr-2 text-cyan-500" /> System Settings
              </CardTitle>
              <CardDescription className="text-gray-400 mt-1">Configure general website settings and user roles.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-lg shadow-md">
                <Link href="/admin/settings">Configure Settings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
