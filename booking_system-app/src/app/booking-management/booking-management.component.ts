import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { firstValueFrom } from 'rxjs';
import { AuthStateService } from '../core/auth-state.service';
import { BookingApiService } from '../core/booking-api.service';

type HallOption = {
  id: string;
  name: string;
  capacity: number;
  location: string;
};

type BookingStatus = 'Pending' | 'Approved' | 'Cancelled';

type BookingRecord = {
  id: string;
  hallId: string;
  hallName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  expectedParticipants: number;
  status: BookingStatus;
};

type BookingForm = {
  hallId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  expectedParticipants: number | null;
};

@Component({
  selector: 'app-booking-management',
  standalone: true,
  imports: [CommonModule, FormsModule, FullCalendarModule, RouterLink, RouterLinkActive],
  templateUrl: './booking-management.component.html',
  styleUrl: './booking-management.component.css'
})
export class BookingManagementComponent implements OnInit {
  protected isBrowser = false;
  protected loading = false;
  protected saving = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected username = 'Admin';
  protected halls: HallOption[] = [];
  protected bookings: BookingRecord[] = [];
  protected modalOpen = false;
  protected editingBookingId: string | null = null;
  protected selectedBookingId: string | null = null;
  protected selectedDate = '';
  protected form: BookingForm = this.createEmptyForm();

