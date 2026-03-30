import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClienteService } from '../../../services/cliente';
import { ClienteProfileResponse } from '../../../models/cliente.model';
import { FilmResponse } from '../../../models/film.model';

@Component({
  selector: 'app-dashboard-cliente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard-cliente.html',
  styleUrls: ['./dashboard-cliente.css']
})
export class DashboardClienteComponent implements OnInit {
  profilo: ClienteProfileResponse | null = null;
  preferitiDettagliati: FilmResponse[] = [];
  isEditing = false;
  editForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private clienteService: ClienteService,
    private fb: FormBuilder
  ) {
    this.editForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2)]],
      cognome: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  ngOnInit(): void {
    this.caricaProfilo();
  }
  caricaProfilo() {
    this.isLoading = true;

    // Carichiamo l'anagrafica
    this.clienteService.ottieniProfilo().subscribe({
      next: (dati) => {
        this.profilo = dati;
        this.editForm.patchValue({ nome: dati.nome, cognome: dati.cognome });
        this.isLoading = false;
      },
      error: () => { this.errorMessage = 'Errore profilo'; this.isLoading = false; }
    });

    // Carichiamo i dettagli dei preferiti in parallelo
    this.clienteService.ottieniDettaglioPreferiti().subscribe({
      next: (film) => this.preferitiDettagliati = film
    });
  }

  rimuoviDaPreferiti(idFilm: number) {
    this.clienteService.rimuoviPreferito(idFilm).subscribe({
      next: () => {
        // Rimuoviamo l'elemento localmente senza dover ricaricare tutto dal server
        this.preferitiDettagliati = this.preferitiDettagliati.filter(f => f.idFilm !== idFilm);
      }
    });
  }

  salvaModifiche() {
    if (this.editForm.invalid) return;

    this.isLoading = true;

    this.clienteService.aggiornaProfilo(this.editForm.value).subscribe({
      next: (profiloAggiornato) => {
        this.profilo = profiloAggiornato;
        this.isEditing = false;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Errore durante il salvataggio dei dati.';
        this.isLoading = false;
      }
    });
  }

  toggleEditMode() {
    this.isEditing = !this.isEditing;
    // Se annulla, resettiamo il form ai dati originali
    if (!this.isEditing && this.profilo) {
      this.editForm.patchValue({
        nome: this.profilo.nome,
        cognome: this.profilo.cognome
      });
    }
  }
}

