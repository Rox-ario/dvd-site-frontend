import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrdineService } from '../../../services/ordine.service';
import { OrdineResponse } from '../../../models/ordine.model';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-storico-ordini',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './storico-ordini.html',
  styleUrls: ['./storico-ordini.css']
})
export class StoricoOrdiniComponent implements OnInit {
  ordini: OrdineResponse[] = [];
  isLoading = true;
  errorMessage = '';
  annullamentoInCorso = new Set<number>();

  constructor(
    private ordineService: OrdineService,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.caricaStorico();
  }

  caricaStorico() {
    this.ordineService.ottieniMioStorico().subscribe({
      next: (page) => {
        this.ordini = page.content;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.status === 404) {
          this.ordini = [];
        } else {
          this.errorMessage = 'Impossibile caricare lo storico ordini.';
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  async annullaOrdine(idOrdine: number) {
    const confermato = await this.notificationService.confirm({
      title: 'Annullare l\'ordine?',
      message: 'L\'ordine verrà annullato e il rimborso verrà avviato automaticamente. Questa azione non può essere annullata.',
      confirmText: 'Sì, annulla ordine',
      cancelText: 'No, mantieni',
      type: 'danger'
    });

    if (!confermato) {
      return;
    }

    this.annullamentoInCorso.add(idOrdine);
    this.cdr.detectChanges();

    this.ordineService.annullaMioOrdine(idOrdine).subscribe({
      next: (ordineAggiornato) => {
        const index = this.ordini.findIndex(o => o.numeroOrdine === idOrdine);
        if (index !== -1) {
          this.ordini[index] = ordineAggiornato;
        }
        this.annullamentoInCorso.delete(idOrdine);
        this.cdr.detectChanges();
        this.notificationService.success('Ordine #' + idOrdine + ' annullato con successo. Il rimborso è stato avviato.');
      },
      error: (err) => {
        this.annullamentoInCorso.delete(idOrdine);
        this.cdr.detectChanges();
        this.notificationService.error(err.error?.message || err.error || "Impossibile annullare l'ordine.");
      }
    });
  }
}
