"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ref, get, push, remove, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Image as ImageIcon, PlusCircle, Trash2, ArrowLeft, GalleryHorizontal, SlidersHorizontal, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- Cloudinary Configuration ---
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your_cloudinary_cloud_name';
// FIXED: Use specific presets based on the target
const CLOUDINARY_GALLERY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_GALLERY_UPLOAD_PRESET || 'your_gallery_unsigned_upload_preset';
const CLOUDINARY_SLIDESHOW_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_SLIDESHOW_UPLOAD_PRESET || 'your_slideshow_unsigned_upload_preset';


interface GalleryImage {
  id: string;
  url: string;
  uploadedAt: string;
  public_id?: string;
}

export default function AdminGalleryPage() {
  const { user, loading: authLoading, isAuthenticated, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [slideshowImages, setSlideshowImages] = useState<GalleryImage[]>([]);
  const [fetchingImages, setFetchingImages] = useState(true);
  const [imageUploading, setImageUploading] = useState(false);
  const [currentTab, setCurrentTab] = useState("gallery");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [imageToDelete, setImageToDelete] = useState<GalleryImage | null>(null);
  const [deleteFromNode, setDeleteFromNode] = useState<'gallery_images' | 'gallery_slideshow_images' | null>(null);

  useEffect(() => {
    if (!authLoading && isFirebaseConfigured) {
      if (!isAuthenticated) {
        console.log("AdminGalleryPage: Not authenticated, redirecting to /admin/login");
        router.replace('/admin/login');
        setCheckingAuth(false);
      } else {
        const checkAdminStatus = async () => {
          if (!db || !user?.uid) {
            console.error("AdminGalleryPage: Firebase DB or user UID not available for admin check.");
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
                console.log("AdminGalleryPage: User is authorized admin.");
              } else {
                setIsAdmin(false);
                console.log("AdminGalleryPage: User UID not found in adminUsers or not authorized, redirecting to /");
                router.replace('/');
              }
            } else {
              console.log("AdminGalleryPage: 'adminUsers' node does not exist in Firebase. No admins configured.");
              setIsAdmin(false);
              router.replace('/');
            }
          } catch (error) {
            console.error("AdminGalleryPage: Error checking admin status from Firebase:", error);
            setIsAdmin(false);
            router.replace('/');
          } finally {
            setCheckingAuth(false);
          }
        };

        checkAdminStatus();
      }
    } else if (!isFirebaseConfigured && !authLoading) {
        console.error("AdminGalleryPage: Firebase is not configured. Admin access disabled.");
        router.replace('/');
        setCheckingAuth(false);
    }
  }, [authLoading, isAuthenticated, user, isFirebaseConfigured, router]);

  useEffect(() => {
    if (isAdmin && isFirebaseConfigured && db) {
      setFetchingImages(true);
      const fetchImages = async () => {
        try {
          const galleryRef = ref(db, 'gallery_images');
          const gallerySnapshot = await get(galleryRef);
          const fetchedGalleryImages: GalleryImage[] = [];
          if (gallerySnapshot.exists()) {
            gallerySnapshot.forEach(childSnapshot => {
              const img = childSnapshot.val();
              if (img && img.url && img.uploadedAt) {
                fetchedGalleryImages.push({ id: childSnapshot.key!, ...img });
              }
            });
          }
          setGalleryImages(fetchedGalleryImages);

          const slideshowRef = ref(db, 'gallery_slideshow_images');
          const slideshowSnapshot = await get(slideshowRef);
          const fetchedSlideshowImages: GalleryImage[] = [];
          if (slideshowSnapshot.exists()) {
            slideshowSnapshot.forEach(childSnapshot => {
              const img = childSnapshot.val();
              if (img && img.url && img.uploadedAt) {
                fetchedSlideshowImages.push({ id: childSnapshot.key!, ...img });
              }
            });
          }
          setSlideshowImages(fetchedSlideshowImages);

        } catch (error) {
          console.error("Error fetching gallery images:", error);
          toast({
            title: "Error",
            description: "Failed to load images. Please try again.",
            variant: "destructive",
          });
        } finally {
          setFetchingImages(false);
        }
      };
      fetchImages();
    } else if (!isAdmin && !checkingAuth && !authLoading) {
        setFetchingImages(false);
    }
  }, [isAdmin, isFirebaseConfigured, db, checkingAuth, authLoading, toast]);

  // Handle Image Upload to Cloudinary and Firebase
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, targetNode: 'gallery_images' | 'gallery_slideshow_images') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    // FIXED: Select the correct upload preset based on targetNode
    const uploadPreset = targetNode === 'gallery_images' ? CLOUDINARY_GALLERY_UPLOAD_PRESET : CLOUDINARY_SLIDESHOW_UPLOAD_PRESET;
    formData.append('upload_preset', uploadPreset);

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
      const newImage: GalleryImage = {
        id: '',
        url: data.secure_url,
        uploadedAt: new Date().toISOString(),
        public_id: data.public_id,
      };

      const newNodeRef = push(ref(db, targetNode));
      await set(newNodeRef, { ...newImage, id: newNodeRef.key! });

      newImage.id = newNodeRef.key!;

      if (targetNode === 'gallery_images') {
        setGalleryImages(prevImages => [...prevImages, newImage]);
      } else {
        setSlideshowImages(prevImages => [...prevImages, newImage]);
      }

      toast({
        title: "Image Uploaded",
        description: `Image successfully added to ${targetNode.replace('_', ' ')}.`,
        variant: "success",
      });
    } catch (error: any) {
      console.error("Image upload error:", error);
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

  const confirmDeleteImage = (image: GalleryImage, node: 'gallery_images' | 'gallery_slideshow_images') => {
    setImageToDelete(image);
    setDeleteFromNode(node);
    setShowDeleteConfirm(true);
  };

  const handleDeleteImage = async () => {
    if (!imageToDelete || !deleteFromNode || !db || !user?.uid) {
      console.error("No image selected for deletion or Firebase DB/user UID not available.");
      return;
    }

    try {
      const imageRef = ref(db, `${deleteFromNode}/${imageToDelete.id}`);
      await remove(imageRef);

      if (imageToDelete.public_id) {
        console.log(`Cloudinary deletion for public_id: ${imageToDelete.public_id} would happen here.`);
      }

      if (deleteFromNode === 'gallery_images') {
        setGalleryImages(prevImages => prevImages.filter(img => img.id !== imageToDelete.id));
      } else {
        setSlideshowImages(prevImages => prevImages.filter(img => img.id !== imageToDelete.id));
      }

      toast({
        title: "Image Deleted",
        description: "Image successfully removed.",
        variant: "success",
      });
    } catch (error) {
      console.error("Error deleting image:", error);
      toast({
        title: "Deletion Failed",
        description: "Could not delete image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setImageToDelete(null);
      setDeleteFromNode(null);
      setShowDeleteConfirm(false);
    }
  };

  if (authLoading || checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-300">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="ml-4 text-xl">Verifying Admin Access to Gallery...</p>
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
            <ImageIcon className="h-10 w-10 mr-3 text-purple-500 animate-pulse" />
            Gallery Management
          </h1>
          <Button asChild variant="ghost" className="text-gray-400 hover:text-blue-300 hover:bg-gray-800 transition-colors duration-200">
            <Link href="/admin">Back to Dashboard</Link>
          </Button>
        </div>

        <Tabs defaultValue="gallery" className="w-full" onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 border border-blue-700/30 rounded-lg overflow-hidden">
            <TabsTrigger value="gallery" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:border-blue-500 data-[state=active]:border text-blue-300 hover:text-blue-200 transition-colors duration-200 py-2">
              <GalleryHorizontal className="mr-2 h-5 w-5" /> Main Gallery Images
            </TabsTrigger>
            <TabsTrigger value="slideshow" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:border-blue-500 data-[state=active]:border text-blue-300 hover:text-blue-200 transition-colors duration-200 py-2">
              <SlidersHorizontal className="mr-2 h-5 w-5" /> Slideshow Images
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="mt-6">
            <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl">
              <CardHeader className="border-b border-blue-700/20 pb-4">
                <CardTitle className="text-xl text-blue-400 flex items-center">
                  <PlusCircle className="h-6 w-6 mr-2 text-green-500" /> Add Image to Main Gallery
                </CardTitle>
                <CardDescription className="text-gray-400">Upload new images for your main website gallery.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-4">
                  <Label htmlFor="galleryImageUpload" className="text-blue-300">Upload Image</Label>
                  <Input
                    id="galleryImageUpload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'gallery_images')}
                    disabled={imageUploading}
                    className="bg-gray-800 border border-blue-600/50 text-white file:text-blue-300 file:bg-gray-700 file:border-none file:rounded-md file:py-1 file:px-3 hover:file:bg-gray-600 cursor-pointer"
                  />
                  {imageUploading && (
                    <div className="flex items-center text-blue-400">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading image...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <h2 className="text-2xl font-bold text-blue-300 mt-8 mb-4">Existing Main Gallery Images</h2>
            {fetchingImages ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="w-full h-32 rounded-lg bg-gray-800" />
                ))}
              </div>
            ) : galleryImages.length === 0 ? (
              <div className="text-center p-12 bg-gray-900 rounded-lg shadow-inner shadow-blue-500/10 text-gray-400">
                No images in the main gallery. Upload one above!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {galleryImages.map((image) => (
                  <div key={image.id} className="relative group w-full h-32 rounded-lg overflow-hidden border border-blue-700/50 shadow-md">
                    <img
                      src={image.url}
                      alt={`Gallery Image ${image.id}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => e.currentTarget.src = 'https://placehold.co/128x128?text=No+Image'}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => confirmDeleteImage(image, 'gallery_images')}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="slideshow" className="mt-6">
            <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl">
              <CardHeader className="border-b border-blue-700/20 pb-4">
                <CardTitle className="text-xl text-blue-400 flex items-center">
                  <PlusCircle className="h-6 w-6 mr-2 text-green-500" /> Add Image to Slideshow
                </CardTitle>
                <CardDescription className="text-gray-400">Upload new images for your homepage slideshow.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-4">
                  <Label htmlFor="slideshowImageUpload" className="text-blue-300">Upload Image</Label>
                  <Input
                    id="slideshowImageUpload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'gallery_slideshow_images')}
                    disabled={imageUploading}
                    className="bg-gray-800 border border-blue-600/50 text-white file:text-blue-300 file:bg-gray-700 file:border-none file:rounded-md file:py-1 file:px-3 hover:file:bg-gray-600 cursor-pointer"
                  />
                  {imageUploading && (
                    <div className="flex items-center text-blue-400">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading image...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <h2 className="text-2xl font-bold text-blue-300 mt-8 mb-4">Existing Slideshow Images</h2>
            {fetchingImages ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="w-full h-32 rounded-lg bg-gray-800" />
                ))}
              </div>
            ) : slideshowImages.length === 0 ? (
              <div className="text-center p-12 bg-gray-900 rounded-lg shadow-inner shadow-blue-500/10 text-gray-400">
                No images in the slideshow. Upload one above!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {slideshowImages.map((image) => (
                  <div key={image.id} className="relative group w-full h-32 rounded-lg overflow-hidden border border-blue-700/50 shadow-md">
                    <img
                      src={image.url}
                      alt={`Slideshow Image ${image.id}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => e.currentTarget.src = 'https://placehold.co/128x128?text=No+Image'}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => confirmDeleteImage(image, 'gallery_slideshow_images')}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-gray-900 border border-red-700/30 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Confirm Image Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete this image? This action cannot be undone.
              <br/><br/>
              Image ID: <span className="font-bold text-red-300">{imageToDelete?.id}</span>
              <br/>
              From: <span className="font-bold text-red-300">{deleteFromNode?.replace('_', ' ')}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600 text-white border-gray-700 hover:border-gray-600">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteImage}
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
