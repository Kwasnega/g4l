"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ref, get, remove } from 'firebase/database'; // Import 'remove' for deletion
import { db } from '@/lib/firebase';
import type { Product } from '@/types'; // Import the Product type
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
import { Loader2, Package, Search, PlusCircle, Edit, Trash2, ChevronUp, ChevronDown } from 'lucide-react'; // Icons
import Link from 'next/link';
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

export default function AdminProductsPage() {
  const { user, loading: authLoading, isAuthenticated, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [fetchingProducts, setFetchingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof Product | null>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Authentication and Authorization Logic (similar to other admin pages)
  useEffect(() => {
    if (!authLoading && isFirebaseConfigured) {
      if (!isAuthenticated) {
        console.log("AdminProductsPage: Not authenticated, redirecting to /admin/login");
        router.replace('/admin/login');
        setCheckingAuth(false);
      } else {
        const checkAdminStatus = async () => {
          if (!db || !user?.uid) {
            console.error("AdminProductsPage: Firebase DB or user UID not available for admin check.");
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
                console.log("AdminProductsPage: User is authorized admin.");
              } else {
                setIsAdmin(false);
                console.log("AdminProductsPage: User UID not found in adminUsers or not authorized, redirecting to /");
                router.replace('/');
              }
            } else {
              console.log("AdminProductsPage: 'adminUsers' node does not exist in Firebase. No admins configured.");
              setIsAdmin(false);
              router.replace('/');
            }
          } catch (error) {
            console.error("AdminProductsPage: Error checking admin status from Firebase:", error);
            setIsAdmin(false);
            router.replace('/');
          } finally {
            setCheckingAuth(false);
          }
        };

        checkAdminStatus();
      }
    } else if (!isFirebaseConfigured && !authLoading) {
        console.error("AdminProductsPage: Firebase is not configured. Admin access disabled.");
        router.replace('/');
        setCheckingAuth(false);
    }
  }, [authLoading, isAuthenticated, user, isFirebaseConfigured, router]);

  // Fetch Products Logic
  useEffect(() => {
    if (isAdmin && isFirebaseConfigured && db) {
      setFetchingProducts(true);
      const fetchProducts = async () => {
        try {
          const productsRef = ref(db, 'products/products');
          const snapshot = await get(productsRef);
          const fetchedProducts: Product[] = [];

          if (snapshot.exists()) {
            const productsData: (Product | null)[] = snapshot.val();
            // Filter out null values and ensure 'id' exists
            productsData.forEach((product, index) => {
              if (product !== null && product.id !== undefined) {
                fetchedProducts.push(product);
              } else {
                console.warn(`Skipping malformed or null product at index ${index}:`, product);
              }
            });
          }
          setProducts(fetchedProducts);
        } catch (error) {
          console.error("Error fetching products:", error);
        } finally {
          setFetchingProducts(false);
        }
      };
      fetchProducts();
    } else if (!isAdmin && !checkingAuth && !authLoading) {
        setFetchingProducts(false);
    }
  }, [isAdmin, isFirebaseConfigured, db, checkingAuth, authLoading]);

  // Handle Product Deletion
  const handleDeleteProduct = async () => {
    if (!productToDelete || !db || !user?.uid) {
      console.error("No product selected for deletion or Firebase DB/user UID not available.");
      return;
    }

    try {
      // Products are stored in an array, so we need to find their index
      // and update the array in Firebase by setting that index to null.
      // Firebase Realtime Database handles sparse arrays by treating nulls as empty.
      const productsRef = ref(db, 'products/products');
      const snapshot = await get(productsRef);
      if (snapshot.exists()) {
        const productsArray: (Product | null)[] = snapshot.val();
        const indexToDelete = productsArray.findIndex(p => p?.id === productToDelete.id);

        if (indexToDelete !== -1) {
          const productPath = `products/products/${indexToDelete}`;
          const productRef = ref(db, productPath);
          await remove(productRef); // Use remove to set the index to null

          // Update local state by filtering out the product
          setProducts(prevProducts => prevProducts.filter(p => p.id !== productToDelete.id));
          console.log(`Product ${productToDelete.id} deleted successfully (set to null in DB).`);
        } else {
          console.warn(`Product ${productToDelete.id} not found in DB array.`);
        }
      }

      setProductToDelete(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error(`Failed to delete product ${productToDelete.id}:`, error);
    }
  };

  // Filter and Sort Products
  const filteredAndSortedProducts = products
    .filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) // Filter by description if it exists
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
      return 0;
    });

  const handleSort = (column: keyof Product) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Render loading state for initial auth/admin check
  if (authLoading || checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-300">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="ml-4 text-xl">Verifying Admin Access to Products...</p>
      </div>
    );
  }

  // If not an admin, return null (redirection handled by useEffect)
  if (!isAdmin) {
    return null;
  }

  // Render Products Management content
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-800 text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-blue-700/30">
          <h1 className="text-4xl font-bold tracking-tight text-blue-400 flex items-center">
            <Package className="h-10 w-10 mr-3 text-blue-500 animate-pulse" />
            Product Catalog
          </h1>
          <Button asChild variant="ghost" className="text-gray-400 hover:text-blue-300 hover:bg-gray-800 transition-colors duration-200">
            <Link href="/admin">Back to Dashboard</Link>
          </Button>
        </div>

        <div className="mb-6 flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1 w-full">
            <Input
              type="text"
              placeholder="Search products by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-blue-700/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
          <Button asChild className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-200 w-full md:w-auto">
            <Link href="/admin/products/new">
              <PlusCircle className="h-5 w-5 mr-2" /> Add New Product
            </Link>
          </Button>
        </div>

        {fetchingProducts ? (
          <div className="flex items-center justify-center p-12 bg-gray-900 rounded-lg shadow-inner shadow-blue-500/10">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="ml-4 text-lg text-gray-400">Loading products...</p>
          </div>
        ) : filteredAndSortedProducts.length === 0 ? (
          <div className="text-center p-12 bg-gray-900 rounded-lg shadow-inner shadow-blue-500/10">
            <p className="text-xl text-gray-400">No products found.</p>
            {searchTerm && <p className="text-md text-gray-500 mt-2">Try adjusting your search.</p>}
          </div>
        ) : (
          <div className="bg-gray-900 border border-blue-700/30 rounded-xl shadow-lg shadow-blue-500/20 overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-800 border-b border-blue-700/30">
                <TableRow>
                  <TableHead className="text-blue-300 py-3 px-4 text-left w-[80px]">ID</TableHead>
                  <TableHead className="text-blue-300 py-3 px-4 text-left min-w-[200px] cursor-pointer hover:text-blue-200 transition-colors duration-200" onClick={() => handleSort('name')}>
                    Name
                    {sortColumn === 'name' && (sortDirection === 'asc' ? <ChevronUp className="ml-1 inline-block h-4 w-4" /> : <ChevronDown className="ml-1 inline-block h-4 w-4" />)}
                  </TableHead>
                  <TableHead className="text-blue-300 py-3 px-4 text-left w-[120px] cursor-pointer hover:text-blue-200 transition-colors duration-200" onClick={() => handleSort('price')}>
                    Price
                    {sortColumn === 'price' && (sortDirection === 'asc' ? <ChevronUp className="ml-1 inline-block h-4 w-4" /> : <ChevronDown className="ml-1 inline-block h-4 w-4" />)}
                  </TableHead>
                  <TableHead className="text-blue-300 py-3 px-4 text-left w-[100px] cursor-pointer hover:text-blue-200 transition-colors duration-200" onClick={() => handleSort('stock')}>
                    Stock
                    {sortColumn === 'stock' && (sortDirection === 'asc' ? <ChevronUp className="ml-1 inline-block h-4 w-4" /> : <ChevronDown className="ml-1 inline-block h-4 w-4" />)}
                  </TableHead>
                  <TableHead className="text-blue-300 py-3 px-4 text-left w-[100px] cursor-pointer hover:text-blue-200 transition-colors duration-200" onClick={() => handleSort('rating')}>
                    Rating
                    {sortColumn === 'rating' && (sortDirection === 'asc' ? <ChevronUp className="ml-1 inline-block h-4 w-4" /> : <ChevronDown className="ml-1 inline-block h-4 w-4" />)}
                  </TableHead>
                  <TableHead className="text-blue-300 py-3 px-4 text-left">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedProducts.map((product) => (
                  <TableRow key={product.id} className="border-b border-blue-700/10 hover:bg-gray-850 transition-colors duration-150">
                    <TableCell className="font-medium text-gray-300 w-[80px]">{product.id}</TableCell>
                    <TableCell className="text-gray-300 min-w-[200px]">{product.name}</TableCell>
                    <TableCell className="text-green-400 font-semibold w-[120px]">GH₵{product.price.toFixed(2)}</TableCell>
                    <TableCell className="text-gray-400 w-[100px]">
                      <Badge className={product.stock < 10 ? 'bg-red-600' : product.stock < 30 ? 'bg-orange-600' : 'bg-green-600'}>
                        {product.stock}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-yellow-400 w-[100px]">{product.rating.toFixed(1)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button asChild variant="outline" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 transition-colors duration-200">
                          <Link href={`/admin/products/${product.id}`}>
                            <Edit className="h-4 w-4" /> {/* Edit icon */}
                          </Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="bg-red-600 hover:bg-red-700 text-white transition-colors duration-200"
                          onClick={() => {
                            setProductToDelete(product);
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-gray-900 border border-red-700/30 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Confirm Product Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete product <span className="font-bold text-red-300">"{productToDelete?.name}" (ID: {productToDelete?.id})</span>? This will set its entry to null in the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600 text-white border-gray-700 hover:border-gray-600">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
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
