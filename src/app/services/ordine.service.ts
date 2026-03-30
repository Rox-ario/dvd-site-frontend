import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
}
