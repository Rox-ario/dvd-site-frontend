import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { FilmService } from '../../../services/film';
import { AdminCatalogoService } from '../../../services/admin-catalogo.service';
import { FilmResponse, CreaFilmRequest } from '../../../models/film.model';
import { Genere, Attore, Regista } from '../../../models/catalogo.model';

@Component({
  selector: 'app-gestione-film',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
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

  // Stato per la creazione rapida
  creazioneRapida = {
    attiva: false,
    tipo: '' as 'genere' | 'regista' | 'attore',
    nome: '',
    cognome: ''
  };

  avviaCreazioneRapida(tipo: 'genere' | 'regista' | 'attore') {
    this.creazioneRapida = { attiva: true, tipo, nome: '', cognome: '' };
  }

  annullaCreazioneRapida() {
    this.creazioneRapida.attiva = false;
  }

  salvaEntitaRapida() {
    const { tipo, nome, cognome } = this.creazioneRapida;
    if (!nome.trim()) return;

    if (tipo === 'genere') {
      this.adminCatalogoService.creaGenere({ nome: nome.trim() }).subscribe(nuovo => {
        this.generi = [...this.generi, nuovo]; // Aggiorna elenco dropdown
        const attuali = this.filmForm.value.idGeneri || [];
        this.filmForm.patchValue({ idGeneri: [...attuali, nuovo.id] }); // Auto-seleziona
        this.annullaCreazioneRapida();
      });
    } else if (tipo === 'regista') {
      this.adminCatalogoService.creaRegista({ nome: nome.trim(), cognome: cognome.trim() }).subscribe(nuovo => {
        this.registi = [...this.registi, nuovo];
        const attuali = this.filmForm.value.idRegisti || [];
        this.filmForm.patchValue({ idRegisti: [...attuali, nuovo.id] });
        this.annullaCreazioneRapida();
      });
    } else if (tipo === 'attore') {
      this.adminCatalogoService.creaAttore({ nome: nome.trim(), cognome: cognome.trim() }).subscribe(nuovo => {
        this.attori = [...this.attori, nuovo];
        const attuali = this.filmForm.value.idAttori || [];
        this.filmForm.patchValue({ idAttori: [...attuali, nuovo.id] });
        this.annullaCreazioneRapida();
      });
    }
  }

  // Helper: controlla se un ID è già presente nel valore attuale del form
  isItemSelected(controlName: string, id: number): boolean {
    const currentValues = this.filmForm.get(controlName)?.value || [];
    return currentValues.includes(id);
  }

  // Azione al click sulla riga: aggiunge o rimuove l'ID dall'array del form
  toggleSelection(controlName: string, id: number) {
    const control = this.filmForm.get(controlName);
    if (!control) return;

    const currentValues = [...(control.value || [])];
    const index = currentValues.indexOf(id);

    if (index > -1) {
      // Già presente, rimuovilo
      currentValues.splice(index, 1);
    } else {
      // Non presente, aggiungilo
      currentValues.push(id);
    }

    // Aggiorna il form patchando il valore
    control.setValue(currentValues);
    control.markAsDirty(); // Segnala che il form è stato modificato
  }

  eliminaGenere(id: number, nome: string, event: Event) {
    event.stopPropagation(); // BLOCCA il click sulla riga sottostante

    if (!confirm(`Sei sicuro di voler eliminare DEFINITIVAMENTE il genere '${nome}' dal database? Questa azione non può essere annullata.`)) {
      return;
    }

    this.adminCatalogoService.eliminaGenere(id).subscribe({
      next: () => {
        // 1. Rimuovi dall'elenco locale per aggiornare la lista
        this.generi = this.generi.filter(g => g.id !== id);
        // 2. Rimuovi dalla selezione nel form se era selezionato
        this.pulisciSelezioneSeEliminato('idGeneri', id);
      },
      error: (err) => alert("Errore durante l'eliminazione. Potrebbe essere utilizzato da alcuni film.")
    });
  }

  eliminaRegista(id: number, nome: string, cognome: string, event: Event) {
    event.stopPropagation();
    if (!confirm(`Sei sicuro di voler eliminare DEFINITIVAMENTE il regista '${nome} ${cognome}'?`)) return;

    this.adminCatalogoService.eliminaRegista(id).subscribe({
      next: () => {
        this.registi = this.registi.filter(r => r.id !== id);
        this.pulisciSelezioneSeEliminato('idRegisti', id);
      },
      error: () => alert("Impossibile eliminare.")
    });
  }

  eliminaAttore(id: number, nome: string, cognome: string, event: Event) {
    event.stopPropagation();
    if (!confirm(`Sei sicuro di voler eliminare DEFINITIVAMENTE l'attore '${nome} ${cognome}'?`)) return;

    this.adminCatalogoService.eliminaAttore(id).subscribe({
      next: () => {
        this.attori = this.attori.filter(a => a.id !== id);
        this.pulisciSelezioneSeEliminato('idAttori', id);
      },
      error: () => alert("Impossibile eliminare.")
    });
  }

  // Helper per rimuovere l'ID dal form se l'entità è stata cancellata dal db
  private pulisciSelezioneSeEliminato(controlName: string, idEliminato: number) {
    const control = this.filmForm.get(controlName);
    if (!control) return;
    const current = control.value || [];
    if (current.includes(idEliminato)) {
      control.setValue(current.filter((id: number) => id !== idEliminato));
    }
  }
}

