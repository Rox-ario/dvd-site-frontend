export interface AuthResponse {
  token: string;
  nome: string;
  ruolo: string;
}

export interface LoginRequest {
  email: string;     //
  password: string;  //
}

export interface RegistrazioneRequest {
  nome: string;      //
  cognome: string;   //
  email: string;     //
  password: string;  //
}
