import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URLS } from './api-urls';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BookingApiService {
  private readonly http = inject(HttpClient);

  signIn(username: string, password: string): Observable<unknown> {
    return this.http.post(API_URLS.authSignIn, { username, password });
  }

  getActiveHalls(): Observable<unknown> {
    return this.http.get(API_URLS.activeHalls);
  }

  saveHall(payload: unknown): Observable<unknown> {
    return this.http.post(API_URLS.hallSave, payload);
  }

  updateHall(payload: unknown): Observable<unknown> {
    return this.http.post(API_URLS.hallUpdate, payload);
  }

  getAllBookings(): Observable<unknown> {
    return this.http.get(API_URLS.bookingGetAll);
  }

  saveBooking(payload: unknown): Observable<unknown> {
    return this.http.post(API_URLS.bookingSave, payload);
  }

  updateBooking(payload: unknown): Observable<unknown> {
    return this.http.post(API_URLS.bookingUpdate, payload);
  }
}