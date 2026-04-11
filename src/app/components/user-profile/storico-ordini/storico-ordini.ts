import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrdineService } from '../../../services/ordine.service';
import { OrdineResponse } from '../../../models/ordine.model';
import { RouterModule } from '@angular/router';

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

  constructor(private ordineService: OrdineService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.caricaStorico();
  }

  caricaStorico() {
    this.ordineService.ottieniMioStorico().subscribe({
      next: (dati) => {
        this.ordini = dati;
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

  annullaOrdine(idOrdine: number) {
    if (!confirm('Sei sicuro di voler annullare questo ordine e richiedere il rimborso?')) {
      return;
    }

    this.isLoading = true;
    this.ordineService.annullaMioOrdine(idOrdine).subscribe({
      next: (ordineAggiornato) => {
        const index = this.ordini.findIndex(o => o.numeroOrdine === idOrdine);
        if (index !== -1) {
          this.ordini[index] = ordineAggiornato;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
        alert('Ordine annullato. Il rimborso è stato avviato.');
      },
      error: (err) => {
        this.isLoading = false;
        alert(err.error?.message || err.error || "Impossibile annullare l'ordine.");
        this.cdr.detectChanges();
      }
    });
  }
}

