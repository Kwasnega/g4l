
'use server';

import { db } from './firebase';
import { ref, set, get, push } from 'firebase/database';
import type { Product } from '@/types';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ProductFormSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  stock: z.number(),
  images: z.array(z.string().url()),
  colors: z.array(z.string()),
  sizes: z.array(z.string()),
});

type ProductFormValues = z.infer<typeof ProductFormSchema>;

export async function saveProduct(
  data: ProductFormValues,
  productId?: string | null
) {
  try {
    const productsRef = ref(db, 'products/products');
    let targetProductId = productId;

    // Find the next available ID if it's a new product
    if (!targetProductId) {
      const snapshot = await get(productsRef);
      const products: (Product | null)[] = snapshot.val() || [];
      const highestId = products.reduce((max, p) => (p && parseInt(p.id) > max ? parseInt(p.id) : max), 0);
      targetProductId = (highestId + 1).toString();
    }
    
    const productRef = ref(db, `products/products/${targetProductId}`);

    const productData: Product = {
      ...data,
      id: targetProductId,
      rating: productId ? (await get(productRef)).val()?.rating || 0 : 0, // Preserve rating on edit
    };
    
    await set(productRef, productData);
    
    revalidatePath('/admin/products');
    revalidatePath('/products');
    revalidatePath(`/products/${targetProductId}`);
    revalidatePath('/');

    return { success: true, productId: targetProductId };
  } catch (error) {
    console.error('Failed to save product:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred.',
    };
  }
}

export async function deleteProduct(productId: string) {
  try {
    const productRef = ref(db, `products/products/${productId}`);
    await set(productRef, null); // Deleting by setting to null in an array-like structure
    
    revalidatePath('/admin/products');
    revalidatePath('/products');
    revalidatePath('/');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete product:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred.',
    };
  }
}
