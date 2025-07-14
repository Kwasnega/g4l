
import { z } from "zod";

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  sizes: z.array(z.string()),
  colors: z.array(z.string()),
  images: z.array(z.string()),
  stock: z.number(),
  rating: z.number(),
  description: z.string().optional(),
});

export type Product = z.infer<typeof ProductSchema>;

export const GalleryImageSchema = z.object({
    id: z.string(),
    url: z.string().url(),
    uploadedAt: z.string(),
});

export type GalleryImage = z.infer<typeof GalleryImageSchema>;


// AI Flow: suggestDripCombos
export const SuggestDripCombosInputSchema = z.object({
  viewedProducts: z.array(ProductSchema).describe('An array of product objects that the user has viewed.'),
});
export type SuggestDripCombosInput = z.infer<typeof SuggestDripCombosInputSchema>;

export const SuggestDripCombosOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('An array of suggested clothing combinations.'),
});
export type SuggestDripCombosOutput = z.infer<typeof SuggestDripCombosOutputSchema>;

// AI Flow: supportChat
export const SupportChatInputSchema = z.object({
  query: z.string().describe("The user's question for the support bot."),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).describe('The conversation history.'),
});
export type SupportChatInput = z.infer<typeof SupportChatInputSchema>;

export const SupportChatOutputSchema = z.object({
  response: z.string().describe("The chatbot's response to the user's query."),
});
export type SupportChatOutput = z.infer<typeof SupportChatOutputSchema>;

// For displaying items in the cart and checkout pages
export type CartDisplayItem = {
  product: Product;
  quantity: number;
  size: string;
  color: string;
};

// For Order History
export const OrderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number(),
  size: z.string(),
  color: z.string(),
  price: z.number(),
  imageUrl: z.string(),
});

export const OrderSchema = z.object({
  id: z.string(), // The auto-generated key from Firebase
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  items: z.array(OrderItemSchema),
  total: z.number(),
  deliveryMethod: z.enum(['bolt', 'yango']),
  paymentMethod: z.literal('paystack'),
  address: z.string(),
  status: z.string(), // e.g. 'pending payment', 'processing'
  placedAt: z.string(), // ISO date string
  paystackReference: z.string().optional(),
});

export type Order = z.infer<typeof OrderSchema>;

export const GallerySlideshowImageSchema = z.object({
    id: z.string(),
    url: z.string().url(),
    uploadedAt: z.string(),
    public_id: z.string(),
});

export type GallerySlideshowImage = z.infer<typeof GallerySlideshowImageSchema>;
