import { Injectable } from '@angular/core';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import { Router } from '@angular/router';

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

  private isReady$ = new ReplaySubject<boolean>(1);


  constructor(private oauthService: OAuthService, private router: Router) {
    // Il costruttore ora deve essere vuoto. L'inizializzazione è delegata.
  }

  public async initializeKeycloak(): Promise<boolean> {
    this.oauthService.configure(authCodeFlowConfig);
    this.oauthService.setupAutomaticSilentRefresh();

    try {
      await this.oauthService.loadDiscoveryDocumentAndTryLogin();

      // Se l'utente torna da Keycloak con un token valido e una rotta di destinazione
      if (this.oauthService.hasValidAccessToken() && this.oauthService.state) {
        const targetUrl = decodeURIComponent(this.oauthService.state);
        this.router.navigateByUrl(targetUrl);
      }

      this.isDoneLoadingSubject.next(true);
      this.isReady$.next(true); // Sblocca la sincronizzazione JIT in app.ts
      return true;
    } catch (err) {
      console.warn('Errore durante la connessione a Keycloak:', err);
      this.isDoneLoadingSubject.next(false);
      this.isReady$.next(false);
      return false;
    }
  }

  public login(targetUrl?: string) {

    this.oauthService.loadDiscoveryDocumentAndLogin({ state: targetUrl || '/profilo' })
      .catch((err) => {
        console.error('Errore durante il login con Keycloak:', err);
        alert('Impossibile connettersi al server di autenticazione.');
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

  public getAccountUrl(): string {
    const issuer = this.oauthService.issuer;
    return `${issuer}/account`;
  }

  // Espone lo stato di "Pronto" per gli altri servizi
  get ready$() {
    return this.isReady$.asObservable();
  }

  // Metodo sicuro per estrarre i ruoli da Keycloak
  get roles(): string[] {
    const claims: any = this.oauthService.getIdentityClaims();
    if (!claims || !claims.realm_access) return [];
    return claims.realm_access.roles || [];
  }

  get isAdmin(): boolean {
    const ruoli = this.getRuoli();
    return ruoli.includes('ADMIN') || ruoli.includes('ROLE_ADMIN');
  }
}
