export enum Ruolo {
  CLIENTE = 'CLIENTE',
  ADMIN = 'ADMIN'
}

export interface AuthResponse {
  token: string;
  nome: string;
  ruolo: Ruolo;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface RegistrazioneRequest {
  nome: string;
  cognome: string;
  email: string;
  password?: string;
}

export interface RigaOrdineRequest {
  idFilm: number;
  quantita: number;
}

export interface CreaOrdineRequest {
  idCliente: number;
  articoli: RigaOrdineRequest[];
}

