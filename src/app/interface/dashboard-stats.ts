export interface DashboardStats {
  totalBooks: number;
  totalBookStock: number;
  totalParties: number;
  salesTodayAmount: number;
  salesTodayCount: number;
  paymentsTodayAmount: number;
  paymentsTodayCount: number;
  weekSalesAmount: number;
  monthSalesAmount: number;
  last7DaysSales: { date: string; amount: number }[];
}
