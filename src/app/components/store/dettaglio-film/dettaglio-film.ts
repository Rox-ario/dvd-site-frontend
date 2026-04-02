import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FilmService } from '../../../services/film';
import { CartService } from '../../../services/cart';
import { FilmResponse } from '../../../models/film.model';
import { ClienteService } from '../../../services/cliente';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-dettaglio-film',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dettaglio-film.html',
  styleUrls: ['./dettaglio-film.css']
})
export class DettaglioFilmComponent implements OnInit {
  film: FilmResponse | null = null;
  isLoading = true;
  errorMessage = '';
  aggiuntoDiRecente = false;
  isPreferito = false;
  isLoggedIn = false;

  constructor(
    private route: ActivatedRoute,
    private filmService: FilmService,
    public cartService: CartService,
    private cdr: ChangeDetectorRef,
    private clienteService: ClienteService, // Iniettato per i preferiti
    private authService: AuthService
  ) {
  }

  ngOnInit(): void {
    // Estrae l'ID dall'URL (es: /dettaglio/5)
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : null;
    this.isLoggedIn = this.authService.isLoggedIn();

    if (id) {
      this.caricaDettaglio(id);
    } else {
      this.errorMessage = 'ID Film non valido o mancante.';
      this.isLoading = false;
    }
  }

  caricaDettaglio(id: number) {
    this.filmService.ottieniDettaglio(id).subscribe({
      next: (dati) => {
        this.film = dati;
        this.isLoading = false;
        this.controllaSePreferito(id);
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Impossibile recuperare i dettagli di questo capolavoro.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  controllaSePreferito(id: number) {
    if (this.isLoggedIn) {
      this.clienteService.ottieniIdPreferiti().subscribe({
        next: (preferitiIds) => {
          // Ora cerchiamo in un semplice array di numeri
          this.isPreferito = preferitiIds.includes(id);
          this.cdr.detectChanges();
        }
      });
    }
  }

  aggiungiAlCarrello() {
    if (this.film) {
      this.cartService.aggiungiAlCarrello(this.film);
      this.aggiuntoDiRecente = true;
      setTimeout(() => this.aggiuntoDiRecente = false, 2000);
    }
  }

  togglePreferito() {
    if (!this.isLoggedIn) {
      alert("Devi effettuare l'accesso per aggiungere film ai preferiti!");
      return;
    }

    if (this.film) {
      if (this.isPreferito) {
        this.clienteService.rimuoviPreferito(this.film.idFilm).subscribe({
          next: () => {
            this.isPreferito = false;
            this.cdr.detectChanges();
          }
        });
      } else {
        this.clienteService.aggiungiPreferito(this.film.idFilm).subscribe({
          next: () => {
            this.isPreferito = true;
            this.cdr.detectChanges();
          }
        });
      }
    }
  }
}
