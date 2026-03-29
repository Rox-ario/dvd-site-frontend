import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, debounceTime, distinctUntilChanged, startWith, switchMap, catchError, of } from 'rxjs';
import { FilmService } from '../../../services/film';
import { CartService } from '../../../services/cart'; // <-- Nuovo import
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

  // Set reattivo per tenere traccia dei film appena aggiunti (per il feedback visivo)
  aggiuntiDiRecente = new Set<number>();

  constructor(
    private filmService: FilmService,
    private cartService: CartService // <-- Iniettato nel costruttore
  ) {}

  ngOnInit(): void {
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

  // Nuova funzione per gestire il click
  aggiungiAlCarrello(film: FilmResponse): void {
    // 1. Inviamo i dati al motore di stato globale
    this.cartService.aggiungiAlCarrello(film);

    // 2. Feedback visivo locale: inseriamo l'ID nel Set
    this.aggiuntiDiRecente.add(film.idFilm);

    // 3. Rimuoviamo il feedback dopo 2 secondi
    setTimeout(() => {
      this.aggiuntiDiRecente.delete(film.idFilm);
    }, 2000);
  }
}
