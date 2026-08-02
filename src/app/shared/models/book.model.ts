/** A catalog title/SKU tracked in inventory. Used across booking, sales, and purchase features. */
export interface Book {
  id: number;
  sku: string;
  title: string;
  publisher: string;
  hsn: string;
  mrp: number;
  stock: number;
}
