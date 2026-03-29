import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegistrazioneRequest, Ruolo } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8080/api/auth';
  private readonly TOKEN_KEY = 'jwt_token';

  // Mantiene lo stato reattivo dell'utente
  private currentUserSubject = new BehaviorSubject<AuthResponse | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(response => {
        this.salvaSessione(response);
      })
    );
  }

  registra(data: RegistrazioneRequest): Observable<string> {
    // Il backend restituisce una stringa semplice in caso di successo
    return this.http.post(`${this.API_URL}/registrazione`, data, { responseType: 'text' });
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('user_data');
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.ruolo === Ruolo.ADMIN;
  }

  private salvaSessione(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    // Salviamo anche i dati dell'utente per ripristinarli al refresh
    localStorage.setItem('user_data', JSON.stringify({ nome: response.nome, ruolo: response.ruolo }));
    this.currentUserSubject.next(response);
  }

  private getStoredUser(): AuthResponse | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userData = localStorage.getItem('user_data');
    if (token && userData) {
      const parsed = JSON.parse(userData);
      return { token, nome: parsed.nome, ruolo: parsed.ruolo };
    }
    return null;
  }
}
