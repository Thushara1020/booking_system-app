import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_URLS } from './api-urls';
import { AuthStateService } from './auth-state.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.url === API_URLS.authSignIn) {
    return next(request);
  }

  const authState = inject(AuthStateService);
  const token = authState.getToken();

  if (!token) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
  );
};