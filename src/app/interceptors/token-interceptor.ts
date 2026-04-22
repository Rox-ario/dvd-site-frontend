import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Intercettiamo solo le chiamate dirette al nostro backend Spring Boot
  const isApiRoute = req.url.includes('/api/');

  let clonedReq = req;
  if (token && isApiRoute) {
    clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        console.warn("Non autorizzato o sessione scaduta. Reindirizzamento al login.");
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
