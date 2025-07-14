"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ref, get, push, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { Product } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, ArrowLeft, Image as ImageIcon, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge'; // Ensure Badge is imported

// --- Cloudinary Configuration ---
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your_cloudinary_cloud_name';
// FIXED: Use the specific product upload preset
const CLOUDINARY_PRODUCT_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRODUCT_UPLOAD_PRESET || 'your_unsigned_product_upload_preset';

export default function AdminAddProductPage() {
  const { user, loading: authLoading, isAuthenticated, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [newColor, setNewColor] = useState('');
  const [newSize, setNewSize] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && isFirebaseConfigured) {
      if (!isAuthenticated) {
        console.log("AdminAddProductPage: Not authenticated, redirecting to /admin/login");
        router.replace('/admin/login');
        setCheckingAuth(false);
      } else {
        const checkAdminStatus = async () => {
          if (!db || !user?.uid) {
            console.error("AdminAddProductPage: Firebase DB or user UID not available for admin check.");
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
                console.log("AdminAddProductPage: User is authorized admin.");
              } else {
                setIsAdmin(false);
                console.log("AdminAddProductPage: User UID not found in adminUsers or not authorized, redirecting to /");
                router.replace('/');
              }
            } else {
              console.log("AdminAddProductPage: 'adminUsers' node does not exist in Firebase. No admins configured.");
              setIsAdmin(false);
              router.replace('/');
            }
          } catch (error) {
            console.error("AdminAddProductPage: Error checking admin status from Firebase:", error);
            setIsAdmin(false);
            router.replace('/');
          } finally {
            setCheckingAuth(false);
          }
        };

        checkAdminStatus();
      }
    } else if (!isFirebaseConfigured && !authLoading) {
        console.error("AdminAddProductPage: Firebase is not configured. Admin access disabled.");
        router.replace('/');
        setCheckingAuth(false);
    }
  }, [authLoading, isAuthenticated, user, isFirebaseConfigured, router]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    // FIXED: Use the specific product upload preset
    formData.append('upload_preset', CLOUDINARY_PRODUCT_UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'Cloudinary upload failed');
      }

      const data = await response.json();
      setImages(prevImages => [...prevImages, data.secure_url]);
      toast({
        title: "Image Uploaded",
        description: "Image successfully uploaded to Cloudinary.",
        variant: "success",
      });
    } catch (error: any) {
      console.error("Cloudinary upload error:", error);
      toast({
        title: "Image Upload Failed",
        description: error.message || "Could not upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setImageUploading(false);
      event.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(prevImages => prevImages.filter((_, index) => index !== indexToRemove));
  };

  const handleAddColor = () => {
    const trimmedColor = newColor.trim();
    if (trimmedColor && !colors.includes(trimmedColor)) {
      setColors(prevColors => [...prevColors, trimmedColor]);
      setNewColor('');
    }
  };

  const handleRemoveColor = (colorToRemove: string) => {
    setColors(prevColors => prevColors.filter(color => color !== colorToRemove));
  };

  const handleAddSize = () => {
    const trimmedSize = newSize.trim().toUpperCase();
    if (trimmedSize && !sizes.includes(trimmedSize)) {
      setSizes(prevSizes => [...prevSizes, trimmedSize]);
      setNewSize('');
    }
  };

  const handleRemoveSize = (sizeToRemove: string) => {
    setSizes(prevSizes => prevSizes.filter(size => size !== sizeToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!db || !user?.uid) {
      toast({
        title: "Firebase Error",
        description: "Firebase database not available.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    if (!name || !price || !stock || !description || images.length === 0 || colors.length === 0 || sizes.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required product fields and add at least one image, color, and size.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const productsRef = ref(db, 'products/products');
      const snapshot = await get(productsRef);
      const currentProducts: (Product | null)[] = snapshot.val() || [];

      const maxId = currentProducts.reduce((max, p) => p && typeof p.id === 'string' ? Math.max(max, parseInt(p.id)) : max, 0);
      const newProductId = (maxId + 1).toString();

      let nextIndex = currentProducts.length;
      for (let i = 0; i < currentProducts.length; i++) {
        if (currentProducts[i] === null) {
          nextIndex = i;
          break;
        }
      }

      const newProduct: Product = {
        id: newProductId,
        name,
        price: Number(price),
        stock: Number(stock),
        description,
        images,
        colors,
        sizes,
        rating: 0,
      };

      const productAtIndexRef = ref(db, `products/products/${nextIndex}`);
      await set(productAtIndexRef, newProduct);

      toast({
        title: "Product Added",
        description: `Product "${name}" added successfully!`,
        variant: "success",
      });
      router.push('/admin/products');
    } catch (error: any) {
      console.error("Error adding product:", error);
      toast({
        title: "Failed to Add Product",
        description: error.message || "An error occurred while adding the product.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-300">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="ml-4 text-xl">Verifying Admin Access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-800 text-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-blue-700/30">
          <h1 className="text-4xl font-bold tracking-tight text-blue-400 flex items-center">
            <PlusCircle className="h-10 w-10 mr-3 text-green-500 animate-pulse" />
            Add New Product
          </h1>
          <Button asChild variant="ghost" className="text-gray-400 hover:text-blue-300 hover:bg-gray-800 transition-colors duration-200">
            <Link href="/admin/products">
              <ArrowLeft className="h-5 w-5 mr-2" /> Back to Products
            </Link>
          </Button>
        </div>

        <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl">
          <CardHeader className="border-b border-blue-700/20 pb-4">
            <CardTitle className="text-xl text-blue-400">Product Details</CardTitle>
            <CardDescription className="text-gray-400">Fill in the information for your new product.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-blue-300">Product Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Adinkra Symbol Tee"
                  required
                  className="bg-gray-800 border border-blue-600/50 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price" className="text-blue-300">Price (GH₵)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || '')}
                    placeholder="e.g., 45.00"
                    required
                    step="0.01"
                    className="bg-gray-800 border border-blue-600/50 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stock" className="text-blue-300">Stock Quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(parseInt(e.target.value) || '')}
                    placeholder="e.g., 50"
                    required
                    className="bg-gray-800 border border-blue-600/50 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description" className="text-blue-300">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of the product..."
                  rows={4}
                  required
                  className="bg-gray-800 border border-blue-600/50 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="images" className="text-blue-300">Product Images</Label>
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={imageUploading}
                  className="bg-gray-800 border border-blue-600/50 text-white file:text-blue-300 file:bg-gray-700 file:border-none file:rounded-md file:py-1 file:px-3 hover:file:bg-gray-600 cursor-pointer"
                />
                {imageUploading && (
                  <div className="flex items-center text-blue-400">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading image...
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-3">
                  {images.map((imgUrl, index) => (
                    <div key={index} className="relative w-24 h-24 rounded-md overflow-hidden border border-blue-700/50">
                      <img src={imgUrl} alt={`Product Image ${index + 1}`} className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 rounded-full"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="newColor" className="text-blue-300">Colors (Hex codes or names, e.g., #FF0000, Black)</Label>
                <div className="flex space-x-2">
                  <Input
                    id="newColor"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    placeholder="e.g., #FF0000 or Red"
                    className="flex-1 bg-gray-800 border border-blue-600/50 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500"
                  />
                  <Button type="button" onClick={handleAddColor} className="bg-blue-600 hover:bg-blue-700 text-white">Add Color</Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {colors.map((color, index) => (
                    <Badge key={index} className="bg-gray-700 text-gray-200 flex items-center space-x-1">
                      <span className="h-4 w-4 rounded-full border border-gray-500" style={{ backgroundColor: color }}></span>
                      <span>{color}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-gray-400 hover:text-red-400" onClick={() => handleRemoveColor(color)}>
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="newSize" className="text-blue-300">Sizes (e.g., S, M, L, XL, One Size)</Label>
                <div className="flex space-x-2">
                  <Input
                    id="newSize"
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    placeholder="e.g., M or XL"
                    className="flex-1 bg-gray-800 border border-blue-600/50 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500"
                  />
                  <Button type="button" onClick={handleAddSize} className="bg-blue-600 hover:bg-blue-700 text-white">Add Size</Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sizes.map((size, index) => (
                    <Badge key={index} className="bg-gray-700 text-gray-200 flex items-center space-x-1">
                      <span>{size}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-gray-400 hover:text-red-400" onClick={() => handleRemoveSize(size)}>
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full py-3 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out
                           flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || imageUploading}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Adding Product...
                  </>
                ) : (
                  "Create Product"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
