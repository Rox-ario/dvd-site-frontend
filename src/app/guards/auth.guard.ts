import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true; // Ha il token, lo lasciamo passare
  }

  // Non è loggato. Lo reindirizziamo al login.
  // Bonus UX: potremmo salvare lo 'state.url' per rimandarlo alla pagina che voleva visitare dopo il login.
  return router.createUrlTree(['/auth/login']);
};
