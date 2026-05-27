const AUTH_TOKEN_KEY = 'authToken';
const AUTH_TOKEN_EXPIRES_AT_KEY = 'authTokenExpiresAt';
const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function storeAuthToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const expiresAt = Date.now() + TOKEN_LIFETIME_MS;

  window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  window.sessionStorage.setItem(AUTH_TOKEN_EXPIRES_AT_KEY, String(expiresAt));
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
  window.sessionStorage.removeItem(AUTH_TOKEN_EXPIRES_AT_KEY);
}

export function getValidAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = window.sessionStorage.getItem(AUTH_TOKEN_KEY);
  const expiresAtValue = window.sessionStorage.getItem(AUTH_TOKEN_EXPIRES_AT_KEY);

  if (!token || !expiresAtValue) {
    return null;
  }

  const expiresAt = Number(expiresAtValue);
  if (Number.isNaN(expiresAt) || Date.now() >= expiresAt) {
    clearAuthToken();
    return null;
  }

  return token;
}