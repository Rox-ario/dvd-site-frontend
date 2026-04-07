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
