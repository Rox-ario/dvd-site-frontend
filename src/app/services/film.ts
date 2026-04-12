import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FilmResponse } from '../models/film.model';
import { CreaFilmRequest } from '../models/film.model';

@Injectable({
  providedIn: 'root'
})
export class FilmService {
  private readonly API_URL = 'http://localhost:8080/api/film';

  constructor(private http: HttpClient) {}

  //Utilizziamo un oggetto per i filtri, rispecchiando i @RequestParam del backend
  esploraCatalogo(filtri?: { titolo?: string; nomeGenere?: string; nomeAttore?: string; nomeRegista?: string; anno?: number; prezzoMax?: number }): Observable<FilmResponse[]> {
    let params = new HttpParams();

    if (filtri) {
      if (filtri.titolo) params = params.set('titolo', filtri.titolo);
      if (filtri.nomeGenere) params = params.set('nomeGenere', filtri.nomeGenere);
      if (filtri.nomeAttore) params = params.set('nomeAttore', filtri.nomeAttore);
      if (filtri.nomeRegista) params = params.set('nomeRegista', filtri.nomeRegista);
      if (filtri.anno) params = params.set('anno', filtri.anno.toString());
      if (filtri.prezzoMax) params = params.set('prezzoMax', filtri.prezzoMax.toString());
    }

    return this.http.get<FilmResponse[]>(this.API_URL, { params });
  }

  ottieniDettaglio(id: number): Observable<FilmResponse> {
    return this.http.get<FilmResponse>(`${this.API_URL}/${id}`);
  }

  creaFilm(dati: CreaFilmRequest): Observable<FilmResponse> {
    return this.http.post<FilmResponse>(this.API_URL, dati);
  }

  aggiornaFilm(id: number, dati: CreaFilmRequest): Observable<FilmResponse> {
    return this.http.put<FilmResponse>(`${this.API_URL}/${id}`, dati);
  }

  eliminaFilm(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  ottieniFilmSimili(id: number): Observable<FilmResponse[]> {
    return this.http.get<FilmResponse[]>(`${this.API_URL}/${id}/simili`);
  }
}
