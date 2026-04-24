export interface RigaOrdineResponse {
  titoloFilm: string;
  quantita: number;
  prezzoAcquisto: number;
}

export interface OrdineResponse {
  idOrdine: number;
  numeroOrdine: number;
  dataAcquisto: string; // Il backend invia un LocalDateTime, che in JSON arriva come stringa ISO
  totale: number;
  stato: string;
  indirizzoSpedizione: string;
  righe: RigaOrdineResponse[];
}
