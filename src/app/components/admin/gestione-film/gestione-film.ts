import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FilmService } from '../../../services/film';
import { AdminCatalogoService } from '../../../services/admin-catalogo.service';
import { FilmResponse, CreaFilmRequest } from '../../../models/film.model';
import { Genere, Attore, Regista } from '../../../models/catalogo.model';

@Component({
  selector: 'app-gestione-film',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './gestione-film.html',
  styleUrls: ['./gestione-film.css']
})
export class GestioneFilmComponent implements OnInit {
  // Dati dal server
  filmList: FilmResponse[] = [];
  generi: Genere[] = [];
  attori: Attore[] = [];
  registi: Regista[] = [];

  // Gestione stato UI
  mostraForm = false;
  isLoading = false;
  filmInModificaId: number | null = null;
  filmForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private filmService: FilmService,
    private adminCatalogoService: AdminCatalogoService
  ) {
    this.filmForm = this.fb.group({
      titolo: ['', Validators.required],
      anno: ['', [Validators.required, Validators.min(1888)]],
      durataMinuti: ['', [Validators.required, Validators.min(1)]],
      prezzo: ['', [Validators.required, Validators.min(0)]],
      stock: ['', [Validators.required, Validators.min(0)]],
      trama: ['', Validators.required],
      urlImmagine: [''],
      idGeneri: [[]],
      idAttori: [[]],
      idRegisti: [[]]
    });
  }

  ngOnInit(): void {
    this.caricaDatiBase();
    this.caricaFilm();
  }

  caricaDatiBase() {
    this.adminCatalogoService.ottieniGeneri().subscribe(g => this.generi = g);
    this.adminCatalogoService.ottieniAttori().subscribe(a => this.attori = a);
    this.adminCatalogoService.ottieniRegisti().subscribe(r => this.registi = r);
  }

  caricaFilm() {
    this.filmService.esploraCatalogo().subscribe(f => this.filmList = f);
  }

  apriFormCreazione() {
    this.filmForm.reset({ idGeneri: [], idAttori: [], idRegisti: [] });
    this.filmInModificaId = null;
    this.mostraForm = true;
  }

  apriFormModifica(film: FilmResponse) {
    this.filmInModificaId = film.idFilm;

    // Per mappare le stringhe del DTO di risposta agli ID richiesti dal form,
    // in un'app reale dovremmo fare un match per nome, o farsi mandare gli ID dal backend.
    // Qui per semplicità azzeriamo le selezioni multiple, richiedendo di reinserirle.
    this.filmForm.patchValue({
      titolo: film.titolo,
      anno: film.anno,
      durataMinuti: film.durataMinuti,
      prezzo: film.prezzo,
      stock: film.stock,
      trama: film.trama,
      urlImmagine: film.urlImmagine,
      idGeneri: [], idAttori: [], idRegisti: []
    });
    this.mostraForm = true;
  }

  annulla() {
    this.mostraForm = false;
    this.filmInModificaId = null;
  }

  salvaFilm() {
    if (this.filmForm.invalid) return;
    this.isLoading = true;

    // Convertiamo i valori stringa delle select multiple in array di numeri
    const rawValue = this.filmForm.value;
    const requestData: CreaFilmRequest = {
      ...rawValue,
      idGeneri: rawValue.idGeneri.map(Number),
      idAttori: rawValue.idAttori.map(Number),
      idRegisti: rawValue.idRegisti.map(Number)
    };

    const operazione = this.filmInModificaId
      ? this.filmService.aggiornaFilm(this.filmInModificaId, requestData)
      : this.filmService.creaFilm(requestData);

    operazione.subscribe({
      next: () => {
        this.isLoading = false;
        this.mostraForm = false;
        this.caricaFilm(); // Ricarichiamo la lista aggiornata
      },
      error: (err) => {
        this.isLoading = false;
        alert("Errore durante il salvataggio: " + (err.error?.message || "Riprova."));
      }
    });
  }

  eliminaFilm(id: number, titolo: string) {
    if (confirm(`Sei sicuro di voler disattivare il film "${titolo}"?`)) {
      this.filmService.eliminaFilm(id).subscribe(() => this.caricaFilm());
    }
  }
}

