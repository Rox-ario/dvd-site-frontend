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
  errorMessage = '';

  // Metriche calcolate
  totaleIncassato = 0;
  ordiniDaSpedire = 0;

  statoSelezionato = '';
  statiDisponibili = ['IN_ELABORAZIONE', 'SPEDITO', 'CONSEGNATO', 'ANNULLATO'];

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

  cambiaStato(idOrdine: number, evento: Event) {
    const selectElement = evento.target as HTMLSelectElement;
    const nuovoStato = selectElement.value;

    this.ordineService.aggiornaStatoOrdine(idOrdine, nuovoStato).subscribe({
      next: (ordineAggiornato) => {
        const index = this.ordini.findIndex(o => o.numeroOrdine === idOrdine);
        if (index !== -1) {
          this.ordini[index] = ordineAggiornato;
          this.calcolaStatistiche(); // Ricalcola se annulliamo un ordine
        }
      },
      error: (err) => {
        alert("Errore durante l'aggiornamento: " + (err.error?.message || "Riprova."));
        this.caricaOrdini(); // Ripristina la UI allo stato precedente
      }
    });
  }
}

