import { Component, OnInit } from '@angular/core';
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

  constructor(private ordineService: OrdineService) {}

  ngOnInit(): void {
    this.caricaStorico();
  }

  caricaStorico() {
    this.ordineService.ottieniMioStorico().subscribe({
      next: (dati) => {
        this.ordini = dati;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossibile caricare lo storico ordini.';
        this.isLoading = false;
      }
    });
  }
}

