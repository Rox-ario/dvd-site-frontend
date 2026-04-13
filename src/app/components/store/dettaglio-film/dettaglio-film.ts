import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FilmService } from '../../../services/film';
import { CartService } from '../../../services/cart';
import { FilmResponse } from '../../../models/film.model';
import { ClienteService } from '../../../services/cliente';
import { AuthService } from '../../../services/auth';
import {FormsModule} from '@angular/forms';
import {NotificationService} from '../../../services/notification.service';

@Component({
  selector: 'app-dettaglio-film',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
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
  isAdmin = false;

  constructor(
    private route: ActivatedRoute,
    private filmService: FilmService,
    public cartService: CartService,
    private cdr: ChangeDetectorRef,
    private clienteService: ClienteService, // Iniettato per i preferiti
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
  }

  filmSimili: FilmResponse[] = [];
  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.isAdmin = this.authService.isAdmin();


    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      const id = idParam ? Number(idParam) : null;

      if (id) {
        // Quando l'ID cambia (es. cliccando un film simile), ricarichiamo tutto
        this.caricaDettaglio(id);
        this.caricaFilmSimili(id);
        // Scorri in alto in modo fluido al cambio pagina
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        this.errorMessage = 'ID Film non valido o mancante.';
        this.isLoading = false;
      }
    });
  }

  caricaFilmSimili(id: number) {
    this.filmService.ottieniFilmSimili(id).subscribe({
      next: (simili) => {
        this.filmSimili = simili;
        this.cdr.detectChanges();
      },
      error: () => console.error('Impossibile caricare i film consigliati.')
    });
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

  votoSelezionato = 5;
  nuovoCommento = '';

  inviaRecensione() {
    if (!this.nuovoCommento.trim() || !this.film) return;

    const payload = {
      stelle: this.votoSelezionato,
      commento: this.nuovoCommento
    };

    // Usiamo il servizio invece di this.http
    this.filmService.inviaRecensione(this.film.idFilm, payload).subscribe({
      next: (nuovaRecensione: any) => {
        // Se il backend restituisce il DTO della recensione, lo aggiungiamo alla lista locale
        if (!this.film!.recensioni) this.film!.recensioni = [];
        this.film!.recensioni.unshift(nuovaRecensione);

        this.film!.puoRecensire = false;
        this.nuovoCommento = ''; // Reset del campo
        this.notificationService.success("Grazie per la tua recensione! 🍿");
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.notificationService.error(err.error?.message || "Impossibile inviare la recensione.");
      }
    });
  }
}
