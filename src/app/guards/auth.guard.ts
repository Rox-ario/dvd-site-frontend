import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);

  if (authService.isLoggedIn()) {
    return true;
  }

  // L'utente non è loggato, lo mandiamo a Keycloak passando l'URL di destinazione
  authService.login(state.url);
  return false;
};
