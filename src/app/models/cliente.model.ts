
export interface ClienteProfileResponse {
  nome: string;
  cognome: string;
  email: string;
  filmPreferiti: string[];
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
