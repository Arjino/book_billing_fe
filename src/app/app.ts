import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { AuthService } from './services/auth.service';
import { CompanyService } from './services/company.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingSpinnerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('billingapp');

  constructor(
    private authService: AuthService,
    private companyService: CompanyService
  ) {}

  ngOnInit(): void {
    // Covers page refresh / direct deep-link navigation, where login.component's post-login
    // fetch never runs -- branding still needs to load from the already-stored session.
    // ensureValidSession() refreshes an expired access token via the refresh token first,
    // instead of treating a lapsed access token as a logout.
    this.authService.ensureValidSession().subscribe(valid => {
      if (valid) {
        this.companyService.fetchMe().subscribe({ error: () => {} });
      }
    });
  }
}
