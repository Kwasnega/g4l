"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Package, ShoppingCart, Loader2, LogOut, LayoutDashboard, Settings, Image as ImageIcon, TrendingUp, BarChart, PieChart, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ref, onValue, off, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import type { Product, Order } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminHeader } from '@/components/admin-header';

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
  const [revenueOverTimeData, setRevenueOverTimeData] = useState<any[]>([]);
  const [productivityData, setProductivityData] = useState<any[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [fetchingChartData, setFetchingChartData] = useState(true);

  // Additional productivity metrics
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  // User account metrics
  const [totalUsers, setTotalUsers] = useState(0);
  const [newUsersToday, setNewUsersToday] = useState(0);
  const [userGrowthRate, setUserGrowthRate] = useState(0);
  const [userRegistrationData, setUserRegistrationData] = useState<any[]>([]);

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
    let unsubscribeUsers: (() => void) | undefined;

    if (isAdmin && isFirebaseConfigured && db) {
      console.log("AdminDashboardPage: Setting up real-time listeners...");
      setFetchingStats(true);
      setFetchingChartData(true);

      // --- Listen for Real-time Product Changes ---
      const productsRef = ref(db, 'products/products');
      unsubscribeProducts = onValue(productsRef, (snapshot) => {
        console.log("AdminDashboardPage: Products data received!");

        let validProductsCount = 0;
        if (snapshot.exists()) {
          const productsData = snapshot.val();

          // Handle both array and object formats
          if (Array.isArray(productsData)) {
            validProductsCount = productsData.filter(p => p !== null && p !== undefined && p.id !== undefined).length;
          } else if (typeof productsData === 'object' && productsData !== null) {
            const productsArray = Object.values(productsData);
            validProductsCount = productsArray.filter(p => p !== null && p !== undefined && (p as any)?.id !== undefined).length;
          }
        }

        setTotalProducts(validProductsCount);
        console.log("Total Products:", validProductsCount);
        setFetchingStats(false);
      }, (error) => {
        console.error("AdminDashboardPage: Error listening to products:", error);
        setFetchingStats(false);
      });

      // --- Listen for Real-time User Changes ---
      const usersRef = ref(db, 'users');
      unsubscribeUsers = onValue(usersRef, (snapshot) => {
        console.log("AdminDashboardPage: Users data received!");

        let totalUsersCount = 0;
        let todayUsersCount = 0;
        const allUsers: any[] = [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (snapshot.exists()) {
          const usersData: Record<string, any> = snapshot.val();

          for (const userId in usersData) {
            if (usersData.hasOwnProperty(userId)) {
              const user = usersData[userId];
              if (user && user.registeredAt) {
                totalUsersCount++;
                allUsers.push(user);

                const registrationDate = new Date(user.registeredAt);
                registrationDate.setHours(0, 0, 0, 0);
                if (registrationDate.getTime() === today.getTime()) {
                  todayUsersCount++;
                }
              }
            }
          }
        }

        setTotalUsers(totalUsersCount);
        setNewUsersToday(todayUsersCount);

        // Calculate user growth rate (last 7 days vs previous 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const lastWeekUsers = allUsers.filter(user => {
          const regDate = new Date(user.registeredAt);
          return regDate >= sevenDaysAgo;
        }).length;

        const previousWeekUsers = allUsers.filter(user => {
          const regDate = new Date(user.registeredAt);
          return regDate >= fourteenDaysAgo && regDate < sevenDaysAgo;
        }).length;

        const userGrowth = previousWeekUsers > 0 ? ((lastWeekUsers - previousWeekUsers) / previousWeekUsers) * 100 : 0;
        setUserGrowthRate(userGrowth);

        // Prepare user registration chart data (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const dailyRegistrations: { [key: string]: number } = {};
        allUsers.forEach(user => {
          const regDate = new Date(user.registeredAt);
          regDate.setHours(0, 0, 0, 0);
          if (regDate >= thirtyDaysAgo) {
            const dateKey = dateKeyFromDate(regDate);
            dailyRegistrations[dateKey] = (dailyRegistrations[dateKey] || 0) + 1;
          }
        });

        const userChartData = [];
        for (let i = 0; i < 30; i++) {
          const date = new Date(thirtyDaysAgo);
          date.setDate(thirtyDaysAgo.getDate() + i);
          const dateKey = dateKeyFromDate(date);
          const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          userChartData.push({
            date: formattedDate,
            registrations: dailyRegistrations[dateKey] || 0,
          });
        }

        setUserRegistrationData(userChartData);
        console.log("User Stats - Total:", totalUsersCount, "Today:", todayUsersCount, "Growth:", userGrowth.toFixed(1) + "%");
      }, (error) => {
        console.error("AdminDashboardPage: Error listening to users:", error);
        // Set default values when there's an error accessing user data
        setTotalUsers(0);
        setNewUsersToday(0);
        setUserGrowthRate(0);
        setUserRegistrationData([]);

        // Show a user-friendly message about Firebase permissions
        if ((error as any)?.code === 'PERMISSION_DENIED') {
          console.warn("User data access denied. Please update Firebase security rules to allow admin access to /users path.");
        }
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


        // --- Calculate Additional Productivity Metrics ---
        const avgOrderVal = ordersCount > 0 ? revenue / ordersCount : 0;
        setAvgOrderValue(avgOrderVal);

        // Calculate growth rate (last 7 days vs previous 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const lastWeekOrders = allOrders.filter(order => {
          const orderDate = new Date(order.placedAt);
          return orderDate >= sevenDaysAgo;
        }).length;

        const previousWeekOrders = allOrders.filter(order => {
          const orderDate = new Date(order.placedAt);
          return orderDate >= fourteenDaysAgo && orderDate < sevenDaysAgo;
        }).length;

        const growth = previousWeekOrders > 0 ? ((lastWeekOrders - previousWeekOrders) / previousWeekOrders) * 100 : 0;
        setGrowthRate(growth);

        // --- Prepare Enhanced Chart Data (Last 30 Days) ---
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const dailyOrders: { [key: string]: number } = {};
        const dailyRevenue: { [key: string]: number } = {};
        const dailyAvgOrder: { [key: string]: number } = {};

        allOrders.forEach(order => {
          const orderDate = new Date(order.placedAt);
          orderDate.setHours(0, 0, 0, 0);
          if (orderDate >= thirtyDaysAgo) {
            const dateKey = dateKeyFromDate(orderDate);
            dailyOrders[dateKey] = (dailyOrders[dateKey] || 0) + 1;
            dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + order.total;
          }
        });

        // Calculate daily average order values
        Object.keys(dailyOrders).forEach(dateKey => {
          dailyAvgOrder[dateKey] = dailyOrders[dateKey] > 0 ? dailyRevenue[dateKey] / dailyOrders[dateKey] : 0;
        });

        const chartData = [];
        const revenueChartData = [];
        const productivityChartData = [];

        for (let i = 0; i < 30; i++) {
          const date = new Date(thirtyDaysAgo);
          date.setDate(thirtyDaysAgo.getDate() + i);
          const dateKey = dateKeyFromDate(date);
          const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          chartData.push({
            date: formattedDate,
            orders: dailyOrders[dateKey] || 0,
          });

          revenueChartData.push({
            date: formattedDate,
            revenue: dailyRevenue[dateKey] || 0,
            orders: dailyOrders[dateKey] || 0,
          });

          productivityChartData.push({
            date: formattedDate,
            orders: dailyOrders[dateKey] || 0,
            revenue: dailyRevenue[dateKey] || 0,
            avgOrderValue: dailyAvgOrder[dateKey] || 0,
          });
        }

        console.log("Orders Over Time Chart Data (last 30 days):", chartData);
        console.log("Revenue Over Time Chart Data:", revenueChartData);
        console.log("Productivity Chart Data:", productivityChartData);

        setOrdersOverTimeData(chartData);
        setRevenueOverTimeData(revenueChartData);
        setProductivityData(productivityChartData);

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
          unsubscribeOrders();
        }
        if (unsubscribeProducts) {
          unsubscribeProducts();
        }
        if (unsubscribeUsers) {
          unsubscribeUsers();
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-800 text-gray-100 p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <AdminHeader
          title="Admin Console"
          subtitle="Manage your G4L store"
          icon={<LayoutDashboard className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 animate-pulse" />}
          showBackButton={false}
        />

        {/* Dashboard Stats - Mobile Optimized */}
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 mb-6 sm:mb-8 md:mb-10">
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
              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-lg sm:rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-blue-300 truncate">Total Revenue</CardTitle>
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400 flex-shrink-0" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">GH₵{totalRevenue.toFixed(2)}</div>
                    <p className="text-xs text-gray-400 mt-1 leading-tight">
                      <span className="text-green-400">N/A</span> from last month
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-lg sm:rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-blue-300 truncate">Total Orders</CardTitle>
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 flex-shrink-0" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">+{totalOrders}</div>
                    <p className="text-xs text-gray-400 mt-1 leading-tight">
                      <span className="text-orange-400">+{newOrdersToday}</span> new today
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-lg sm:rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-blue-300 truncate">Total Products</CardTitle>
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 flex-shrink-0" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{totalProducts}</div>
                    <p className="text-xs text-gray-400 mt-1 leading-tight">
                      <span className="text-cyan-400">{totalProducts}</span> active
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-lg sm:rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-blue-300 truncate">Avg Order Value</CardTitle>
                  <BarChart className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 flex-shrink-0" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">GH₵{avgOrderValue.toFixed(2)}</div>
                    <p className="text-xs text-gray-400 mt-1 leading-tight">
                      <span className="text-emerald-400">Per order</span> average
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-lg sm:rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-blue-300 truncate">Growth Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-pink-400 flex-shrink-0" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div>
                    <div className={`text-xl sm:text-2xl lg:text-3xl font-bold ${growthRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-gray-400 mt-1 leading-tight">
                      <span className={growthRate >= 0 ? 'text-green-400' : 'text-red-400'}>
                        Week over week
                      </span> change
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-lg sm:rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-blue-300 truncate">Total Users</CardTitle>
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400 flex-shrink-0" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{totalUsers}</div>
                    <p className="text-xs text-gray-400 mt-1 leading-tight">
                      <span className="text-indigo-400">+{newUsersToday}</span> new today
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-lg sm:rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-blue-300 truncate">User Growth</CardTitle>
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-violet-400 flex-shrink-0" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div>
                    <div className={`text-xl sm:text-2xl lg:text-3xl font-bold ${userGrowthRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {userGrowthRate >= 0 ? '+' : ''}{userGrowthRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-gray-400 mt-1 leading-tight">
                      <span className={userGrowthRate >= 0 ? 'text-green-400' : 'text-red-400'}>
                        User registrations
                      </span> growth
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts Section - Mobile Optimized */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 mb-6 sm:mb-8 md:mb-10 overflow-x-auto">
          {fetchingChartData ? (
            <>
              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl animate-pulse">
                <CardHeader><Skeleton className="h-6 w-3/4 mb-4" /><Skeleton className="h-40 w-full" /></CardHeader>
              </Card>
              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl animate-pulse">
                <CardHeader><Skeleton className="h-6 w-3/4 mb-4" /><Skeleton className="h-40 w-full" /></CardHeader>
              </Card>
              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl animate-pulse">
                <CardHeader><Skeleton className="h-6 w-3/4 mb-4" /><Skeleton className="h-40 w-full" /></CardHeader>
              </Card>
              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl animate-pulse">
                <CardHeader><Skeleton className="h-6 w-3/4 mb-4" /><Skeleton className="h-40 w-full" /></CardHeader>
              </Card>
            </>
          ) : (
            <>
              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-lg sm:rounded-xl">
                <CardHeader className="border-b border-blue-700/20 pb-3 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-base sm:text-lg lg:text-xl text-blue-400 flex items-center">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 mr-2 text-green-500 flex-shrink-0" />
                    <span className="truncate">Productivity Metrics</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-gray-400 mt-1">
                    Orders, Revenue, and AOV trends
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6 h-[250px] sm:h-[300px] lg:h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={productivityData} margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} />
                      <YAxis yAxisId="left" stroke="#94A3B8" fontSize={10} />
                      <YAxis yAxisId="right" orientation="right" stroke="#94A3B8" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #3B82F6', borderRadius: '8px', color: '#E2E8F0' }}
                        labelStyle={{ color: '#93C5FD' }}
                        itemStyle={{ color: '#E2E8F0' }}
                        formatter={(value: any, name: string) => {
                          if (name === 'revenue' || name === 'avgOrderValue') {
                            return [`GH₵${Number(value).toFixed(2)}`, name];
                          }
                          return [value, name];
                        }}
                      />
                      <Legend wrapperStyle={{ color: '#94A3B8', paddingTop: '10px' }} />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="orders"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                        name="Orders"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10B981"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                        name="Revenue (GH₵)"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="avgOrderValue"
                        stroke="#F59E0B"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                        name="Avg Order Value (GH₵)"
                        strokeDasharray="5 5"
                      />
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

              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl">
                <CardHeader className="border-b border-blue-700/20 pb-4">
                  <CardTitle className="text-xl text-blue-400 flex items-center">
                    <BarChart className="h-6 w-6 mr-2 text-emerald-500" /> Revenue Trends
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Daily revenue and order volume correlation
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueOverTimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} />
                      <YAxis yAxisId="left" stroke="#94A3B8" fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" stroke="#94A3B8" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #3B82F6', borderRadius: '8px', color: '#E2E8F0' }}
                        labelStyle={{ color: '#93C5FD' }}
                        itemStyle={{ color: '#E2E8F0' }}
                        formatter={(value: any, name: string) => {
                          if (name === 'revenue') {
                            return [`GH₵${Number(value).toFixed(2)}`, 'Revenue'];
                          }
                          return [value, name];
                        }}
                      />
                      <Legend wrapperStyle={{ color: '#94A3B8', paddingTop: '10px' }} />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10B981"
                        strokeWidth={3}
                        activeDot={{ r: 8 }}
                        name="Daily Revenue (GH₵)"
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="orders"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                        name="Orders Count"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl">
                <CardHeader className="border-b border-blue-700/20 pb-4">
                  <CardTitle className="text-xl text-blue-400 flex items-center">
                    <Users className="h-6 w-6 mr-2 text-indigo-500" /> User Registrations
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Daily user registration trends over the last 30 days
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userRegistrationData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} />
                      <YAxis stroke="#94A3B8" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #3B82F6', borderRadius: '8px', color: '#E2E8F0' }}
                        labelStyle={{ color: '#93C5FD' }}
                        itemStyle={{ color: '#E2E8F0' }}
                      />
                      <Legend wrapperStyle={{ color: '#94A3B8', paddingTop: '10px' }} />
                      <Line
                        type="monotone"
                        dataKey="registrations"
                        stroke="#8B5CF6"
                        strokeWidth={3}
                        activeDot={{ r: 8 }}
                        name="New Users"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Management Sections - Mobile Optimized */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-lg sm:rounded-xl">
            <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-base sm:text-lg lg:text-xl text-blue-400 flex items-center">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 mr-2 text-green-500 flex-shrink-0" />
                <span className="truncate">Order Management</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-400 mt-1">Oversee customer orders and fulfillment.</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <Button asChild className="w-full py-2 sm:py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold rounded-lg shadow-md text-sm sm:text-base">
                <Link href="/admin/orders">View Orders</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-lg sm:rounded-xl">
            <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-base sm:text-lg lg:text-xl text-blue-400 flex items-center">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 mr-2 text-yellow-500 flex-shrink-0" />
                <span className="truncate">Product Catalog</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-400 mt-1">Add, modify, or remove products.</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <Button asChild className="w-full py-2 sm:py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold rounded-lg shadow-md text-sm sm:text-base">
                <Link href="/admin/products">Manage Products</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-lg sm:rounded-xl">
            <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-base sm:text-lg lg:text-xl text-blue-400 flex items-center">
                <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 mr-2 text-purple-500 flex-shrink-0" />
                <span className="truncate">Gallery & Content</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-400 mt-1">Manage images, slideshows, and content.</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <Button asChild className="w-full py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg shadow-md text-sm sm:text-base">
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
