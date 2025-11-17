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
    MatDividerModule
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
  }
];
  constructor(
    private authService: AuthService,
    private router: Router
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
}
