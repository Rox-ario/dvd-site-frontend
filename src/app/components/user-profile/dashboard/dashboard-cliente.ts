import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClienteService } from '../../../services/cliente';
import { ClienteProfileResponse } from '../../../models/cliente.model';
import { FilmResponse } from '../../../models/film.model';
import { StoricoOrdiniComponent } from '../storico-ordini/storico-ordini';
import { AuthService } from '../../../services/auth';
import { OrdineService } from '../../../services/ordine.service';
import { NotificationService } from '../../../services/notification.service';
import { OrdineResponse } from '../../../models/ordine.model';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard-cliente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, StoricoOrdiniComponent, RouterLink],
  templateUrl: './dashboard-cliente.html',
  styleUrls: ['./dashboard-cliente.css']
})
export class DashboardClienteComponent implements OnInit {
  profilo: ClienteProfileResponse | null = null;
  preferitiDettagliati: FilmResponse[] = [];

  activeTab: 'ordini' | 'preferiti' | 'pannello' = 'preferiti';

  isEditing = false;
  editForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  isAdmin = false;
  ordini: OrdineResponse[] = [];
  ordiniFiltrati: OrdineResponse[] = [];
  isLoadingAdmin = true;
  totaleIncassato = 0;
  ordiniDaSpedire = 0;
  statoSelezionato = '';
  statiDisponibili = ['IN_ELABORAZIONE', 'SPEDITO', 'CONSEGNATO', 'ANNULLATO'];
  ordinamentoData: 'DESC' | 'ASC' = 'DESC';

  constructor(
    private clienteService: ClienteService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private ordineService: OrdineService,
    private notificationService: NotificationService
  ) {
    this.editForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2)]],
      cognome: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.activeTab = this.isAdmin ? 'pannello' : 'preferiti';

    this.caricaProfilo();

    if (this.isAdmin) {
      this.caricaOrdiniAdmin();
    }
  }

  caricaProfilo() {
    this.isLoading = true;
    this.errorMessage = '';

    this.clienteService.ottieniProfilo().subscribe({
      next: (dati) => {
        if (dati) {
          this.profilo = dati;
          this.editForm.patchValue({
            nome: dati.nome || '',
            cognome: dati.cognome || ''
          });
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Errore durante il caricamento del profilo.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });

    if (!this.isAdmin) {
      this.clienteService.ottieniDettaglioPreferiti().subscribe({
        next: (film) => {
          this.preferitiDettagliati = Array.isArray(film) ? film : [];
          this.cdr.detectChanges();
        }
      });
    }
  }

  rimuoviDaPreferiti(idFilm: number) {
    this.clienteService.rimuoviPreferito(idFilm).subscribe({
      next: () => {
        this.preferitiDettagliati = this.preferitiDettagliati.filter(f => f.idFilm !== idFilm);
        this.cdr.detectChanges();
      }
    });
  }

  salvaModifiche() {
    if (this.editForm.invalid) return;

    this.isLoading = true;
    this.clienteService.aggiornaProfilo(this.editForm.value).subscribe({
      next: (profiloAggiornato) => {
        if (profiloAggiornato) {
          this.profilo = profiloAggiornato;
          this.isEditing = false;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Errore durante il salvataggio dei dati.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleEditMode() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing && this.profilo) {
      this.editForm.patchValue({
        nome: this.profilo.nome,
        cognome: this.profilo.cognome,
        email: this.profilo.email
      });
    }
    this.cdr.detectChanges();
  }

  setTab(tab: 'ordini' | 'preferiti' | 'pannello') {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  getIniziale(): string {
    return this.profilo?.nome ? this.profilo.nome.charAt(0).toUpperCase() : 'U';
  }

  // ========================
  // ADMIN: Pannello di Controllo
  // ========================

  caricaOrdiniAdmin() {
    this.isLoadingAdmin = true;
    this.ordineService.ottieniTuttiGliOrdini().subscribe({
      next: (dati) => {
        this.ordini = Array.isArray(dati) ? dati : [];
        this.ordini.forEach(o => o.stato = o.stato || 'IN_ELABORAZIONE');

        this.applicaFiltro();
        this.calcolaStatistiche();
        this.isLoadingAdmin = false;

        this.cdr.detectChanges();
      },
      error: () => {
        this.notificationService.error('Impossibile caricare il registro degli ordini dal server.');
        this.isLoadingAdmin = false;
        this.cdr.detectChanges();
      }
    });
  }

  calcolaStatistiche() {
    // Escludiamo dal fatturato gli ordini che sono stati annullati
    this.totaleIncassato = this.ordini
      .filter(o => o.stato !== 'ANNULLATO')
      .reduce((acc, curr) => acc + curr.totale, 0);

    // Contiamo quanti ordini richiedono attenzione immediata
    this.ordiniDaSpedire = this.ordini
      .filter(o => o.stato === 'IN_ELABORAZIONE').length;
  }

  applicaFiltro() {
    // 1. Filtro per stato
    let risultato = [...this.ordini];
    if (this.statoSelezionato) {
      risultato = risultato.filter(o => o.stato === this.statoSelezionato);
    }

    // 2. Ordinamento per data
    risultato.sort((a, b) => {
      // Il backend invia LocalDateTime come stringa ISO, getTime() lo converte in millisecondi
      const timeA = new Date(a.dataAcquisto).getTime();
      const timeB = new Date(b.dataAcquisto).getTime();

      if (this.ordinamentoData === 'ASC') {
        return timeA - timeB; // Dal più vecchio al più recente
      } else {
        return timeB - timeA; // Dal più recente al più vecchio
      }
    });

    this.ordiniFiltrati = risultato;
  }

  async cambiaStato(ordine: OrdineResponse, evento: Event) {
    const selectElement = evento.target as HTMLSelectElement;
    const nuovoStato = selectElement.value;
    const vecchioStato = ordine.stato;

    // Mostra il dialog di conferma personalizzato
    const conferma = await this.notificationService.confirm({
      title: 'Conferma cambio stato',
      message: `Stai per cambiare lo stato dell'ordine #${ordine.numeroOrdine} da "${vecchioStato.replace('_', ' ')}" a "${nuovoStato.replace('_', ' ')}". Vuoi procedere?`,
      confirmText: 'Conferma',
      cancelText: 'Annulla',
      type: nuovoStato === 'ANNULLATO' ? 'danger' : 'warning'
    });

    if (!conferma) {
      // L'utente ha annullato: ripristiniamo il valore precedente nel select
      selectElement.value = vecchioStato;
      return;
    }

    this.ordineService.aggiornaStatoOrdine(ordine.numeroOrdine, nuovoStato).subscribe({
      next: (ordineAggiornato) => {
        const index = this.ordini.findIndex(o => o.numeroOrdine === ordine.numeroOrdine);
        if (index !== -1) {
          this.ordini[index] = ordineAggiornato;
          this.calcolaStatistiche();
          this.applicaFiltro();

          this.notificationService.success(
            `Stato dell'ordine #${ordine.numeroOrdine} aggiornato in "${nuovoStato.replace('_', ' ')}".`
          );
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.notificationService.error(
          "Errore durante l'aggiornamento: " + (err.error?.message || 'Riprova.')
        );
        selectElement.value = vecchioStato; // Rollback visivo in caso di errore
        this.cdr.detectChanges();
      }
    });
  }

  gestisciAccountSicurezza() {
    const accountUrl = this.authService.getAccountUrl();
    // Apre la console di Keycloak in una nuova scheda
    window.open(accountUrl, '_blank');
  }
}
