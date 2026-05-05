import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FilmService } from '../../../services/film';
import { CartService } from '../../../services/cart';
import {FilmResponse, RecensioneResponseDTO, StatisticheRecensioniDTO} from '../../../models/film.model';
import { ClienteService } from '../../../services/cliente';
import { AuthService } from '../../../services/auth';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../services/notification.service';
import {forkJoin} from 'rxjs';

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
  activeTab: string = 'recensioni';
  currentUserEmail: string | null = null;
  recensioneInModificaId: number | null = null;
  editVoto = 5;
  editCommento = '';
  filmEspansi: Set<number> = new Set<number>();
  mostraFormRecensione = false;
  recensioni: RecensioneResponseDTO[] = [];
  statistiche: StatisticheRecensioniDTO | null = null;
  paginaCorrenteRecensioni = 0;
  hasMoreRecensioni = false;

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
    this.isAdmin = this.authService.isAdmin;
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
    this.isLoading = true;

    // Tre chiamate parallele e indipendenti
    forkJoin({
      dettaglio: this.filmService.ottieniDettaglio(id),
      recensioniPage: this.filmService.ottieniRecensioniPaginate(id, 0, 5),
      stats: this.filmService.ottieniStatisticheRecensioni(id)
    }).subscribe({
      next: (risultati) => {
        this.film = risultati.dettaglio;

        // Assegnazione dati paginazione
        this.recensioni = risultati.recensioniPage.content;
        this.hasMoreRecensioni = !risultati.recensioniPage.last;
        this.paginaCorrenteRecensioni = 0;

        // Assegnazione statistiche pure dal DB
        this.statistiche = risultati.stats;

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

  get totalReviews(): number {
    return this.statistiche?.totaleRecensioni || 0;
  }

  get avgRatingNumber(): number {
    return this.statistiche?.mediaStelle || 0;
  }

  get averageRating(): string {
    return this.avgRatingNumber.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  getRatingDistribution() {
    const defaultDist = [
      { stelle: 5, count: 0, percentage: 0 },
      { stelle: 4, count: 0, percentage: 0 },
      { stelle: 3, count: 0, percentage: 0 },
      { stelle: 2, count: 0, percentage: 0 },
      { stelle: 1, count: 0, percentage: 0 }
    ];

    if (!this.statistiche || this.statistiche.totaleRecensioni === 0) return defaultDist;

    return defaultDist.map(d => {
      const count = this.statistiche!.distribuzione[d.stelle] || 0;
      return {
        stelle: d.stelle,
        count: count,
        percentage: (count / this.statistiche!.totaleRecensioni) * 100
      };
    });
  }

  // --- UTILITY PER RICARICARE LE STATS IN TEMPO REALE ---
  aggiornaStatisticheInTempoReale() {
    if(!this.film) return;
    this.filmService.ottieniStatisticheRecensioni(this.film.idFilm).subscribe(stats => {
      this.statistiche = stats;
      this.cdr.detectChanges();
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

  toggleFormRecensione() {
    this.mostraFormRecensione = !this.mostraFormRecensione;
  }

  get ratingSubtitle(): string {
    const avg = this.avgRatingNumber;
    if (this.totalReviews === 0) return 'Nessuna recensione';
    if (avg >= 4.5) return 'Da vedere assolutamente';
    if (avg >= 4.0) return 'Molto consigliato';
    if (avg >= 3.0) return 'Nella media';
    if (avg >= 2.0) return 'Sotto le aspettative';
    return 'Da evitare';
  }

  inviaRecensione() {
    if (!this.nuovoCommento.trim() || !this.film) return;
    const payload = { stelle: this.votoSelezionato, commento: this.nuovoCommento };

    this.filmService.inviaRecensione(this.film.idFilm, payload).subscribe({
      next: (nuovaRecensione: RecensioneResponseDTO) => {
        this.recensioni.unshift(nuovaRecensione);

        // 1. RICHIAMA QUI: Il DB ha salvato, ricalcoliamo le statistiche totali
        this.aggiornaStatisticheInTempoReale();

        this.film!.puoRecensire = false;
        this.nuovoCommento = '';
        this.notificationService.success("Grazie per la tua recensione!");
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

  setEditVoto(voto: number) {
    this.editVoto = voto;
  }

  annullaModifica() {
    this.recensioneInModificaId = null;
  }

  salvaModifica(idRecensione: number) {
    if (!this.editCommento.trim()) return;
    const payload = { stelle: this.editVoto, commento: this.editCommento };

    this.filmService.modificaRecensione(idRecensione, payload).subscribe({
      next: (recensioneAggiornata: RecensioneResponseDTO) => {
        const index = this.recensioni.findIndex(x => x.id === idRecensione);
        if (index !== -1) {
          this.recensioni[index] = recensioneAggiornata;
        }

        // 2. RICHIAMA QUI: L'update è andato a buon fine, sincronizziamo le stats
        this.aggiornaStatisticheInTempoReale();

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
        this.recensioni = this.recensioni.filter(x => x.id !== idRecensione);

        // Ricalcola i valori veri chiedendo al DB
        this.aggiornaStatisticheInTempoReale();

        if (this.recensioni.every(x => x.emailCliente !== this.currentUserEmail)) {
          this.film!.puoRecensire = true;
        }
        this.notificationService.success("Recensione rimossa con successo.");
        this.cdr.detectChanges();
      }
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

  filtroStelle: number | null = null;

  impostaFiltroStelle(stelle: number | null) {
    this.filtroStelle = this.filtroStelle === stelle ? null : stelle;
  }

  get recensioniMostrate(): any[] {
    if (!this.recensioni || this.recensioni.length === 0) return [];

    if (this.filtroStelle) {
      return this.recensioni.filter(r => r.stelle === this.filtroStelle);
    }

    return this.recensioni;
  }
}
