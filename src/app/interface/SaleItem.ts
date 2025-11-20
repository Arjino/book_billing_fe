import { Book } from "./book";

export interface SalesItem {
  id: number;
  sale: any;
  book: Book;
  qty: number;
  rate: number;
  amount: number;
}