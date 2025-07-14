
import type { Product, GalleryImage, GallerySlideshowImage } from '@/types';
import { db } from './firebase';
import { ref, get } from 'firebase/database';

// This function now fetches product data from the Firebase Realtime Database.
export async function getProducts(limit?: number): Promise<{ products: Product[] }> {
  if (!db) {
    console.error("Firebase database is not configured. Cannot fetch products.");
    return { products: [] };
  }

  try {
    const productsRef = ref(db, 'products/products');
    const snapshot = await get(productsRef);

    if (snapshot.exists()) {
      const productsData: (Product | null)[] = snapshot.val();
      const validProducts = productsData.filter((p): p is Product => p !== null && p.id !== undefined);
      const sortedProducts = validProducts.sort((a, b) => (a.name > b.name ? 1 : -1));
      return {
        products: limit ? sortedProducts.slice(0, limit) : sortedProducts,
      };
    } else {
      console.log("No products found in the database at 'products/products'.");
      return { products: [] };
    }
  } catch (error) {
    console.error("Error fetching products from Firebase:", error);
    return { products: [] };
  }
}

// This function now fetches a single product by its ID from the Firebase Realtime Database.
export async function getProductById(id: string): Promise<Product | null> {
  if (!db) {
    console.error("Firebase database is not configured. Cannot fetch product.");
    return null;
  }
  
  try {
    const productRef = ref(db, `products/products/${id}`);
    const snapshot = await get(productRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as Product;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error fetching product with ID ${id} from Firebase:`, error);
    return null;
  }
}

export async function getGalleryImages(): Promise<GalleryImage[]> {
  if (!db) {
    console.error("Firebase database is not configured. Cannot fetch gallery images.");
    return [];
  }
  
  try {
    const galleryImagesRef = ref(db, 'gallery_images');
    const snapshot = await get(galleryImagesRef);

    if (snapshot.exists()) {
      const imagesData: Record<string, Omit<GalleryImage, 'id'>> = snapshot.val();
      const imagesArray = Object.entries(imagesData).map(([id, data]) => ({
        id,
        ...data,
      }));
      // Sort by uploadedAt, most recent first
      return imagesArray.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    } else {
      console.log("No gallery images found in the database.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching gallery images from Firebase:", error);
    return [];
  }
}

export async function getGallerySlideshowImages(): Promise<GallerySlideshowImage[]> {
  if (!db) {
    console.error("Firebase database is not configured. Cannot fetch gallery slideshow images.");
    return [];
  }

  try {
    const slideshowImagesRef = ref(db, 'gallery_slideshow_images');
    const snapshot = await get(slideshowImagesRef);

    if (snapshot.exists()) {
      const imagesData: Record<string, GallerySlideshowImage> = snapshot.val();
      const imagesArray = Object.values(imagesData);
       // Sort by uploadedAt, most recent first
      return imagesArray.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    } else {
      console.log("No gallery slideshow images found in the database.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching gallery slideshow images from Firebase:", error);
    return [];
  }
}