  protected calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    height: 'auto',
    selectable: true,
    nowIndicator: true,
    dayMaxEvents: true,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    dateClick: (arg: any) => this.handleDateClick(arg),
    eventClick: (arg: any) => this.handleEventClick(arg),
    events: []
  };

  constructor(
    private readonly router: Router,
    private readonly authState: AuthStateService,
    private readonly bookingApi: BookingApiService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

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
    await this.loadBookings();
    this.syncCalendar();
  }

  protected get totalBookings(): number {
    return this.bookings.length;
  }

  protected get approvedBookings(): number {
    return this.bookings.filter((booking) => booking.status === 'Approved').length;
  }

  protected get pendingBookings(): number {
    return this.bookings.filter((booking) => booking.status === 'Pending').length;
  }

  protected get cancelledBookings(): number {
    return this.bookings.filter((booking) => booking.status === 'Cancelled').length;
  }

  protected get selectedBooking(): BookingRecord | undefined {
    return this.bookings.find((booking) => booking.id === this.selectedBookingId);
  }

  protected get selectedHallName(): string {
    return this.halls.find((hall) => hall.id === this.form.hallId)?.name ?? 'Select hall';
  }

  protected async signOut(): Promise<void> {
    this.authState.clearSession();

    await this.router.navigateByUrl('/login');
  }

  protected openCreateModal(date?: string): void {
    this.editingBookingId = null;
    this.form = this.createEmptyForm(date ?? this.selectedDate);
    this.modalOpen = true;
  }

  protected openEditModal(booking: BookingRecord): void {
    this.editingBookingId = booking.id;
    this.selectedBookingId = booking.id;
    this.form = {
      hallId: booking.hallId,
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      expectedParticipants: booking.expectedParticipants
    };
    this.modalOpen = true;
  }

  protected closeModal(): void {
    this.modalOpen = false;
    this.editingBookingId = null;
    this.form = this.createEmptyForm(this.selectedDate);
  }

  protected saveBooking(): void {
    if (!this.form.hallId || !this.form.bookingDate || !this.form.startTime || !this.form.endTime || !this.form.expectedParticipants) {
      this.errorMessage = 'Please complete hall, date, time, and participant fields.';
      return;
    }

    const hall = this.halls.find((hallItem) => hallItem.id === this.form.hallId);

    if (!hall) {
      this.errorMessage = 'Selected hall is not available.';
      return;
    }

    const bookingRecord: BookingRecord = {
      id: this.editingBookingId ?? this.createBookingId(),
      hallId: hall.id,
      hallName: hall.name,
      bookingDate: this.form.bookingDate,
      startTime: this.form.startTime,
      endTime: this.form.endTime,
      expectedParticipants: Number(this.form.expectedParticipants),
      status: this.editingBookingId ? this.selectedBooking?.status ?? 'Pending' : 'Pending'
    };

    this.errorMessage = '';
    this.successMessage = '';

    const request$ = this.editingBookingId
      ? this.bookingApi.updateBooking(bookingRecord)
      : this.bookingApi.saveBooking(bookingRecord);

    this.saving = true;

    firstValueFrom(request$)
      .then(async () => {
        this.successMessage = this.editingBookingId ? 'Booking updated successfully.' : 'Booking saved successfully.';
        this.closeModal();
        await this.loadBookings();
      })
      .catch((error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Unable to save booking.');
      })
      .finally(() => {
        this.saving = false;
      });

    return;
  }

  protected approveBooking(bookingId: string): void {
    this.updateBookingStatus(bookingId, 'Approved');
  }

  protected cancelBooking(bookingId: string): void {
    this.updateBookingStatus(bookingId, 'Cancelled');
  }

  protected updateBookingStatus(bookingId: string, status: BookingStatus): void {
    const booking = this.bookings.find((item) => item.id === bookingId);

    if (!booking) {
      this.errorMessage = 'Booking not found.';
      return;
    }

    const request$ = this.bookingApi.updateBooking({ ...booking, status });

    this.saving = true;

    firstValueFrom(request$)
      .then(async () => {
        this.successMessage = `Booking ${status.toLowerCase()} successfully.`;
        this.errorMessage = '';
        await this.loadBookings();
      })
      .catch((error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Unable to update booking.');
      })
      .finally(() => {
        this.saving = false;
      });
  }

  protected handleDateClick(arg: any): void {
    this.selectedDate = arg.dateStr;
    this.openCreateModal(arg.dateStr);
  }

  protected handleEventClick(arg: any): void {
    const booking = this.bookings.find((item) => item.id === arg.event.id);

    if (booking) {
      this.selectedBookingId = booking.id;
      this.openEditModal(booking);
    }
  }

  protected syncHallSelections(): void {
    if (this.form.hallId && !this.halls.some((hall) => hall.id === this.form.hallId)) {
      this.form.hallId = '';
    }
  }

  protected syncCalendar(): void {
    const events: EventInput[] = this.bookings.map((booking) => ({
      id: booking.id,
      title: `${booking.hallName} · ${booking.expectedParticipants} ppl`,
      start: `${booking.bookingDate}T${booking.startTime}`,
      end: `${booking.bookingDate}T${booking.endTime}`,
      allDay: false,
      backgroundColor: this.statusColor(booking.status),
      borderColor: this.statusColor(booking.status),
      textColor: '#ffffff'
    }));

    this.calendarOptions = {
      ...this.calendarOptions,
      events
    };
  }

  protected statusColor(status: BookingStatus): string {
    switch (status) {
      case 'Approved':
        return '#22c55e';
      case 'Cancelled':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  }

  protected createEmptyForm(date = ''): BookingForm {
    return {
      hallId: this.halls[0]?.id ?? '',
      bookingDate: date,
      startTime: '',
      endTime: '',
      expectedParticipants: null
    };
  }

  protected createBookingId(): string {
    return `BK-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  protected async loadHalls(): Promise<void> {
    try {
      const payload = (await firstValueFrom(this.bookingApi.getActiveHalls())) as unknown;
      const halls = this.normalizeHallOptions(payload);

      this.halls = halls;
    } catch {
      this.halls = [];
    }

    this.syncHallSelections();
  }

  protected async loadBookings(): Promise<void> {
    try {
      const payload = (await firstValueFrom(this.bookingApi.getAllBookings())) as unknown;
      const bookings = this.normalizeBookings(payload);

      this.bookings = bookings;
    } catch {
      this.bookings = [];
    }

    this.syncCalendar();
  }

  protected extractItems(payload: unknown): unknown[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>;

      for (const key of ['data', 'content', 'items', 'result']) {
        const value = record[key];

        if (Array.isArray(value)) {
          return value;
        }
      }
    }

    return [];
  }

  protected normalizeHallOptions(payload: unknown): HallOption[] {
    return this.extractItems(payload).map((item, index) => {
      const record = item as Record<string, unknown>;

      return {
        id: this.stringValue(record, ['id', 'hallId', 'uuid']) ?? `hall-${index + 1}`,
        name: this.stringValue(record, ['name', 'hallName', 'title']) ?? `Hall ${index + 1}`,
        capacity: this.numberValue(record, ['capacity', 'seatingCapacity', 'seatCount']) ?? 0,
        location: this.stringValue(record, ['location', 'hallLocation', 'place']) ?? 'Unknown location'
      };
    });
  }

  protected normalizeBookings(payload: unknown): BookingRecord[] {
    return this.extractItems(payload).map((item, index) => {
      const record = item as Record<string, unknown>;

      const bookingDate = this.stringValue(record, ['bookingDate', 'date', 'bookingDay']) ?? new Date().toISOString().slice(0, 10);
      const startTime = this.timeValue(record, ['startTime', 'fromTime', 'start']) ?? '09:00';
      const endTime = this.timeValue(record, ['endTime', 'toTime', 'end']) ?? '10:00';

      return {
        id: this.stringValue(record, ['id', 'bookingId', 'reference']) ?? `BK-${index + 1}`,
        hallId: this.stringValue(record, ['hallId', 'hallID', 'roomId']) ?? this.halls[0]?.id ?? '',
        hallName: this.stringValue(record, ['hallName', 'hall', 'name']) ?? 'Hall',
        bookingDate,
        startTime,
        endTime,
        expectedParticipants: this.numberValue(record, ['expectedParticipants', 'participants', 'participantCount']) ?? 0,
        status: this.bookingStatusValue(record, ['status', 'bookingStatus', 'state'])
      };
    });
  }

  protected stringValue(record: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
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
        const parsed = Number(value);

        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return undefined;
  }

  protected timeValue(record: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'string' && value.trim().length > 0) {
        const trimmed = value.trim();

        if (/^\d{2}:\d{2}/.test(trimmed)) {
          return trimmed.slice(0, 5);
        }

        return trimmed;
      }
    }

    return undefined;
  }

  protected bookingStatusValue(record: Record<string, unknown>, keys: string[]): BookingStatus {
    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();

        if (normalized.includes('cancel')) {
          return 'Cancelled';
        }

        if (normalized.includes('approve') || normalized.includes('verify') || normalized.includes('confirm')) {
          return 'Approved';
        }
      }
    }

    return 'Pending';
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