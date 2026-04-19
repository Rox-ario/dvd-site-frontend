import { Ruolo } from './auth.model';

export interface ClienteProfileResponse {
  nome: string;
  cognome: string;
  email: string;
  puntiFedeltà: number; // Il backend invia puntiFedeltà
  filmPreferiti: string[];
  ruolo: Ruolo;
}

export interface AggiornaAnagraficaRequest {
  nome: string;
  cognome: string;
  email: string;
}

export interface CambiaPasswordRequest {
  vecchiaPassword: string;
  nuovaPassword: string;
}
