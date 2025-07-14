
import { getProductById, getProducts } from "@/lib/data";
import { notFound } from "next/navigation";
import { ProductDetails } from "@/components/product-details";

type ProductPageProps = {
  params: {
    productId: string;
  };
};

export async function generateStaticParams() {
  const { products } = await getProducts();
  return products.map((product) => ({
    productId: product.id,
  }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductById(params.productId);

  if (!product) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <ProductDetails product={product} />
    </div>
  );
}
