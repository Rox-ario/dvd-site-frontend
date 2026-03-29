import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Se la rotta è pubblica (es. /api/auth), non attacchiamo il token per pulizia,
  // anche se il backend la lascerebbe passare comunque.
  const isAuthRoute = req.url.includes('/api/auth');

  if (token && !isAuthRoute) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedReq);
  }

  return next(req);
};
