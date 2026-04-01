import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; //
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
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef // 1. Iniezione del ChangeDetectorRef
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

    // Carichiamo i dettagli dei preferiti
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
    if (!this.isEditing && this.profilo) {
      this.editForm.patchValue({
        nome: this.profilo.nome,
        cognome: this.profilo.cognome
      });
    }
    this.cdr.detectChanges(); // Consigliato per transizioni UI immediate
  }
}
