import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClienteProfileResponse, AggiornaAnagraficaRequest } from '../models/cliente.model';
import { FilmResponse } from '../models/film.model';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private readonly API_URL = 'http://localhost:8080/api/clienti/me';

  constructor(private http: HttpClient) {}

  ottieniProfilo(): Observable<ClienteProfileResponse> {
    return this.http.get<ClienteProfileResponse>(`${this.API_URL}/profilo`);
  }

  aggiornaProfilo(dati: AggiornaAnagraficaRequest): Observable<ClienteProfileResponse> {
    return this.http.put<ClienteProfileResponse>(`${this.API_URL}/profilo`, dati);
  }

  rimuoviPreferito(idFilm: number): Observable<ClienteProfileResponse> {
    return this.http.delete<ClienteProfileResponse>(`${this.API_URL}/preferiti/${idFilm}`);
  }

  aggiungiPreferito(idFilm: number): Observable<ClienteProfileResponse> {
    return this.http.post<ClienteProfileResponse>(`${this.API_URL}/preferiti/${idFilm}`, {});
  }
  ottieniDettaglioPreferiti(): Observable<FilmResponse[]> {
    return this.http.get<FilmResponse[]>(`${this.API_URL}/preferiti`);
  }
}
