import { FilmResponse } from './film.model';

// Quello che serve al frontend per la visualizzazione
export interface CartItem {
  film: FilmResponse;
  quantita: number;
}
