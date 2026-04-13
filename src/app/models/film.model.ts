export interface FilmResponse {
  idFilm: number;
  titolo: string;
  trama: string;
  prezzo: number;
  genere: string[];
  registi: string[];
  attori: string[];
  anno: number;
  durataMinuti: number;
  stock: number;
  attivo: boolean;
  urlImmagine: string;
  mediaStelle?: number;
  recensioni?: Recensione[];
  puoRecensire?: boolean;
}

export interface CreaFilmRequest
{
  titolo: string;
  trama: string;
  prezzo: number;
  idGeneri: number[];
  idRegisti: number[];
  idAttori: number[];
  anno: number;
  durataMinuti: number;
  stock: number;
  urlImmagine: string;
}

export interface Recensione {
  nomeCliente: string;
  stelle: number;
  commento: string;
  data: string;
}
