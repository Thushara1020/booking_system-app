import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hall-list.component.html',
  styleUrl: './hall-list.component.css'
})
export class HallListComponent implements OnInit {
  readonly halls = signal<HallItem[]>([]);
  readonly isLoading = signal(false);
  errorMessage = '';

  private readonly getActiveUrl = 'http://203.94.72.18/trainee/api/production/hall/get/all/active';
  private readonly http = inject(HttpClient);

  ngOnInit(): void {
    this.loadActiveHalls();
  }

  loadActiveHalls(): void {
    this.isLoading.set(true);
    this.errorMessage = '';

    this.http.get<unknown>(this.getActiveUrl).subscribe({
      next: (response) => {
        this.halls.set(this.extractHallList(response));
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.errorMessage = this.extractErrorMessage(error);
      }
    });
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const errorBody = error.error as Record<string, unknown> | string | null;

    if (typeof errorBody === 'string' && errorBody.trim()) {
      return errorBody;
    }

    if (errorBody && typeof errorBody === 'object') {
      const message = errorBody['message'] ?? errorBody['error'] ?? errorBody['detail'];
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    if (error.status === 401 || error.status === 403) {
      return 'Unauthorized. Please sign in again to load active halls.';
    }

    return 'Active halls load karanna bari una. API eka check karanna.';
  }

  private extractHallList(response: unknown): HallItem[] {
    const candidateArrays = this.collectCandidateArrays(response);

    for (const candidate of candidateArrays) {
      if (candidate.length > 0) {
        return candidate.map((hall) => this.normalizeHall(hall)).filter(Boolean) as HallItem[];
      }
    }

    return [];
  }

  private collectCandidateArrays(response: unknown): unknown[][] {
    const candidates: unknown[][] = [];

    if (Array.isArray(response)) {
      candidates.push(response);
    }

    if (typeof response === 'object' && response !== null) {
      const record = response as Record<string, unknown>;
      const candidateKeys = ['data', 'items', 'content', 'result', 'rows', 'halls', 'activeHalls'];

      for (const key of candidateKeys) {
        const value = record[key];
        if (Array.isArray(value)) {
          candidates.push(value);
        }
      }
    }

    return candidates;
  }

  private normalizeHall(hall: unknown): HallItem | null {
    if (typeof hall !== 'object' || hall === null) {
      return null;
    }

    const record = hall as Record<string, unknown>;
    const belongsTo = record['belongs_to'] ?? record['belongsTo'];

    return {
      id: record['id'] != null ? String(record['id']) : undefined,
      name: String(record['name'] ?? ''),
      description: String(record['description'] ?? ''),
      location: String(record['location'] ?? ''),
      capacity: Number(record['capacity'] ?? 0),
      hasProjector: Boolean(record['hasProjector']),
      hasAc: Boolean(record['hasAc']),
      hasWhiteboard: Boolean(record['hasWhiteboard']),
      status: Boolean(record['status']),
      belongs_to:
        belongsTo === null || typeof belongsTo === 'string' ? (belongsTo as string | null) : null
    };
  }
}
