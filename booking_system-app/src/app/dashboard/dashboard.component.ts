import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
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

type BookingItem = {
  reference: string;
  guest: string;
  hall: string;
  date: string;
  time: string;
  status: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  protected loading = false;
  protected errorMessage = '';
  protected username = 'Admin';
  protected activeHalls: HallItem[] = [];
  protected upcomingBookings: BookingItem[] = [];

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
    await this.loadDashboardData();
  }

  protected get activeHallCount(): number {
    return this.activeHalls.length;
  }

  protected get bookingCount(): number {
    return this.upcomingBookings.length;
  }

  protected async signOut(): Promise<void> {
    this.authState.clearSession();
    await this.router.navigateByUrl('/login');
  }

  protected async loadDashboardData(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const [hallsPayload, bookingsPayload] = await Promise.all([
        firstValueFrom(this.bookingApi.getActiveHalls()),
        firstValueFrom(this.bookingApi.getAllBookings())
      ]);

      this.activeHalls = this.normalizeHalls(hallsPayload);
      this.upcomingBookings = this.normalizeBookings(bookingsPayload).slice(0, 4);
    } catch (error) {
      this.activeHalls = [];
      this.upcomingBookings = [];
      this.errorMessage = this.extractErrorMessage(error, 'Unable to load dashboard data.');
    } finally {
      this.loading = false;
    }
  }

  protected normalizeHalls(payload: unknown): HallItem[] {
    const rawItems = this.extractItems(payload);

    return rawItems.map((item, index) => {
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

  protected normalizeBookings(payload: unknown): BookingItem[] {
    return this.extractItems(payload).map((item, index) => {
      const record = item as Record<string, unknown>;
      const bookingDate = this.stringValue(record, ['bookingDate', 'date', 'bookingDay']) ?? 'N/A';
      const startTime = this.timeValue(record, ['startTime', 'fromTime', 'start']) ?? '00:00';
      const endTime = this.timeValue(record, ['endTime', 'toTime', 'end']) ?? '00:00';

      return {
        reference: this.stringValue(record, ['id', 'bookingId', 'reference']) ?? `BK-${index + 1}`,
        guest: this.stringValue(record, ['guest', 'guestName', 'name', 'customerName']) ?? 'Guest',
        hall: this.stringValue(record, ['hallName', 'hall', 'name']) ?? 'Hall',
        date: bookingDate,
        time: `${startTime} - ${endTime}`,
        status: this.bookingStatusValue(record, ['status', 'bookingStatus', 'state'])
      };
    });
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

      if (value && typeof value === 'object') {
        const nested = value as Record<string, unknown>;

        for (const nestedKey of keys) {
          const nestedValue = nested[nestedKey];

          if (Array.isArray(nestedValue)) {
            return nestedValue;
          }
        }
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

  protected timeValue(record: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim().slice(0, 5);
      }
    }

    return undefined;
  }

  protected bookingStatusValue(record: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();

        if (normalized.includes('cancel')) {
          return 'Cancelled';
        }

        if (normalized.includes('approve') || normalized.includes('confirm') || normalized.includes('verify')) {
          return 'Confirmed';
        }

        return value;
      }
    }

    return 'Pending';
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