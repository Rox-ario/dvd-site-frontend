import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Attore, CreaGenereRequest, CreaPersonaRequest, Genere, Regista } from '../models/catalogo.model';

@Injectable({
  providedIn: 'root'
})
export class AdminCatalogoService {
  private readonly API_BASE = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  // --- GENERI ---
  ottieniGeneri(): Observable<Genere[]> {
    return this.http.get<Genere[]>(`${this.API_BASE}/generi`);
  }

  creaGenere(dati: CreaGenereRequest): Observable<Genere> {
    return this.http.post<Genere>(`${this.API_BASE}/generi`, dati);
  }

  eliminaGenere(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/generi/${id}`);
  }

  // --- ATTORI ---
  ottieniAttori(): Observable<Attore[]> {
    return this.http.get<Attore[]>(`${this.API_BASE}/attori`);
  }

  creaAttore(dati: CreaPersonaRequest): Observable<Attore> {
    return this.http.post<Attore>(`${this.API_BASE}/attori`, dati);
  }

  eliminaAttore(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/attori/${id}`);
  }

  // --- REGISTI ---
  ottieniRegisti(): Observable<Regista[]> {
    return this.http.get<Regista[]>(`${this.API_BASE}/registi`);
  }

  creaRegista(dati: CreaPersonaRequest): Observable<Regista> {
    return this.http.post<Regista>(`${this.API_BASE}/registi`, dati);
  }

  eliminaRegista(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/registi/${id}`);
  }
}
