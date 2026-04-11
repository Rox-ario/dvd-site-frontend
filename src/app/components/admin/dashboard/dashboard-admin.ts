import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdineService } from '../../../services/ordine.service';
import { OrdineResponse } from '../../../models/ordine.model';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard-admin.html',
  styleUrls: ['./dashboard-admin.css']
})
export class DashboardAdminComponent implements OnInit {
  ordini: OrdineResponse[] = [];
  ordiniFiltrati: OrdineResponse[] = [];
  isLoading = true;

  // Metriche calcolate
  totaleIncassato = 0;
  ordiniDaSpedire = 0;

  statoSelezionato = '';
  statiDisponibili = ['IN_ELABORAZIONE', 'SPEDITO', 'CONSEGNATO', 'ANNULLATO'];

  errorMessage = '';
  successMessage = '';

  constructor(
    private ordineService: OrdineService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.caricaOrdini();
  }

  caricaOrdini() {
    this.isLoading = true;
    this.ordineService.ottieniTuttiGliOrdini().subscribe({
      next: (dati) => {
        this.ordini = Array.isArray(dati) ? dati : [];
        this.ordini.forEach(o => o.stato = o.stato || 'IN_ELABORAZIONE');

        this.applicaFiltro();
        this.calcolaStatistiche();
        this.isLoading = false;

        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Impossibile caricare il registro degli ordini dal server.';
        this.isLoading = false;
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
    if (this.statoSelezionato) {
      this.ordiniFiltrati = this.ordini.filter(o => o.stato === this.statoSelezionato);
    } else {
      this.ordiniFiltrati = [...this.ordini];
    }
  }

  cambiaStato(ordine: OrdineResponse, evento: Event) {
    const selectElement = evento.target as HTMLSelectElement;
    const nuovoStato = selectElement.value;
    const vecchioStato = ordine.stato;

    // Puliamo i messaggi precedenti
    this.errorMessage = '';
    this.successMessage = '';

    if (!confirm(`Attenzione: Stai per cambiare lo stato dell'ordine #${ordine.numeroOrdine} da ${vecchioStato.replace('_', ' ')} a ${nuovoStato.replace('_', ' ')}. Vuoi procedere?`)) {
      selectElement.value = vecchioStato;
      return;
    }

    this.ordineService.aggiornaStatoOrdine(ordine.numeroOrdine, nuovoStato).subscribe({
      next: (ordineAggiornato) => {
        const index = this.ordini.findIndex(o => o.numeroOrdine === ordine.numeroOrdine);
        if (index !== -1) {
          this.ordini[index] = ordineAggiornato;
          this.calcolaStatistiche();

          // Mostriamo il successo a schermo invece che con un alert
          this.successMessage = `Stato dell'ordine #${ordine.numeroOrdine} aggiornato in ${nuovoStato.replace('_', ' ')}.`;
          this.cdr.detectChanges();

          // Nascondiamo il messaggio dopo 3.5 secondi
          setTimeout(() => {
            this.successMessage = '';
            this.cdr.detectChanges();
          }, 3500);
        }
      },
      error: (err) => {
        // RIMOSSO L'ALERT NATIVO! Passiamo il testo alla variabile UI
        this.errorMessage = "Errore durante l'aggiornamento: " + (err.error?.message || "Riprova.");
        selectElement.value = vecchioStato; // Rollback visivo in caso di errore
        this.cdr.detectChanges();

        // Nascondiamo l'errore dopo 3.5 secondi
        setTimeout(() => {
          this.errorMessage = '';
          this.cdr.detectChanges();
        }, 3500);
      }
    });
  }
}

