import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface HallPayload {
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
  selector: 'app-hall-save',
  imports: [CommonModule, FormsModule],
  templateUrl: './hall-save.component.html',
  styleUrl: './hall-save.component.css'
})
export class HallSaveComponent {
  private readonly maxCapacity = 1000;
  message = '';
  isSuccess = false;
  isSaving = false;
  isLoadingActive = false;
  selectedHallId = '';
  activeHalls: HallPayload[] = [];

  hall: HallPayload = {
    id: 'c62b48fa-86b2-4d24-8b6a-9351df95eef9',
    name: 'Main Auditorium - Updated',
    description: 'Updated description with new sound setup.',
    location: 'Building A - 3rd Floor',
    capacity: 180,
    hasProjector: true,
    hasAc: true,
    hasWhiteboard: true,
    status: true,
    belongs_to: null
  };

  private readonly saveUrl = 'http://203.94.72.18/trainee/api/production/hall/save';
  private readonly getActiveUrl = 'http://203.94.72.18/trainee/api/production/hall/get/all/active';

  constructor(private readonly http: HttpClient) {
    this.loadActiveHalls();
  }

  loadActiveHalls(): void {
    this.isLoadingActive = true;

    this.http.get<unknown>(this.getActiveUrl).subscribe({
      next: (response) => {
        this.isLoadingActive = false;
        const halls = this.extractHallList(response);
        this.activeHalls = halls;
      },
      error: () => {
        this.isLoadingActive = false;
        this.message = 'Unable to load active halls from API.';
        this.isSuccess = false;
      }
    });
  }

  onHallSelect(): void {
    const selected = this.activeHalls.find((hall) => hall.id === this.selectedHallId);

    if (!selected) {
      return;
    }

    this.hall = {
      id: selected.id,
      name: selected.name,
      description: selected.description,
      location: selected.location,
      capacity: selected.capacity,
      hasProjector: selected.hasProjector,
      hasAc: selected.hasAc,
      hasWhiteboard: selected.hasWhiteboard,
      status: selected.status,
      belongs_to: selected.belongs_to ?? null
    };
    this.message = '';
  }

  onCapacityInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const parsedValue = Number(input.value);

    if (Number.isNaN(parsedValue)) {
      return;
    }

    const boundedValue = Math.min(Math.max(parsedValue, 1), this.maxCapacity);

    if (boundedValue !== parsedValue) {
      input.value = String(boundedValue);
    }

    this.hall.capacity = boundedValue;
  }

  saveHall(): void {
    this.isSaving = true;
    this.message = '';

    this.http.post(this.saveUrl, this.hall).subscribe({
      next: () => {
        this.isSaving = false;
        this.isSuccess = true;
        this.message = this.hall.id ? 'Hall updated successfully.' : 'Hall saved successfully.';
        this.loadActiveHalls();
      },
      error: () => {
        this.isSaving = false;
        this.isSuccess = false;
        this.message = 'Hall save/update failed. Please check API availability and try again.';
      }
    });
  }

  private extractHallList(response: unknown): HallPayload[] {
    if (Array.isArray(response)) {
      return response as HallPayload[];
    }

    if (
      typeof response === 'object' &&
      response !== null &&
      'data' in response &&
      Array.isArray((response as { data: unknown }).data)
    ) {
      return (response as { data: HallPayload[] }).data;
    }

    return [];
  }
}
