import { ApplicationConfig, importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { tokenInterceptor } from './interceptors/token-interceptor';
import { OAuthModule } from 'angular-oauth2-oidc';
import { AuthService } from './services/auth';

export function initializeOAuth(authService: AuthService) {
  return () => authService.initializeKeycloak();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([tokenInterceptor])),
    importProvidersFrom(OAuthModule.forRoot()),
    // Registriamo l'inizializzatore
    {
      provide: APP_INITIALIZER,
      useFactory: initializeOAuth,
      multi: true,
      deps: [AuthService]
    }
  ]
};

