import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface BookingPayload {
  reservedDate: string;
  startTime: string;
  endTime: string;
  bookingFor: string;
  expectedParticipants: number;
  specialRequirements: string;
  hall: {
    id: string;
  };
  requestedBy: {
    userId: string;
  };
  createdAt: string;
}

@Component({
  selector: 'app-booking-save',
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-save.component.html',
  styleUrl: './booking-save.component.css'
})
export class BookingSaveComponent {
  message = '';
  isSuccess = false;
  isSaving = false;

  booking: BookingPayload = {
    reservedDate: '2026-06-15',
    startTime: '09:00:00',
    endTime: '12:00:00',
    bookingFor: 'Tech Meetup',
    expectedParticipants: 100,
    specialRequirements: 'Need 2 Mics and Projector',
    hall: {
      id: '57eeb5c4-139b-4cfa-b773-58307eb07d22'
    },
    requestedBy: {
      userId: '8c9d0e1f-2a3b-41c4-d5e6-f7a8b9c0d128'
    },
    createdAt: '2026-05-27T10:30:00'
  };

  private readonly saveUrl = 'http://203.94.72.18/trainee/api/production/booking/save';

  constructor(private readonly http: HttpClient) {}

  saveBooking(): void {
    this.isSaving = true;
    this.message = '';

    this.http.post(this.saveUrl, this.booking).subscribe({
      next: () => {
        this.isSaving = false;
        this.isSuccess = true;
        this.message = 'Booking saved successfully.';
      },
      error: () => {
        this.isSaving = false;
        this.isSuccess = false;
        this.message = 'Booking save failed. Please check API availability and try again.';
      }
    });
  }
}
