import { HttpInterceptorFn } from '@angular/common/http';
import { getValidAuthToken } from './auth-token-storage';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  if (typeof window === 'undefined') {
    return next(request);
  }

  if (request.url.includes('/trainee/api/auth/signin')) {
    return next(request);
  }

  const token = getValidAuthToken();
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