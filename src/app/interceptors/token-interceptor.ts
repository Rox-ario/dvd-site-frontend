import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  const isAuthRoute = req.url.includes('/api/auth');

  let clonedReq = req;
  if (token && !isAuthRoute) {
    clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Lasciamo passare la richiesta, ma restiamo in ascolto della risposta (Pipeline RxJS)
  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Se il server ci sbatte la porta in faccia (401 Token Scaduto)
      if (error.status === 401) {
        console.warn("Sessione scaduta intercettata. Logout forzato.");
        authService.logout(); // Pulisce il localStorage
        router.navigate(['/auth/login'], { queryParams: { avviso: 'scaduta' } });
      }
      return throwError(() => error);
    })
  );
};
