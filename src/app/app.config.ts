import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // Aggiungi questo import
import { tokenInterceptor } from './interceptors/token-interceptor'; // Aggiungi questo import

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Configura il client HTTP per usare l'intercettore che abbiamo appena creato
    provideHttpClient(withInterceptors([tokenInterceptor]))
  ]
};

