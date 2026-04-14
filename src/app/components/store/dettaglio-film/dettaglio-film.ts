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
  activeTab: 'recensioni' | 'simili' = 'recensioni';
  currentUserEmail: string | null = null;
  recensioneInModificaId: number | null = null;
  editVoto = 5;
  editCommento = '';
  filmEspansi: Set<number> = new Set<number>();

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
    this.currentUserEmail = this.authService.getEmail();


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

  impostaTab(tab: 'recensioni' | 'simili') {
    this.activeTab = tab;
  }

  avviaModifica(r: any) {
    this.recensioneInModificaId = r.id;
    this.editVoto = r.stelle;
    this.editCommento = r.commento;
  }

  annullaModifica() {
    this.recensioneInModificaId = null;
  }

  salvaModifica(idRecensione: number) {
    if (!this.editCommento.trim()) return;

    const payload = { stelle: this.editVoto, commento: this.editCommento };

    this.filmService.modificaRecensione(idRecensione, payload).subscribe({
      next: (recensioneAggiornata: any) => {
        // Aggiorniamo la recensione nell'array locale
        const index = this.film!.recensioni!.findIndex(x => x.id === idRecensione);
        if (index !== -1) {
          this.film!.recensioni![index] = recensioneAggiornata;
        }
        this.recensioneInModificaId = null;
        this.notificationService.success("Recensione modificata con successo!");
        this.cdr.detectChanges();
      },
      error: (err) => this.notificationService.error(err.error?.message || "Impossibile modificare.")
    });
  }

  async eliminaRecensione(idRecensione: number) {
    // Titolo dinamico a seconda di chi sta compiendo l'azione
    const conferma = await this.notificationService.confirm({
      title: this.isAdmin ? 'Moderazione Recensione' : 'Elimina Recensione',
      message: 'Sei sicuro di voler eliminare questa recensione? L\'azione è irreversibile.',
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      type: 'danger'
    });

    if (!conferma) return;

    this.filmService.eliminaRecensione(idRecensione).subscribe({
      next: () => {
        // Rimuoviamo la recensione dalla vista locale
        this.film!.recensioni = this.film!.recensioni!.filter(x => x.id !== idRecensione);

        // Innovazione UX: se non sono un admin (o se l'ho cancellata ed ero io l'autore), riabilito il form
        if (this.film!.recensioni.every(x => x.emailCliente !== this.currentUserEmail)) {
          this.film!.puoRecensire = true;
        }

        this.notificationService.success("Recensione rimossa con successo.");
        this.cdr.detectChanges();
      },
      error: (err) => this.notificationService.error(err.error?.message || "Impossibile eliminare.")
    });
  }

  toggleGeneri(idFilm: number, event: Event) {
    event.stopPropagation(); // Evita che il click si propaghi ad altri elementi
    if (this.filmEspansi.has(idFilm)) {
      this.filmEspansi.delete(idFilm);
    } else {
      this.filmEspansi.add(idFilm);
    }
  }
}
