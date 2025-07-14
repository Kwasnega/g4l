"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ref, get, update, remove } from 'firebase/database'; // Ensure 'remove' is imported
import { db } from '@/lib/firebase';
import type { Order } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Package, Search, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default function AdminOrdersPage() {
  const { user, loading: authLoading, isAuthenticated, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetchingOrders, setFetchingOrders] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof Order | null>('placedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);


  useEffect(() => {
    if (!authLoading && isFirebaseConfigured) {
      if (!isAuthenticated) {
        console.log("AdminOrdersPage: Not authenticated, redirecting to /admin/login");
        router.replace('/admin/login');
        setCheckingAuth(false);
      } else {
        const checkAdminStatus = async () => {
          if (!db || !user?.uid) {
            console.error("AdminOrdersPage: Firebase DB or user UID not available for admin check.");
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
                console.log("AdminOrdersPage: User is authorized admin.");
              } else {
                setIsAdmin(false);
                console.log("AdminOrdersPage: User UID not found in adminUsers or not authorized, redirecting to /");
                router.replace('/');
              }
            } else {
              console.log("AdminOrdersPage: 'adminUsers' node does not exist in Firebase. No admins configured.");
              setIsAdmin(false);
              router.replace('/');
            }
          } catch (error) {
            console.error("AdminOrdersPage: Error checking admin status from Firebase:", error);
            setIsAdmin(false);
            router.replace('/');
          } finally {
            setCheckingAuth(false);
          }
        };

        checkAdminStatus();
      }
    } else if (!isFirebaseConfigured && !authLoading) {
        console.error("AdminOrdersPage: Firebase is not configured. Admin access disabled.");
        router.replace('/');
        setCheckingAuth(false);
    }
  }, [authLoading, isAuthenticated, user, isFirebaseConfigured, router]);

  useEffect(() => {
    if (isAdmin && isFirebaseConfigured && db) {
      setFetchingOrders(true);
      const fetchOrders = async () => {
        try {
          const ordersRef = ref(db, 'orders');
          const snapshot = await get(ordersRef);
          const fetchedOrders: Order[] = [];

          if (snapshot.exists()) {
            const ordersByUsers: Record<string, Record<string, Order>> = snapshot.val();
            for (const userId in ordersByUsers) {
              if (ordersByUsers.hasOwnProperty(userId)) {
                const userOrders = ordersByUsers[userId];
                for (const orderId in userOrders) {
                  if (userOrders.hasOwnProperty(orderId)) {
                    const order = userOrders[orderId];
                    if (order && order.id && order.name && order.email && order.items && typeof order.total === 'number' && order.status && order.placedAt) {
                      fetchedOrders.push(order);
                    } else {
                      console.warn("Skipping malformed order:", order);
                    }
                  }
                }
              }
            }
          }
          setOrders(fetchedOrders);
        } catch (error) {
          console.error("Error fetching orders:", error);
        } finally {
          setFetchingOrders(false);
        }
      };
      fetchOrders();
    } else if (!isAdmin && !checkingAuth && !authLoading) {
        setFetchingOrders(false);
    }
  }, [isAdmin, isFirebaseConfigured, db, checkingAuth, authLoading]);

  const handleUpdateOrderStatus = async (order: Order, newStatus: string) => {
    if (!db || !user?.uid) {
      console.error("Firebase DB or user UID not available for status update.");
      return;
    }

    try {
      const orderPath = `orders/${order.userId}/${order.id}`;
      const orderRef = ref(db, orderPath);

      await update(orderRef, { status: newStatus });

      setOrders(prevOrders =>
        prevOrders.map(o =>
          o.id === order.id ? { ...o, status: newStatus } : o
        )
      );
      console.log(`Order ${order.id} status updated to ${newStatus}`);
    } catch (error) {
      console.error(`Failed to update status for order ${order.id}:`, error);
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete || !db || !user?.uid) {
      console.error("No order selected for deletion or Firebase DB/user UID not available.");
      return;
    }

    try {
      const orderPath = `orders/${orderToDelete.userId}/${orderToDelete.id}`;
      const orderRef = ref(db, orderPath);

      await remove(orderRef);

      setOrders(prevOrders => prevOrders.filter(o => o.id !== orderToDelete.id));
      console.log(`Order ${orderToDelete.id} deleted successfully.`);
      setOrderToDelete(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error(`Failed to delete order ${orderToDelete.id}:`, error);
    }
  };

  const filteredAndSortedOrders = orders
    .filter(order =>
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.status.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortColumn) return 0;

      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === null || bValue === null) {
        if (aValue === null && bValue !== null) return sortDirection === 'asc' ? 1 : -1;
        if (bValue === null && aValue !== null) return sortDirection === 'asc' ? -1 : 1;
        return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      if (sortColumn === 'placedAt') {
        const dateA = new Date(a.placedAt);
        const dateB = new Date(b.placedAt);
        return sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      }
      return 0;
    });

  const handleSort = (column: keyof Order) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  if (authLoading || checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-300">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="ml-4 text-xl">Verifying Admin Access to Orders...</p>
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
            <Package className="h-10 w-10 mr-3 text-blue-500 animate-pulse" />
            Order Management
          </h1>
          <Button asChild variant="ghost" className="text-gray-400 hover:text-blue-300 hover:bg-gray-800 transition-colors duration-200">
            <Link href="/admin">Back to Dashboard</Link>
          </Button>
        </div>

        <div className="mb-6 flex items-center space-x-4">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search orders by ID, name, email, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-blue-700/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {fetchingOrders ? (
          <div className="flex items-center justify-center p-12 bg-gray-900 rounded-lg shadow-inner shadow-blue-500/10">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="ml-4 text-lg text-gray-400">Loading orders...</p>
          </div>
        ) : filteredAndSortedOrders.length === 0 ? (
          <div className="text-center p-12 bg-gray-900 rounded-lg shadow-inner shadow-blue-500/10">
            <p className="text-xl text-gray-400">No orders found.</p>
            {searchTerm && <p className="text-md text-gray-500 mt-2">Try adjusting your search or filters.</p>}
          </div>
        ) : (
          <div className="bg-gray-900 border border-blue-700/30 rounded-xl shadow-lg shadow-blue-500/20 overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-800 border-b border-blue-700/30">
                <TableRow>
                  <TableHead className="text-blue-300 py-3 px-4 text-left w-[100px]">Order ID</TableHead>
                  <TableHead className="text-blue-300 py-3 px-4 text-left w-[150px]">Customer Name</TableHead>
                  <TableHead className="text-blue-300 py-3 px-4 text-left w-[200px]">Email</TableHead>
                  <TableHead className="text-blue-300 py-3 px-4 text-left min-w-[250px]">Items</TableHead>
                  <TableHead
                    className="text-blue-300 py-3 px-4 text-left cursor-pointer hover:text-blue-200 transition-colors duration-200"
                    onClick={() => handleSort('total')}
                  >Total
                    {sortColumn === 'total' && (sortDirection === 'asc' ? <ChevronUp className="ml-1 inline-block h-4 w-4" /> : <ChevronDown className="ml-1 inline-block h-4 w-4" />)}
                  </TableHead>
                  <TableHead
                    className="text-blue-300 py-3 px-4 text-left cursor-pointer hover:text-blue-200 transition-colors duration-200"
                    onClick={() => handleSort('status')}
                  >Status
                    {sortColumn === 'status' && (sortDirection === 'asc' ? <ChevronUp className="ml-1 inline-block h-4 w-4" /> : <ChevronDown className="ml-1 inline-block h-4 w-4" />)}
                  </TableHead>
                  <TableHead
                    className="text-blue-300 py-3 px-4 text-left cursor-pointer hover:text-blue-200 transition-colors duration-200"
                    onClick={() => handleSort('placedAt')}
                  >Placed At
                    {sortColumn === 'placedAt' && (sortDirection === 'asc' ? <ChevronUp className="ml-1 inline-block h-4 w-4" /> : <ChevronDown className="ml-1 inline-block h-4 w-4" />)}
                  </TableHead>
                  <TableHead className="text-blue-300 py-3 px-4 text-left">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium text-gray-300 w-[100px]">{order.id.substring(0, 8)}...</TableCell>
                    <TableCell className="text-gray-300 w-[150px]">{order.name}</TableCell>
                    <TableCell className="text-gray-400 w-[200px]">{order.email}</TableCell>
                    <TableCell className="text-gray-400">
                      {order.items.map(item => `${item.productName} (x${item.quantity})`).join(', ')}
                    </TableCell>
                    <TableCell className="text-green-400 font-semibold">GH₵{order.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Badge
                            className={
                              order.status === 'processing'
                                ? 'bg-yellow-600 hover:bg-yellow-700 text-yellow-50 cursor-pointer'
                                : order.status === 'shipped'
                                ? 'bg-blue-600 hover:bg-blue-700 text-blue-50 cursor-pointer'
                                : order.status === 'delivered'
                                ? 'bg-green-600 hover:bg-green-700 text-green-50 cursor-pointer'
                                : order.status === 'cancelled'
                                ? 'bg-red-600 hover:bg-red-700 text-red-50 cursor-pointer'
                                : order.status === 'refunded'
                                ? 'bg-purple-600 hover:bg-purple-700 text-purple-50 cursor-pointer'
                                : 'bg-gray-600 hover:bg-gray-700 text-gray-50 cursor-pointer'
                            }
                          >
                            {order.status}
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-gray-800 border-blue-700/50 text-white">
                          {ORDER_STATUSES.map(status => (
                            <DropdownMenuItem
                              key={status}
                              onClick={() => handleUpdateOrderStatus(order, status)}
                              className="hover:bg-gray-700 cursor-pointer"
                            >
                              {status}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-gray-400">
                      {new Date(order.placedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {/* FIXED: Wrapped buttons in a div */}
                      <div className="flex space-x-2">
                        <Button asChild variant="outline" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 transition-colors duration-200">
                          <Link href={`/admin/orders/${order.id}`}>View Details</Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="bg-red-600 hover:bg-red-700 text-white transition-colors duration-200"
                          onClick={() => {
                            setOrderToDelete(order);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-gray-900 border border-red-700/30 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete order <span className="font-bold text-red-300">{orderToDelete?.id.substring(0, 8)}...?</span> This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600 text-white border-gray-700 hover:border-gray-600">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
