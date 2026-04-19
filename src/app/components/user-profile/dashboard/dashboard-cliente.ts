import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClienteService } from '../../../services/cliente';
import { ClienteProfileResponse } from '../../../models/cliente.model';
import { FilmResponse } from '../../../models/film.model';
import { StoricoOrdiniComponent } from '../storico-ordini/storico-ordini';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { OrdineService } from '../../../services/ordine.service';
import { NotificationService } from '../../../services/notification.service';
import { OrdineResponse } from '../../../models/ordine.model';
import { Ruolo } from '../../../models/auth.model';

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

  // Gestione Tab
  activeTab: 'ordini' | 'preferiti' | 'pannello' = 'preferiti';

  isEditing = false;
  isChangingPassword = false;
  editForm: FormGroup;
  passwordForm!: FormGroup;

  // Show/hide password toggles
  showVecchia = false;
  showNuova = false;
  showConferma = false;
  isLoading = false;
  errorMessage = '';

  // === ADMIN ===
  isAdmin = false;

  // Dati admin (ordini globali, statistiche)
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

    this.passwordForm = this.fb.group({
      vecchiaPassword: ['', Validators.required],
      nuovaPassword: ['', [Validators.required, Validators.minLength(8)]],
      confermaNuovaPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator = (g: import('@angular/forms').AbstractControl) => {
    return g.get('nuovaPassword')?.value === g.get('confermaNuovaPassword')?.value
      ? null : { 'mismatch': true };
  };

  ngOnInit(): void {
    // Determina il ruolo
    this.isAdmin = this.authService.isAdmin();

    // Imposta il tab iniziale in base al ruolo
    if (this.isAdmin) {
      this.activeTab = 'pannello';
    } else {
      this.activeTab = 'preferiti';
    }

    this.caricaProfilo();

    // Se admin, carica anche i dati gestionali
    if (this.isAdmin) {
      this.caricaOrdiniAdmin();
    }
  }

  // ========================
  // PROFILO (comune)
  // ========================

  caricaProfilo() {
    this.isLoading = true;
    this.errorMessage = '';

    // Carichiamo l'anagrafica
    this.clienteService.ottieniProfilo().subscribe({
      next: (dati) => {
        // 2. Controllo anti-null e normalizzazione
        if (dati) {
          this.profilo = dati;
          this.profilo.puntiFedeltà = dati.puntiFedeltà || 0; // Garantiamo un valore numerico
          this.editForm.patchValue({
            nome: dati.nome || '',
            cognome: dati.cognome || ''
          });
        }

        this.isLoading = false;
        this.cdr.detectChanges(); // 3. Forza il ricalcolo della vista
      },
      error: (err) => {
        this.errorMessage = 'Errore durante il caricamento del profilo.';
        this.isLoading = false;
        this.cdr.detectChanges(); // Forza il ricalcolo anche in caso di errore
      }
    });

    // Carichiamo i dettagli dei preferiti (solo per clienti)
    if (!this.isAdmin) {
      this.clienteService.ottieniDettaglioPreferiti().subscribe({
        next: (film) => {
          this.preferitiDettagliati = Array.isArray(film) ? film : [];
          this.cdr.detectChanges(); //
        },
        error: () => {
          console.error('Impossibile caricare i preferiti.');
          this.cdr.detectChanges(); //
        }
      });
    }
  }

  rimuoviDaPreferiti(idFilm: number) {
    this.clienteService.rimuoviPreferito(idFilm).subscribe({
      next: () => {
        this.preferitiDettagliati = this.preferitiDettagliati.filter(f => f.idFilm !== idFilm);
        this.cdr.detectChanges(); //
      },
      error: () => {
        alert("Errore durante la rimozione dai preferiti.");
        this.cdr.detectChanges(); //
      }
    });
  }

  salvaModifiche() {
    if (this.editForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.clienteService.aggiornaProfilo(this.editForm.value).subscribe({
      next: (profiloAggiornato) => {
        if (profiloAggiornato) {
          this.profilo = profiloAggiornato;
          this.isEditing = false;
        }
        this.isLoading = false;
        this.cdr.detectChanges(); //
      },
      error: () => {
        this.errorMessage = 'Errore durante il salvataggio dei dati.';
        this.isLoading = false;
        this.cdr.detectChanges(); //
      }
    });
  }

  toggleEditMode() {
    this.isEditing = !this.isEditing;
    // Se stavamo cambiando la password, chiudiamo quel form
    if (this.isEditing) {
      this.isChangingPassword = false;
    }
    
    if (!this.isEditing && this.profilo) {
      this.editForm.patchValue({
        nome: this.profilo.nome,
        cognome: this.profilo.cognome,
        email: this.profilo.email
      });
    }
    this.cdr.detectChanges(); // Consigliato per transizioni UI immediate
  }

  togglePasswordMode() {
    this.isChangingPassword = !this.isChangingPassword;
    if (this.isChangingPassword) {
      this.isEditing = false;
      this.passwordForm.reset();
    }
    // Reset show/hide on open/close
    this.showVecchia = false;
    this.showNuova = false;
    this.showConferma = false;
    this.cdr.detectChanges();
  }

  getPasswordStrength(): { level: string; percent: number; label: string } {
    const pw: string = this.passwordForm.get('nuovaPassword')?.value || '';
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { level: 'weak',   percent: 25,  label: 'Debole' };
    if (score === 2) return { level: 'fair',   percent: 50,  label: 'Sufficiente' };
    if (score === 3) return { level: 'good',   percent: 75,  label: 'Buona' };
    return              { level: 'strong', percent: 100, label: 'Ottima' };
  }

  salvaPassword() {
    if (this.passwordForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    
    // Assumendo che esista un metodo modificaPassword in clienteService
    this.clienteService.modificaPassword(this.passwordForm.value).subscribe({
      next: () => {
        this.notificationService.success("Password aggiornata correttamente.");
        this.isChangingPassword = false;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || err.error || "Errore durante il cambio password.";
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  protected getPuntiFedelta()
  {
    return this.profilo?.puntiFedeltà ?? 0; // Garantisce un numero anche se il campo è null o undefined
  }

  setTab(tab: 'ordini' | 'preferiti' | 'pannello') {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  // Nuovo helper per l'avatar visivo
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
}
