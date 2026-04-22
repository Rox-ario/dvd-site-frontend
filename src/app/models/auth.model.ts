export enum Ruolo {
  CLIENTE = 'CLIENTE',
  ADMIN = 'ADMIN'
}

export interface AuthResponse {
  token: string;
  nome: string;
  ruolo: Ruolo;
}

export interface RigaOrdineRequest {
  idFilm: number;
  quantita: number;
}

export interface CreaOrdineRequest
{
  articoli: RigaOrdineRequest[];
  indirizzoSpedizione: string;
}

