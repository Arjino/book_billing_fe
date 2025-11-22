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
import { TransactionDialogComponent } from './transaction-dialog.component';
import { AuthService } from '../services/auth.service';
import { enviort } from '../../environments/environment';
import { Party } from '../interface/party';
import { Transaction } from '../interface/Transaction';


@Component({
  selector: 'app-transaction',
  templateUrl: './transaction.component.html',
  styleUrls: ['./transaction.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, FormsModule, MatIcon]
})
export class TransactionComponent implements OnInit {
  transactions: Transaction[] = [];
  parties: Party[] = [];
  displayedColumns = ['id', 'party', 'paymentDate', 'transactionType', 'amount', 'paymentMethod', 'referenceNo', 'notes', 'action'];

  constructor(private http: HttpClient, private dialog: MatDialog, private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.loadParties();
    this.loadTransactions();
  }

  loadParties() {
    this.http.get<Party[]>(
      enviort.partiesUrl,
      { headers: this.authService.getAuthHeaders() }
    ).subscribe(data => {
      this.parties = data;
    });
  }

  loadTransactions() {
    this.http.get<Transaction[]>(
      enviort.paymentUrl,
      { headers: this.authService.getAuthHeaders() }
    ).subscribe(
      data => {
        this.transactions = data;
      },
      error => {
        console.error('Failed to load transactions:', error);
      }
    );
  }

  addTransaction() {
    const dialogRef = this.dialog.open(TransactionDialogComponent, {
      width: '600px',
      data: {
        id: 0,
        party: null,
        paymentDate: new Date().toISOString().split('T')[0],
        paidAmount: 0,
        paymentMode: 'Cash',
        referenceNo: '',
        remarks: '',
        totalAmount: 0,
        dueAmount: 0
      } as unknown as Transaction,
      disableClose: false
    });

    const instance = dialogRef.componentInstance as any;
    instance.parties = this.parties;

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
}
