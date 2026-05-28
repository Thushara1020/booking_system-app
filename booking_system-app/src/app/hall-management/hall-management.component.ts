import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthStateService } from '../core/auth-state.service';
import { BookingApiService } from '../core/booking-api.service';

type HallItem = {
  id: string;
  name: string;
  description: string;
  location: string;
  capacity: number | null;
  hasProjector: boolean;
  hasAc: boolean;
  hasWhiteboard: boolean;
  status: boolean;
};

type HallForm = {
  id: string;
  name: string;
  description: string;
  location: string;
  capacity: string;
  hasProjector: boolean;
  hasAc: boolean;
  hasWhiteboard: boolean;
  status: boolean;
};

@Component({
  selector: 'app-hall-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './hall-management.component.html',
  styleUrl: './hall-management.component.css'
})
export class HallManagementComponent implements OnInit {
  protected loading = false;
  protected saving = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected username = 'Admin';
  protected halls: HallItem[] = [];
  protected searchName = '';
  protected searchCapacity = '';
  protected modalOpen = false;
  protected editingHallId: string | null = null;
  protected form: HallForm = this.createEmptyForm();

  constructor(
    private readonly router: Router,
    private readonly authState: AuthStateService,
    private readonly bookingApi: BookingApiService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!this.authState.hasToken()) {
      await this.router.navigateByUrl('/login');
      return;
    }

    this.username = this.authState.getUsername() ?? 'Admin';
    await this.loadHalls();
  }

  protected get filteredHalls(): HallItem[] {
    const nameQuery = this.searchName.trim().toLowerCase();
    const capacityQuery = this.searchCapacity.trim();

    return this.halls.filter((hall) => {
      const matchesName = !nameQuery || hall.name.toLowerCase().includes(nameQuery);
      const matchesCapacity =
        !capacityQuery || `${hall.capacity ?? ''}`.includes(capacityQuery);

      return matchesName && matchesCapacity;
    });
  }

  protected get activeCount(): number {
    return this.halls.filter((hall) => hall.status).length;
  }

  protected get totalCount(): number {
    return this.halls.length;
  }

  protected async signOut(): Promise<void> {
    this.authState.clearSession();

    await this.router.navigateByUrl('/login');
  }

  protected openCreateModal(): void {
    this.editingHallId = null;
    this.form = this.createEmptyForm();
    this.modalOpen = true;
  }

  protected openEditModal(hall: HallItem): void {
    this.editingHallId = hall.id;
    this.form = {
      id: hall.id,
      name: hall.name,
      description: hall.description,
      location: hall.location,
      capacity: hall.capacity === null ? '' : `${hall.capacity}`,
      hasProjector: hall.hasProjector,
      hasAc: hall.hasAc,
      hasWhiteboard: hall.hasWhiteboard,
      status: hall.status
    };
    this.modalOpen = true;
  }

  protected closeModal(): void {
    this.modalOpen = false;
    this.editingHallId = null;
    this.form = this.createEmptyForm();
  }

  protected async saveHall(): Promise<void> {
    if (!this.form.name.trim() || !this.form.location.trim()) {
      this.errorMessage = 'Name and location are required.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      id: this.editingHallId ?? undefined,
      name: this.form.name.trim(),
      description: this.form.description.trim(),
      location: this.form.location.trim(),
      capacity: this.form.capacity.trim() ? Number(this.form.capacity) : null,
      hasProjector: this.form.hasProjector,
      hasAc: this.form.hasAc,
      hasWhiteboard: this.form.hasWhiteboard,
      status: this.form.status
    };

    try {
      const request$ = this.editingHallId
        ? this.bookingApi.updateHall(payload)
        : this.bookingApi.saveHall(payload);

      await firstValueFrom(request$);

      this.successMessage = this.editingHallId ? 'Hall updated successfully.' : 'Hall saved successfully.';
      this.closeModal();
      await this.loadHalls();
    } catch (error) {
      this.errorMessage = this.extractErrorMessage(error, 'Unable to save hall.');
    } finally {
      this.saving = false;
    }
  }

  protected async loadHalls(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const payload = (await firstValueFrom(this.bookingApi.getActiveHalls())) as unknown;
      this.halls = this.normalizeHalls(payload);
    } catch (error) {
      this.halls = [];
      this.errorMessage = this.extractErrorMessage(error, 'Unable to load halls.');
    } finally {
      this.loading = false;
    }
  }

  protected normalizeHalls(payload: unknown): HallItem[] {
    return this.extractItems(payload).map((item, index) => {
      const record = item as Record<string, unknown>;

      return {
        id: this.stringValue(record, ['id', 'hallId', 'uuid']) ?? `hall-${index + 1}`,
        name: this.stringValue(record, ['name', 'hallName', 'title']) ?? `Hall ${index + 1}`,
        description: this.stringValue(record, ['description', 'detail', 'notes']) ?? 'No description provided.',
        location: this.stringValue(record, ['location', 'hallLocation', 'place']) ?? 'Unknown location',
        capacity: this.numberValue(record, ['capacity', 'seatingCapacity', 'seatCount']) ?? null,
        hasProjector: this.booleanValue(record, ['hasProjector', 'projector', 'isProjectorAvailable']),
        hasAc: this.booleanValue(record, ['hasAc', 'ac', 'airConditioning', 'isAcAvailable']),
        hasWhiteboard: this.booleanValue(record, ['hasWhiteboard', 'whiteboard', 'isWhiteboardAvailable']),
        status: this.booleanValue(record, ['status', 'active', 'isActive'])
      };
    });
  }

  protected createEmptyForm(): HallForm {
    return {
      id: '',
      name: '',
      description: '',
      location: '',
      capacity: '',
      hasProjector: false,
      hasAc: false,
      hasWhiteboard: false,
      status: true
    };
  }

  protected extractItems(payload: unknown): unknown[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const record = payload as Record<string, unknown>;
    const keys = ['data', 'items', 'content', 'halls', 'records', 'result'];

    for (const key of keys) {
      const value = record[key];

      if (Array.isArray(value)) {
        return value;
      }
    }

    return [];
  }

  protected stringValue(record: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }

      if (typeof value === 'number') {
        return `${value}`;
      }
    }

    return undefined;
  }

  protected numberValue(record: Record<string, unknown>, keys: string[]): number | undefined {
    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string') {
        const parsedValue = Number(value);

        if (Number.isFinite(parsedValue)) {
          return parsedValue;
        }
      }
    }

    return undefined;
  }

  protected booleanValue(record: Record<string, unknown>, keys: string[]): boolean {
    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'number') {
        return value !== 0;
      }

      if (typeof value === 'string') {
        const normalizedValue = value.trim().toLowerCase();

        if (['true', '1', 'yes', 'active', 'enabled'].includes(normalizedValue)) {
          return true;
        }

        if (['false', '0', 'no', 'inactive', 'disabled'].includes(normalizedValue)) {
          return false;
        }
      }
    }

    return false;
  }

  protected extractErrorMessage(error: unknown, fallbackMessage: string): string {
    if (!error || typeof error !== 'object') {
      return fallbackMessage;
    }

    const record = error as Record<string, unknown> & { error?: unknown; message?: unknown };
    const nested = record.error as Record<string, unknown> | undefined;

    if (nested) {
      const nestedMessage = this.stringValue(nested, ['message', 'error', 'detail']);

      if (nestedMessage) {
        return nestedMessage;
      }
    }

    const directMessage = this.stringValue(record, ['message']);

    return directMessage ?? fallbackMessage;
  }
}