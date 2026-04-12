import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdineService } from '../../../services/ordine.service';
import { NotificationService } from '../../../services/notification.service';
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
  ordinamentoData: 'DESC' | 'ASC' = 'DESC';

  constructor(
    private ordineService: OrdineService,
    private notificationService: NotificationService,
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
        this.notificationService.error('Impossibile caricare il registro degli ordini dal server.');
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
