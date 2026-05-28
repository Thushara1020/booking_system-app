import { Injectable } from '@angular/core';

type AuthSession = {
  token: string;
  username?: string;
  userId?: string;
  status?: number;
  roles?: string[];
};

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly storageKey = 'booking_system_auth';

  getToken(): string | null {
    return this.readSession()?.token ?? null;
  }

  getUsername(): string | null {
    return this.readSession()?.username ?? null;
  }

  hasToken(): boolean {
    return Boolean(this.getToken());
  }

  saveSession(session: AuthSession): void {
    sessionStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  clearSession(): void {
    sessionStorage.removeItem(this.storageKey);
  }

  readSession(): AuthSession | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const rawSession = sessionStorage.getItem(this.storageKey);

    if (!rawSession) {
      return null;
    }

    try {
      return JSON.parse(rawSession) as AuthSession;
    } catch {
      return null;
    }
  }
}