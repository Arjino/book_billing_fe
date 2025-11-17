import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../services/auth.service';
import { BookingComponent } from '../booking.component';
import { PartiesComponent } from '../parties.component';
import { SalesComponent } from '../sales.component';
import { InvoicePreviewComponent } from '../invoice-preview.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatToolbarModule,
    MatMenuModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatDialogModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  accessToken = signal<string | null>(null);
  isLoggedIn = signal(false);
  cards = [
    {
      icon: 'analytics',
      iconColor: 'text-blue-600',
      title: 'Analytics',
      description: 'View your analytics and insights',
      button: 'View'
    },
    {
      icon: 'people',
      iconColor: 'text-purple-600',
      title: 'Users',
      description: 'Manage users and permissions',
      button: 'View'
    },
    {
      icon: 'settings',
      iconColor: 'text-pink-600',
      title: 'Settings',
      description: 'Configure your preferences',
      button: 'View'
    },
    {
      icon: 'book',
      iconColor: 'text-green-600',
      title: 'Booking',
      component: BookingComponent
    },
    {
      icon: 'business',
      iconColor: 'text-orange-600',
      title: 'Parties',
      component: PartiesComponent
    },
    {
      icon: 'shopping_cart',
      iconColor: 'text-red-600',
      title: 'Sales',
      component: SalesComponent
    },
    {
      icon: 'picture_as_pdf',
      iconColor: 'text-indigo-600',
      title: 'Invoice PDF',
      description: 'Download and preview invoice PDF by Sale ID',
      pdfCard: true
    }
  ];
  invoiceSaleId: string = '';
  showInvoicePreview: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Check if user is logged in
    this.isLoggedIn.set(this.authService.isLoggedIn());

    // Get and display access token
    const token = this.authService.getAccessToken();
    if (token) {
      // Display only first and last 20 chars for security
      const displayToken = token.substring(0, 20) + '...' + token.substring(token.length - 20);
      this.accessToken.set(displayToken);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  copyToken(): void {
    const token = this.authService.getAccessToken();
    if (token) {
      navigator.clipboard.writeText(token).then(() => {
        alert('Token copied to clipboard!');
      });
    }
  }

  onDownloadInvoice() {
    if (this.invoiceSaleId) {
      this.dialog.open(InvoicePreviewComponent, {
        data: { salesId: this.invoiceSaleId },
        width: '800px',
        maxWidth: '95vw',
        panelClass: 'invoice-dialog'
      });
    }
  }
}
