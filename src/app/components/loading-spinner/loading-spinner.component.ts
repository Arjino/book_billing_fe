import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoadingService } from '../../services/loading.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.css']
})
export class LoadingSpinnerComponent implements OnInit {
  isLoading$: Observable<boolean>;
  loadingText$: Observable<string>;

  constructor(private loadingService: LoadingService) {
    this.isLoading$ = this.loadingService.isLoading();
    this.loadingText$ = this.loadingService.getLoadingText();
  }

  ngOnInit(): void {
  }
}
