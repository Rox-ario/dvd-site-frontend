import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { tokenInterceptor } from './interceptors/token-interceptor';
import { OAuthModule, AuthConfig } from 'angular-oauth2-oidc';
import { authCodeFlowConfig, AuthService } from './services/auth';

// Ora deleghiamo l'avvio al tuo servizio, in modo che aggiorni correttamente i BehaviorSubject!
export function initializeApp(authService: AuthService): () => Promise<boolean> {
  return () => authService.initializeKeycloak();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([tokenInterceptor])),
    importProvidersFrom(OAuthModule.forRoot()),

    // LA SOLUZIONE: Iniettiamo la configurazione direttamente alla radice.
    // L'OAuthService "nascerà" sapendo già che requireHttps è false.
    { provide: AuthConfig, useValue: authCodeFlowConfig },

    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService], // Iniettiamo il tuo servizio, non la libreria nuda
      multi: true
    }
  ]
};
