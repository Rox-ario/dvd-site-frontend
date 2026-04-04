import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CartItem } from '../models/cart.model';
import { FilmResponse } from '../models/film.model';
import { CreaOrdineRequest, RigaOrdineRequest } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly CART_STORAGE_KEY = 'dvd_store_cart';

  // Inizializziamo lo stato leggendo dal localStorage (se c'è qualcosa)
  private cartItemsSubject = new BehaviorSubject<CartItem[]>(this.loadCartFromStorage());
  public cartItems$ = this.cartItemsSubject.asObservable();

  constructor() {}

  aggiungiAlCarrello(film: FilmResponse, quantita: number = 1): void {
    const elementiAttuali = this.cartItemsSubject.value;
    const indiceEsistente = elementiAttuali.findIndex(item => item.film.idFilm === film.idFilm);

    if (indiceEsistente > -1) {
      // Se il film è già nel carrello, sommiamo la quantità
      // (Potremmo mettere un controllo per non superare lo stock massimo del film qui)
      elementiAttuali[indiceEsistente].quantita += quantita;
      if (elementiAttuali[indiceEsistente].quantita > film.stock) {
        elementiAttuali[indiceEsistente].quantita = film.stock; // Blocchiamo al massimo disponibile
      }
    } else {
      // Se è nuovo, lo aggiungiamo all'array
      elementiAttuali.push({ film, quantita });
    }

    this.aggiornaStato(elementiAttuali);
  }

  rimuoviDalCarrello(idFilm: number): void {
    const elementiFiltrati = this.cartItemsSubject.value.filter(item => item.film.idFilm !== idFilm);
    this.aggiornaStato(elementiFiltrati);
  }

  aggiornaQuantita(idFilm: number, nuovaQuantita: number): void {
    if (nuovaQuantita <= 0) {
      this.rimuoviDalCarrello(idFilm);
      return;
    }

    const elementiAttuali = this.cartItemsSubject.value;
    const item = elementiAttuali.find(i => i.film.idFilm === idFilm);

    if (item) {
      item.quantita = nuovaQuantita > item.film.stock ? item.film.stock : nuovaQuantita;
      this.aggiornaStato(elementiAttuali);
    }
  }

  svuotaCarrello(): void {
    this.aggiornaStato([]);
  }

  // Utility per calcolare il totale da mostrare in UI
  calcolaTotale(elementi: CartItem[]): number {
    return elementi.reduce((acc, item) => acc + (item.film.prezzo * item.quantita), 0);
  }

  // Prepara i dati esattamente come li vuole il tuo OrdineController Java
  generaPayloadOrdine(indirizzoSpedizione: string): CreaOrdineRequest {
    const articoli: RigaOrdineRequest[] = this.cartItemsSubject.value.map(item => ({
      idFilm: item.film.idFilm,
      quantita: item.quantita
    }));

    return { articoli, indirizzoSpedizione };
  }

  // Sincronizza il Subject e il LocalStorage in un colpo solo
  private aggiornaStato(nuoviElementi: CartItem[]): void {
    this.cartItemsSubject.next(nuoviElementi);
    localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(nuoviElementi));
  }

  private loadCartFromStorage(): CartItem[] {
    const datiSalvati = localStorage.getItem(this.CART_STORAGE_KEY);
    return datiSalvati ? JSON.parse(datiSalvati) : [];
  }
}
