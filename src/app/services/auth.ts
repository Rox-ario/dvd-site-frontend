import { Injectable } from '@angular/core';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { Router } from '@angular/router';

export const authCodeFlowConfig: AuthConfig = {
  issuer: 'http://localhost:8081/realms/dvd-ecommerce',
  redirectUri: window.location.origin,
  clientId: 'frontend-angular',
  responseType: 'code',
  scope: 'openid profile email',
  showDebugInformation: false,
  requireHttps: false,
  strictDiscoveryDocumentValidation: false // Mettiamo al sicuro da altre pignolerie di localhost
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isDoneLoadingSubject = new BehaviorSubject<boolean>(false);
  public isDoneLoading$ = this.isDoneLoadingSubject.asObservable();

  private isReady$ = new ReplaySubject<boolean>(1);

  constructor(private oauthService: OAuthService, private router: Router) {
    // Avevi ragione tu nella tua primissima versione. Niente configure() qui.
    // L'istanza oauthService riceve le impostazioni automaticamente grazie alla DI in app.config.ts
  }

  public async initializeKeycloak(): Promise<boolean> {
    this.oauthService.setupAutomaticSilentRefresh();

    try {
      await this.oauthService.loadDiscoveryDocumentAndTryLogin();

      if (this.oauthService.hasValidAccessToken() && this.oauthService.state) {
        const targetUrl = decodeURIComponent(this.oauthService.state);
        this.router.navigateByUrl(targetUrl);
      }

      this.isDoneLoadingSubject.next(true); // Questo ora sbloccherà il tuo app.ts!
      this.isReady$.next(true);
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
        console.error('Dettaglio errore Keycloak:', err);
        // Poiché in JS gli errori lanciati possono non avere uno .status, gestiamo il fallback generico
        const status = err?.status !== undefined ? err.status : 'Sconosciuto';
        alert(`Errore ${status}: Impossibile connettersi al server di autenticazione. Controlla la console.`);
      });
  }

  public register(): void {
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
      const payload = JSON.parse(window.atob(token.split('.')[1]));
      return payload.realm_access?.roles || [];
    } catch (e) {
      return [];
    }
  }

  public getAccountUrl(): string {
    return `${this.oauthService.issuer}/account`;
  }

  get ready$() {
    return this.isReady$.asObservable();
  }

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
