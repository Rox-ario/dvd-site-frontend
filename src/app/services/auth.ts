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
  strictDiscoveryDocumentValidation: false
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isDoneLoadingSubject = new BehaviorSubject<boolean>(false);
  public isDoneLoading$ = this.isDoneLoadingSubject.asObservable();

  private isReady$ = new ReplaySubject<boolean>(1);

  constructor(private oauthService: OAuthService, private router: Router) {}

  // Metodo helper privato per forzare la configurazione a martellate
  private forzaConfigurazioneBase() {
    this.oauthService.configure(authCodeFlowConfig);
    // FORZATURA DIRETTA SULL'ISTANZA: Questo è innegabile per la libreria
    this.oauthService.requireHttps = false;
    this.oauthService.issuer = 'http://localhost:8081/realms/dvd-ecommerce';
  }

  public async initializeKeycloak(): Promise<boolean> {
    this.forzaConfigurazioneBase();
    this.oauthService.setupAutomaticSilentRefresh();

    try {
      await this.oauthService.loadDiscoveryDocumentAndTryLogin();

      if (this.oauthService.hasValidAccessToken() && this.oauthService.state) {
        const targetUrl = decodeURIComponent(this.oauthService.state);
        this.router.navigateByUrl(targetUrl);
      }

      this.isDoneLoadingSubject.next(true);
      this.isReady$.next(true);
      return true;
    } catch (err) {
      console.warn('Errore critico in initializeKeycloak:', err);
      this.isDoneLoadingSubject.next(false);
      this.isReady$.next(false);
      return false;
    }
  }

  public login(targetUrl?: string) {
    this.forzaConfigurazioneBase(); // Assicuriamoci che non se lo dimentichi prima del click

    this.oauthService.loadDiscoveryDocumentAndLogin({ state: targetUrl || '/profilo' })
      .catch((err) => {
        console.error('Dettaglio errore Keycloak:', err);
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

  public getEmail(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(window.atob(token.split('.')[1]));
      return payload.email || null;
    } catch (e) {
      return null;
    }
  }

  get ready$() {
    return this.isReady$.asObservable();
  }

  get isAdmin(): boolean {
    const ruoli = this.getRuoli();
    return ruoli.includes('ADMIN') || ruoli.includes('ROLE_ADMIN');
  }

  public getAccountUrl(): string {
    return `${authCodeFlowConfig.issuer}/account`;
  }
}
