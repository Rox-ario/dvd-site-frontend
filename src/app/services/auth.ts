import { Injectable } from '@angular/core';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { BehaviorSubject, Observable } from 'rxjs';
import { Ruolo } from '../models/auth.model';

export const authCodeFlowConfig: AuthConfig = {
  // SOSTITUISCI CON L'URL DEL TUO KEYCLOAK (es: http://localhost:8080 non è corretto se è il backend, Keycloak di solito è su un'altra porta come 8081 o 9090)
  issuer: 'http://localhost:8081/realms/dvd-ecommerce',
  redirectUri: window.location.origin,
  clientId: 'frontend-angular', // Nome del client configurato su Keycloak
  responseType: 'code',
  scope: 'openid profile email',
  showDebugInformation: false,
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isDoneLoadingSubject = new BehaviorSubject<boolean>(false);
  public isDoneLoading$ = this.isDoneLoadingSubject.asObservable();

  constructor(private oauthService: OAuthService) {
    this.configure();
  }

  private configure() {
    this.oauthService.configure(authCodeFlowConfig);
    this.oauthService.setupAutomaticSilentRefresh();

    // Inizializza il login e controlla se stiamo tornando da un redirect di Keycloak
    this.oauthService.loadDiscoveryDocumentAndTryLogin()
      .then(() => {
        this.isDoneLoadingSubject.next(true);
      })
      .catch((err) => {
        console.warn('Impossibile raggiungere Keycloak durante il boot:', err);
        this.isDoneLoadingSubject.next(false);
      });
  }

  public login(targetUrl?: string) {
    // Salviamo la rotta a cui l'utente voleva accedere prima del login.
    // Usiamo loadDiscoveryDocumentAndLogin() invece di initCodeFlow() così
    // funziona anche se il discovery document non era stato caricato al boot.
    // prompt: 'login' forza Keycloak a mostrare sempre la schermata di login
    // anche se esiste già una sessione SSO attiva (evita l'auto-login dopo logout).
    this.oauthService.customQueryParams = { prompt: 'login' };
    this.oauthService.loadDiscoveryDocumentAndLogin({ state: targetUrl || '/profilo' })
      .catch((err) => {
        console.error('Errore durante il login con Keycloak:', err);
        alert('Impossibile connettersi al server di autenticazione. Assicurati che Keycloak sia attivo su http://localhost:8081');
      });
  }

  public register(): void {
    // Costruisce l'URL diretto alla pagina di registrazione di Keycloak
    const redirectUri = encodeURIComponent(authCodeFlowConfig.redirectUri as string);
    const clientId = authCodeFlowConfig.clientId;
    const registerUrl =
      `${authCodeFlowConfig.issuer}/protocol/openid-connect/registrations` +
      `?client_id=${clientId}&response_type=code&scope=openid+profile+email&redirect_uri=${redirectUri}`;
    window.location.href = registerUrl;
  }

  public logout() {
    this.oauthService.logOut();
  }

  public isLoggedIn(): boolean {
    return this.oauthService.hasValidAccessToken();
  }

  public getToken(): string | null {
    return this.oauthService.getAccessToken();
  }

  public getEmail(): string | null {
    const claims = this.oauthService.getIdentityClaims() as any;
    return claims ? claims['email'] : null;
  }

  public getRuoli(): string[] {
    const token = this.getToken();
    if (!token) return [];

    try {
      // Estraiamo il payload dal JWT (Base64)
      const payload = JSON.parse(window.atob(token.split('.')[1]));
      // Keycloak mappa i ruoli dentro realm_access.roles
      return payload.realm_access?.roles || [];
    } catch (e) {
      return [];
    }
  }

  public isAdmin(): boolean {
    return this.getRuoli().includes('ROLE_ADMIN');
  }

  public getAccountUrl(): string {
    const issuer = this.oauthService.issuer;
    return `${issuer}/account`;
  }
}
