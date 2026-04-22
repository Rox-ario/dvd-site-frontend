import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && authService.isAdmin()) {
    return true;
  }

  // Se è loggato ma non è admin, lo mandiamo alla home.
  // Se non è loggato, la authGuard (se messa a monte) o questa stessa lo manderanno al login.
  if (!authService.isLoggedIn()) {
    authService.login(state.url);
  } else {
    router.navigate(['/catalogo']);
  }

  return false;
};
