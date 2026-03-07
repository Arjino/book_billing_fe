import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { OrderByPipe } from '../pipes/order-by.pipe';
import { DataStoreService } from '../services/data-store.service';
import { DashboardService } from '../services/dashboard.service';
import { Sale } from '../interface/Sale';
import { Transaction } from '../interface/Transaction';
import { formatDateLocal, formatDateForAPI, getTodayLocal } from '../utils/date.utils';
import { Party } from '../interface/party';
import { DASHBOARD_CONSTANTS } from '../constants/dashboard.constants';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, OrderByPipe],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit {
  // Sales Data
  totalSales: number = 0;
  dailySales: number = 0;
  totalRevenue: number = 0;
  averageOrderValue: number = 0;
  salesTodayAmount: number = 0;
  salesTodayCount: number = 0;
  weekSalesAmount: number = 0;
  monthSalesAmount: number = 0;

  // Transaction Data
  totalTransactions: number = 0;
  dailyTransactions: number = 0;
  totalTransactionAmount: number = 0;
  paymentsTodayAmount: number = 0;
  paymentsTodayCount: number = 0;

  // Party Data
  totalParties: number = 0;
  activeParties: number = 0;

  // Chart Data
  salesChartData: any[] = [];
  partySalesData: any[] = [];
  topProducts: any[] = [];
  dailySalesData: any[] = [];
  
  // Book/Product Data
  totalBooks: number = 0;
  topSellingBooks: any[] = [];
  lowStockBooks: any[] = [];

  // AI Insights
  insights: string[] = [];
  bestPerformingDay: string = '';
  recommendedActions: string[] = [];

  constructor(private store: DataStoreService, private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadAnalyticsData();
    this.loadStatsFromApi();
  }

  private loadAnalyticsData() {
    // Load all required data
    this.store.getSales().subscribe(sales => {
      this.processSalesData(sales || []);
    });

    this.store.getTransactions().subscribe(transactions => {
      this.processTransactionData(transactions || []);
    });

    this.store.getParties().subscribe(parties => {
      this.processPartyData(parties || []);
    });

    this.store.getBooks().subscribe(books => {
      this.processBookData(books || []);
    });
  }

  private loadStatsFromApi(): void {
    this.dashboardService.getDashboardStats().subscribe({
      next: (stats) => {
        this.salesTodayAmount = stats.salesTodayAmount || 0;
        this.salesTodayCount = stats.salesTodayCount || 0;
        if (this.salesTodayCount > 0) {
          this.dailySales = this.salesTodayCount;
        }

        this.paymentsTodayAmount = stats.paymentsTodayAmount || 0;
        this.paymentsTodayCount = stats.paymentsTodayCount || 0;
        if (this.paymentsTodayCount > 0) {
          this.dailyTransactions = this.paymentsTodayCount;
        }

        this.weekSalesAmount = stats.weekSalesAmount || 0;
        this.monthSalesAmount = stats.monthSalesAmount || 0;

        if (typeof stats.totalBooks === 'number') {
          this.totalBooks = stats.totalBooks;
        }

        if (typeof stats.totalParties === 'number') {
          this.totalParties = stats.totalParties;
        }

        if (Array.isArray(stats.last7DaysSales) && stats.last7DaysSales.length) {
          this.dailySalesData = stats.last7DaysSales.map((entry) => ({
            date: new Date(entry.date),
            amount: entry.amount || 0
          }));
        }
      },
      error: (error) => {
        console.error(DASHBOARD_CONSTANTS.MESSAGES.FETCH_ERROR, error);
      }
    });
  }

  private processSalesData(sales: Sale[]) {
    if (!sales || sales.length === 0) return;

    this.totalSales = sales.length;

    // Calculate today's sales
    const today = getTodayLocal();
    const todaysSales = sales.filter(s => {
      const saleDate = formatDateLocal(s.date);
      return saleDate === today;
    });
    this.dailySales = todaysSales.length;

    // Calculate revenue
    this.totalRevenue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
    this.averageOrderValue = this.totalSales > 0 ? this.totalRevenue / this.totalSales : 0;

    // Group sales by party for pie chart
    const partySalesMap = new Map<string, number>();
    sales.forEach(sale => {
      const party = sale.party;
      const amount = sale.totalAmount || 0;
      if (party) {
        const partyName = typeof party === 'object' ? party.name : party;
        partySalesMap.set(partyName, (partySalesMap.get(partyName) || 0) + amount);
      }
    });

    this.partySalesData = Array.from(partySalesMap.entries()).map(([partyName, amount]) => ({
      id: partyName,
      value: amount
    }));

    // Generate daily sales for last 7 days
    this.generateDailySalesData(sales);

    // Generate insights
    this.generateInsights(sales);
  }

  private processTransactionData(transactions: Transaction[]) {
    if (!transactions || transactions.length === 0) return;

    this.totalTransactions = transactions.length;

    // Calculate today's transactions
    const today = getTodayLocal();
    const todaysTransactions = transactions.filter(t => {
      const txDate = formatDateLocal(t.paymentDate);
      return txDate === today;
    });
    this.dailyTransactions = todaysTransactions.length;

    // Calculate total transaction amount
    this.totalTransactionAmount = transactions.reduce((sum, tx) => sum + (tx.paidAmount || 0), 0);
  }

  private processPartyData(parties: Party[]) {
    if (!parties || parties.length === 0) return;

    this.totalParties = parties.length;
    
    // Assume active parties are those with type 'Buyer' or 'Supplier'
    this.activeParties = parties.filter(p => p.type && p.type.toLowerCase() !== 'inactive').length;
  }

  private processBookData(books: any[]) {
    if (!books || books.length === 0) return;

    this.totalBooks = books.length;
    
    // Find low stock books (stock < 5)
    this.lowStockBooks = books
      .filter(b => b.stock < 5)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);
  }

  private generateDailySalesData(sales: Sale[]) {
    if (this.dailySalesData.length > 0) return;

    const dailyMap = new Map<string, number>();
    
    // Generate for last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = formatDateForAPI(date);
      dailyMap.set(dateStr, 0);
    }

    // Add sales data
    sales.forEach(sale => {
      const saleDate = formatDateForAPI(new Date(sale.date));
      if (dailyMap.has(saleDate)) {
        dailyMap.set(saleDate, (dailyMap.get(saleDate) || 0) + (sale.totalAmount || 0));
      }
    });

    this.dailySalesData = Array.from(dailyMap.entries()).map(([date, amount]) => ({
      date: new Date(date),
      amount
    }));
  }

  private generateInsights(sales: Sale[]) {
    this.insights = [];
    this.recommendedActions = [];

    // Insight 1: Sales trend
    if (this.dailySales > 0) {
      const avgDailySales = this.totalSales / 30; // Approximate
      const growth = ((this.dailySales - avgDailySales) / avgDailySales * 100).toFixed(1);
      this.insights.push(`📈 Today's sales are ${Math.abs(parseFloat(growth))}% ${parseFloat(growth) >= 0 ? 'above' : 'below'} average`);
    }

    // Insight 2: Revenue milestone
    if (this.totalRevenue > 100000) {
      this.insights.push(`💰 Congratulations! Total revenue exceeded ₹${(this.totalRevenue / 1000).toFixed(0)}K`);
    }

    // Insight 3: Average order value
    if (this.averageOrderValue > 0) {
      this.insights.push(`📊 Average order value is ₹${this.averageOrderValue.toFixed(2)}`);
    }

    // Recommended Actions
    if (this.lowStockBooks.length > 0) {
      this.recommendedActions.push(`⚠️ ${this.lowStockBooks.length} book(s) have low stock - consider reordering`);
    }

    if (this.totalParties === 0) {
      this.recommendedActions.push(`👥 No parties added yet - start by adding your first party`);
    }

    if (this.totalSales === 0) {
      this.recommendedActions.push(`🛍️ Record your first sale to start tracking revenue`);
    }

    if (this.recommendedActions.length === 0) {
      this.recommendedActions.push(`✨ Keep up the great work! Everything is running smoothly`);
    }
  }

  getGrowthPercentage(): number {
    if (this.totalSales === 0) return 0;
    const avgDailySales = this.totalSales / 30;
    return avgDailySales > 0 ? ((this.dailySales - avgDailySales) / avgDailySales) * 100 : 0;
  }

  getRevenueGrowth(): string {
    const growth = this.getGrowthPercentage();
    return growth >= 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
  }
}
