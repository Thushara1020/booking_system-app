import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthStateService } from '../core/auth-state.service';
import { BookingApiService } from '../core/booking-api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  constructor(
    private readonly router: Router,
    private readonly authState: AuthStateService,
    private readonly bookingApi: BookingApiService
  ) {}

  protected username = '';
  protected password = '';
  protected isSubmitting = false;
  protected message = '';
  protected messageType: 'success' | 'error' | '' = '';

  async ngOnInit(): Promise<void> {
    if (this.authState.hasToken()) {
      await this.router.navigateByUrl('/dashboard');
    }
  }

  protected async signIn(): Promise<void> {
    if (!this.username.trim() || !this.password.trim()) {
      this.messageType = 'error';
      this.message = 'NIC සහ password දෙකම ඇතුළත් කරන්න.';
      return;
    }

    this.isSubmitting = true;
    this.message = '';
    this.messageType = '';

    try {
      const payload = (await firstValueFrom(
        this.bookingApi.signIn(this.username.trim(), this.password)
      )) as {
        token?: string;
        username?: string;
        userId?: string;
        status?: number;
        roles?: string[];
        message?: string;
      };

      if (!payload.token) {
        throw new Error(payload.message ?? 'Login failed. Check NIC සහ password.');
      }

      this.authState.saveSession({
        token: payload.token,
        username: payload.username ?? this.username.trim(),
        userId: payload.userId ?? '',
        status: payload.status ?? 1,
        roles: payload.roles ?? []
      });

      this.messageType = 'success';
      this.message = 'Login successful. JWT token stored in sessionStorage.';
      this.password = '';
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.messageType = 'error';
      this.message = error instanceof Error ? error.message : 'Unexpected login error.';
    } finally {
      this.isSubmitting = false;
    }
  }
}