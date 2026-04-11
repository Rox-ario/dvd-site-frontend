import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreaOrdineRequest } from '../models/auth.model';
import { OrdineResponse } from '../models/ordine.model';

@Injectable({
  providedIn: 'root'
})
export class OrdineService {
  private readonly API_URL = 'http://localhost:8080/api/ordini';

  constructor(private http: HttpClient) {}

  inviaOrdine(richiesta: CreaOrdineRequest): Observable<any> {
    return this.http.post(this.API_URL, richiesta);
  }

  ottieniMioStorico(): Observable<OrdineResponse[]> {
    return this.http.get<OrdineResponse[]>(`${this.API_URL}/me/storico`);
  }

  ottieniTuttiGliOrdini(stato?: string): Observable<OrdineResponse[]> {
    let params = new HttpParams();
    if (stato) {
      params = params.set('stato', stato);
    }
    // Chiama l'endpoint globale protetto
    return this.http.get<OrdineResponse[]>(`${this.API_URL}/admin/tutti`, { params });
  }

  aggiornaStatoOrdine(idOrdine: number, nuovoStato: string): Observable<OrdineResponse> {
    const params = new HttpParams().set('nuovoStato', nuovoStato);
    return this.http.patch<OrdineResponse>(`${this.API_URL}/${idOrdine}/stato`, null, { params });
  }

  annullaMioOrdine(idOrdine: number): Observable<OrdineResponse> {
    return this.http.post<OrdineResponse>(`${this.API_URL}/me/${idOrdine}/annulla`, {});
  }
}
