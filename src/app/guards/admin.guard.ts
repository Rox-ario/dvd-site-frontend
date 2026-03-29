import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { Ruolo } from '../models/auth.model';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Prima controlliamo se esiste una sessione ed è un admin
  if (authService.isLoggedIn() && authService.isAdmin()) {
    return true;
  }

  // Se è un cliente normale che fa il furbo (o non è loggato), lo rimandiamo alla home.
  return router.createUrlTree(['/']);
};
