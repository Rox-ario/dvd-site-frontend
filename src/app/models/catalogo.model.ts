export interface Genere {
  id: number;
  nome: string;
}

export interface Attore {
  id: number;
  nome: string;
  cognome: string;
}

export interface Regista {
  id: number;
  nome: string;
  cognome: string;
}

export interface CreaGenereRequest {
  nome: string;
}

export interface CreaPersonaRequest {
  nome: string;
  cognome: string;
}
