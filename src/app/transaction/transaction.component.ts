import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatIconModule, MatIcon } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TransactionDialogComponent } from './transaction-dialog.component';
import { AuthService } from '../services/auth.service';
import { enviort } from '../../environments/environment';
import { Party } from '../interface/party';
import { Transaction } from '../interface/Transaction';
import { DataStoreService } from '../services/data-store.service';
import { formatDateLocal, getTodayLocal, parseLocalDate } from '../utils/date.utils';


@Component({
  selector: 'app-transaction',
  templateUrl: './transaction.component.html',
  styleUrls: ['./transaction.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, FormsModule, MatIcon, MatDatepickerModule, MatNativeDateModule]
})
export class TransactionComponent implements OnInit {
  transactions: Transaction[] = [];
  startDate: string = '';
  endDate: string = '';
  filteredTransactions: Transaction[] = [];
  displayedColumns = ['id', 'party', 'paymentDate', 'transactionType', 'amount', 'paymentMethod', 'referenceNo', 'notes'];
  maxDate = new Date(); // Today as maximum date
  minEndDate: Date | null = null; // Minimum date for end date picker

  constructor(private http: HttpClient, private dialog: MatDialog, private authService: AuthService, private router: Router, private store: DataStoreService) {}

  ngOnInit() {
    this.loadTransactions();
  }

  loadTransactions() {
    this.http.get<Transaction[]>(
      enviort.paymentUrl,
      { headers: this.authService.getAuthHeaders() }
    ).subscribe(
      data => {
        this.transactions = data;
        this.applyDateFilter();
      },
      error => {
        console.error('Failed to load transactions:', error);
      }
    );
  }

  applyDateFilter() {
    // Update minimum end date when start date changes
    if (this.startDate) {
      this.minEndDate = parseLocalDate(this.startDate);
    } else {
      this.minEndDate = null;
    }
    
    let filtered = this.transactions.slice();
    if (this.startDate) {
      const s = parseLocalDate(this.startDate);
      filtered = filtered.filter(t => {
        if (!t.paymentDate) return false;
        const tDate = parseLocalDate(t.paymentDate);
        return tDate >= s;
      });
    }
    if (this.endDate) {
      const e = parseLocalDate(this.endDate);
      filtered = filtered.filter(t => {
        if (!t.paymentDate) return false;
        const tDate = parseLocalDate(t.paymentDate);
        return tDate <= e;
      });
    }
    this.filteredTransactions = filtered;
  }

  addTransaction() {
    const dialogRef = this.dialog.open(TransactionDialogComponent, {
      width: '500px',
      data: {
        id: 0,
        party: null,
        paymentDate: getTodayLocal(),
        paidAmount: 0,
        paymentMode: 'Cash',
        remarks: '',
        totalAmount: 0,
        invoiceNo: '',
        dueAmount: 0
      } as unknown as Transaction,
      disableClose: false
    });
    dialogRef.afterClosed().subscribe((result: Transaction) => {
      if (result) {
        this.http.post(
          enviort.paymentUrl,
          result,
          { headers: this.authService.getAuthHeaders() }
        ).subscribe(() => {
          this.loadTransactions();
        },
        error => {
          console.error('Failed to add transaction:', error);
          alert('Failed to add transaction. Please try again.');
        });
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
    filterTransactions() {
    // Build query params for startDate and endDate
    let params: any = {};
    if (this.startDate) params.startDate = this.formatDate(this.startDate);
    if (this.endDate) params.endDate = this.formatDate(this.endDate);
    this.http.get<Transaction[]>(
      enviort.paymentUrl,
      { headers: this.authService.getAuthHeaders(), params }
    ).subscribe(
      data => {
        this.transactions = data;
        this.applyDateFilter();
      },
      error => {
        console.error('Failed to load filtered transactions:', error);
      }
    );
  }

  formatDate(date: any): string {
    return formatDateLocal(date);
  }
}
