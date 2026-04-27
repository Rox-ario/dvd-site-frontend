import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Attore, CreaGenereRequest, CreaPersonaRequest, Genere, Regista } from '../models/catalogo.model';
import { Page } from '../models/pagination.model';

@Injectable({
  providedIn: 'root'
})
export class AdminCatalogoService {
  private readonly API_BASE = 'http://localhost:8080/api';

  constructor(private http: HttpClient) { }

  // CORRETTO: Usiamo 'q' come si aspetta Spring Boot
  ricercaGeneri(q: string = '', page: number = 0, size: number = 5): Observable<Page<Genere>> {
    const params = new HttpParams().set('q', q).set('page', page.toString()).set('size', size.toString());
    return this.http.get<Page<Genere>>(`${this.API_BASE}/generi`, { params });
  }

  ricercaAttori(q: string = '', page: number = 0, size: number = 5): Observable<Page<Attore>> {
    const params = new HttpParams().set('q', q).set('page', page.toString()).set('size', size.toString());
    return this.http.get<Page<Attore>>(`${this.API_BASE}/attori`, { params });
  }

  ricercaRegisti(q: string = '', page: number = 0, size: number = 5): Observable<Page<Regista>> {
    const params = new HttpParams().set('q', q).set('page', page.toString()).set('size', size.toString());
    return this.http.get<Page<Regista>>(`${this.API_BASE}/registi`, { params });
  }

  // CORRETTO: Estraiamo il .content per avere array reali e non bloccare Angular
  ottieniGeneri(): Observable<Genere[]> {
    return this.http.get<Page<Genere>>(`${this.API_BASE}/generi`).pipe(map(p => p.content));
  }

  ottieniAttori(): Observable<Attore[]> {
    return this.http.get<Page<Attore>>(`${this.API_BASE}/attori`).pipe(map(p => p.content));
  }

  ottieniRegisti(): Observable<Regista[]> {
    return this.http.get<Page<Regista>>(`${this.API_BASE}/registi`).pipe(map(p => p.content));
  }

  // --- CRUD METODI MANTENUTI INALTERATI ---
  creaGenere(dati: CreaGenereRequest): Observable<Genere> {
    return this.http.post<Genere>(`${this.API_BASE}/generi`, dati);
  }
  eliminaGenere(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/generi/${id}`);
  }
  creaAttore(dati: CreaPersonaRequest): Observable<Attore> {
    return this.http.post<Attore>(`${this.API_BASE}/attori`, dati);
  }
  eliminaAttore(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/attori/${id}`);
  }
  creaRegista(dati: CreaPersonaRequest): Observable<Regista> {
    return this.http.post<Regista>(`${this.API_BASE}/registi`, dati);
  }
  eliminaRegista(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE}/registi/${id}`);
  }
}