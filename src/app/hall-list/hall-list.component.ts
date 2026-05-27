import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface HallItem {
  id?: string;
  name: string;
  description: string;
  location: string;
  capacity: number;
  hasProjector: boolean;
  hasAc: boolean;
  hasWhiteboard: boolean;
  status: boolean;
  belongs_to: string | null;
}

@Component({
  selector: 'app-hall-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './hall-list.component.html',
  styleUrl: './hall-list.component.css'
})
export class HallListComponent {
  halls: HallItem[] = [];
  isLoading = false;
  errorMessage = '';

  private readonly getActiveUrl = 'http://203.94.72.18/trainee/api/production/hall/get/all/active';

  constructor(private readonly http: HttpClient) {
    this.loadActiveHalls();
  }

  loadActiveHalls(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<unknown>(this.getActiveUrl).subscribe({
      next: (response) => {
        this.halls = this.extractHallList(response);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Active halls load karanna bari una. API eka check karanna.';
      }
    });
  }

  private extractHallList(response: unknown): HallItem[] {
    if (Array.isArray(response)) {
      return response as HallItem[];
    }

    if (
      typeof response === 'object' &&
      response !== null &&
      'data' in response &&
      Array.isArray((response as { data: unknown }).data)
    ) {
      return (response as { data: HallItem[] }).data;
    }

    return [];
  }
}
