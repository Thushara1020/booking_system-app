import { HttpInterceptorFn } from '@angular/common/http';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  if (typeof window === 'undefined') {
    return next(request);
  }

  if (request.url.includes('/trainee/api/auth/signin')) {
    return next(request);
  }

  const token = window.sessionStorage.getItem('authToken');
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