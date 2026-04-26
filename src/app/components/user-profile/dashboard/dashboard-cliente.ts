import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
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
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DashboardAdminComponent } from "../../admin/dashboard/dashboard-admin";

@Component({
  selector: 'app-dashboard-cliente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, StoricoOrdiniComponent, RouterLink, DashboardAdminComponent],
  templateUrl: './dashboard-cliente.html',
  styleUrls: ['./dashboard-cliente.css']
})
export class DashboardClienteComponent implements OnInit, OnDestroy {
  profilo: ClienteProfileResponse | null = null;
  preferitiDettagliati: FilmResponse[] = [];

  activeTab: 'ordini' | 'preferiti' | 'pannello' = 'preferiti';
  private destroy$ = new Subject<void>();

  isEditing = false;
  editForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  isAdmin = false;
  ordini: OrdineResponse[] = [];
  isLoadingAdmin = true;
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
    this.authService.isDoneLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isDone) => {
        if (isDone) {
          this.isAdmin = this.authService.isAdmin;

          // CORREZIONE: Assegna il tab di default corretto in base al ruolo
          this.activeTab = this.isAdmin ? 'pannello' : 'preferiti';

          this.caricaProfilo();

          // Carica gli ordini per l'admin
          if (this.isAdmin) {
            this.caricaOrdiniAdmin();
          }

          this.cdr.detectChanges();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  caricaProfilo() {
    this.isLoading = true;
    this.errorMessage = '';

    this.clienteService.ottieniProfilo()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dati) => {
          if (dati) {
            this.profilo = dati;
            this.editForm.patchValue({
              nome: dati.nome || '',
              cognome: dati.cognome || '',
              email: dati.email || ''
            });
          }
          this.isLoading = false;
          this.cdr.detectChanges();

          // Carica i preferiti solo per i clienti (non admin)
          if (!this.isAdmin) {
            this.caricaPreferiti();
          }
        },
        error: () => {
          this.errorMessage = 'Errore durante il caricamento del profilo.';
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private caricaPreferiti() {
    this.clienteService.ottieniDettaglioPreferiti()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (film) => {
          this.preferitiDettagliati = Array.isArray(film) ? film : [];
          this.cdr.detectChanges();
        }
      });
  }

  rimuoviDaPreferiti(idFilm: number) {
    this.clienteService.rimuoviPreferito(idFilm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.preferitiDettagliati = this.preferitiDettagliati.filter(f => f.idFilm !== idFilm);
          this.cdr.detectChanges();
        }
      });
  }

  salvaModifiche() {
    if (this.editForm.invalid) return;

    this.isLoading = true;
    this.clienteService.aggiornaProfilo(this.editForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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

  gestisciAccountSicurezza() {
    const accountUrl = this.authService.getAccountUrl();
    window.open(accountUrl, '_blank');
  }

  // ========== METODI PER L'ADMIN ==========

  private caricaOrdiniAdmin() {
    this.isLoadingAdmin = true;
    this.ordineService.ottieniTuttiGliOrdini()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ordini) => {
          this.ordini = Array.isArray(ordini) ? ordini : [];
          this.isLoadingAdmin = false;
          this.applicaFiltro();
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Errore nel caricamento degli ordini.';
          this.isLoadingAdmin = false;
          this.cdr.detectChanges();
        }
      });
  }

  applicaFiltro() {
    let filtrati = [...this.ordini];

    // Filtra per stato
    if (this.statoSelezionato) {
      filtrati = filtrati.filter(o => o.stato === this.statoSelezionato);
    }

    // Ordina per data
    filtrati.sort((a, b) => {
      const dataA = new Date(a.dataAcquisto).getTime();
      const dataB = new Date(b.dataAcquisto).getTime();
      return this.ordinamentoData === 'DESC' ? dataB - dataA : dataA - dataB;
    });

    this.ordiniFiltrati = filtrati;
    this.cdr.detectChanges();
  }

  cambiaStato(ordine: OrdineResponse, event: Event) {
    const select = event.target as HTMLSelectElement;
    const nuovoStato = select.value;

    this.ordineService.aggiornaStatoOrdine(ordine.idOrdine, nuovoStato)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ordineAggiornato) => {
          const index = this.ordini.findIndex(o => o.idOrdine === ordine.idOrdine);
          if (index !== -1) {
            this.ordini[index] = ordineAggiornato;
          }
          this.applicaFiltro();
          this.notificationService.success('Stato ordine aggiornato');
          this.cdr.detectChanges();
        },
        error: () => {
          this.notificationService.error('Errore nell\'aggiornamento dello stato');
          this.cdr.detectChanges();
        }
      });
  }

  get ordiniFiltrati(): OrdineResponse[] {
    return this._ordiniFiltrati;
  }

  set ordiniFiltrati(value: OrdineResponse[]) {
    this._ordiniFiltrati = value;
  }

  private _ordiniFiltrati: OrdineResponse[] = [];

  get totaleIncassato(): number {
    return this.ordini.reduce((sum, ordine) => sum + ordine.totale, 0);
  }

  get ordiniDaSpedire(): number {
    return this.ordini.filter(o => o.stato === 'IN_ELABORAZIONE').length;
  }
}