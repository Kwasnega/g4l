
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
      const productsData = snapshot.val();
      console.log("Client Products: Raw data from Firebase:", productsData);
      console.log("Client Products: Data type:", typeof productsData);
      console.log("Client Products: Is array:", Array.isArray(productsData));

      // Handle both array and object formats
      let productsArray: (Product | null)[];
      if (Array.isArray(productsData)) {
        productsArray = productsData;
      } else if (typeof productsData === 'object' && productsData !== null) {
        // Convert object to array, filtering out null/undefined values
        productsArray = Object.values(productsData);
      } else {
        console.log("Unexpected products data format:", typeof productsData);
        return { products: [] };
      }

      const validProducts = productsArray.filter((p): p is Product =>
        p !== null &&
        p !== undefined &&
        p.id !== undefined &&
        p.id !== 'storeSettings' && // Filter out store settings
        typeof p.price === 'number' && // Ensure it's a valid product
        !('isStoreOpen' in p) // Filter out store settings by property
      );
      const sortedProducts = validProducts.sort((a, b) => (a.name > b.name ? 1 : -1));
      console.log("Client Products: Valid products found:", validProducts.length);
      console.log("Client Products: Final products:", limit ? sortedProducts.slice(0, limit) : sortedProducts);
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
    // Since products are stored in an array, we need to fetch all products and find by ID
    const productsRef = ref(db, 'products/products');
    const snapshot = await get(productsRef);

    if (snapshot.exists()) {
      const productsData = snapshot.val();

      // Handle both array and object formats
      let productsArray: (Product | null)[];
      if (Array.isArray(productsData)) {
        productsArray = productsData;
      } else if (typeof productsData === 'object' && productsData !== null) {
        productsArray = Object.values(productsData);
      } else {
        return null;
      }

      const product = productsArray.find((p): p is Product =>
        p !== null &&
        p !== undefined &&
        p.id === id &&
        p.id !== 'storeSettings' && // Filter out store settings
        typeof p.price === 'number' && // Ensure it's a valid product
        !('isStoreOpen' in p) // Filter out store settings by property
      );
      return product || null;
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
