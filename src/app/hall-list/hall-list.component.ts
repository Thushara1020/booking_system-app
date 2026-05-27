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

    return {
      id: typeof record['id'] === 'string' ? record['id'] : undefined,
      name: String(record['name'] ?? ''),
      description: String(record['description'] ?? ''),
      location: String(record['location'] ?? ''),
      capacity: Number(record['capacity'] ?? 0),
      hasProjector: Boolean(record['hasProjector']),
      hasAc: Boolean(record['hasAc']),
      hasWhiteboard: Boolean(record['hasWhiteboard']),
      status: Boolean(record['status']),
      belongs_to:
        record['belongs_to'] === null || typeof record['belongs_to'] === 'string'
          ? (record['belongs_to'] as string | null)
          : null
    };
  }
}
