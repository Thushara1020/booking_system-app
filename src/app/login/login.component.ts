import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { clearAuthToken, storeAuthToken } from '../auth-token-storage';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';
  message = '';
  isSuccess = false;

  isSubmitting = false;

  private readonly signInUrl = 'http://203.94.72.18/trainee/api/auth/signin';

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  login(loginForm?: { form: { markAllAsTouched(): void } }): void {
    loginForm?.form.markAllAsTouched();

    if (!this.username.trim() || !this.password) {
      this.isSuccess = false;
      this.message = 'Username and password are required.';
      return;
    }

    clearAuthToken();
    this.isSubmitting = true;
    this.message = '';

    this.http
      .post<Record<string, unknown>>(this.signInUrl, {
        username: this.username.trim(),
        password: this.password
      })
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;

          const token = this.extractToken(response);
          if (!token) {
            this.isSuccess = false;
            this.message = 'Login succeeded but no token was returned by the API.';
            return;
          }

          storeAuthToken(token);
          this.isSuccess = true;
          this.message = 'Login successful!';

          void this.router.navigate(['/dashboard']);
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting = false;
          this.isSuccess = false;
          this.message = this.extractErrorMessage(error);
        }
      });
  }

  private extractToken(response: Record<string, unknown>): string | null {
    const tokenValue =
      response['token'] ??
      response['accessToken'] ??
      response['jwt'] ??
      response['authToken'];

    return typeof tokenValue === 'string' && tokenValue.trim() ? tokenValue : null;
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
      return 'Invalid username or password.';
    }

    return 'Login failed. Please try again.';
  }
}
