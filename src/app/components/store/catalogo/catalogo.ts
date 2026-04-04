import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, debounceTime, distinctUntilChanged, startWith, switchMap, catchError, of } from 'rxjs';
import { FilmService } from '../../../services/film';
import { CartService } from '../../../services/cart';
import { ClienteService } from '../../../services/cliente'; // Aggiunto per i preferiti
import { AuthService } from '../../../services/auth';       // Aggiunto per verificare se è loggato
import { FilmResponse } from '../../../models/film.model';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './catalogo.html',
  styleUrls: ['./catalogo.css']
})
export class CatalogoComponent implements OnInit {
  searchControl = new FormControl('');
  film$!: Observable<FilmResponse[]>;
  errorMessage = '';
  isAdmin = false;

  // Set reattivo per tenere traccia dei film appena aggiunti al carrello (per il feedback visivo)
  aggiuntiDiRecente = new Set<number>();

  // Nuove variabili per la gestione dei preferiti
  preferitiIds = new Set<number>();
  isLoggedIn = false;

  constructor(
    private filmService: FilmService,
    private cartService: CartService,
    private clienteService: ClienteService, // Iniettato
    private authService: AuthService        // Iniettato
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.isAdmin = this.authService.isAdmin();

    if (this.isLoggedIn) {
      // Usa il metodo leggero al posto di ottieniDettaglioPreferiti()
      this.clienteService.ottieniIdPreferiti().subscribe({
        next: (ids) => {
          ids.forEach(id => this.preferitiIds.add(id));
        },
        error: () => console.error('Impossibile caricare i preferiti in background.')
      });
    }

    // 2. Logica di ricerca reattiva del catalogo
    this.film$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(titolo => {
        this.errorMessage = '';
        return this.filmService.esploraCatalogo({ titolo: titolo || undefined }).pipe(
          catchError(() => {
            this.errorMessage = 'Impossibile caricare il catalogo in questo momento.';
            return of([]);
          })
        );
      })
    );
  }

  // Funzione per il carrello
  aggiungiAlCarrello(film: FilmResponse): void {
    this.cartService.aggiungiAlCarrello(film);

    // Feedback visivo
    this.aggiuntiDiRecente.add(film.idFilm);
    setTimeout(() => {
      this.aggiuntiDiRecente.delete(film.idFilm);
    }, 2000);
  }

  // Nuova funzione per gestire il click sul cuoricino
  togglePreferito(film: FilmResponse): void {
    if (!this.isLoggedIn) {
      alert("Devi effettuare l'accesso per aggiungere film ai preferiti!");
      return;
    }

    // Se il film è già nel Set dei preferiti, chiamiamo l'endpoint di rimozione
    if (this.preferitiIds.has(film.idFilm)) {
      this.clienteService.rimuoviPreferito(film.idFilm).subscribe({
        next: () => this.preferitiIds.delete(film.idFilm),
        error: () => alert("Errore durante la rimozione dai preferiti.")
      });
    }
    // Altrimenti, chiamiamo l'endpoint di aggiunta
    else {
      this.clienteService.aggiungiPreferito(film.idFilm).subscribe({
        next: () => this.preferitiIds.add(film.idFilm),
        error: () => alert("Errore durante l'aggiunta ai preferiti.")
      });
    }
  }
}
