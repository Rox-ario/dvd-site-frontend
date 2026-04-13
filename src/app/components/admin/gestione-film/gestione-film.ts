import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { FilmService } from '../../../services/film';
import { AdminCatalogoService } from '../../../services/admin-catalogo.service';
import { NotificationService } from '../../../services/notification.service';
import { FilmResponse, CreaFilmRequest } from '../../../models/film.model';
import { Genere, Attore, Regista } from '../../../models/catalogo.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-gestione-film',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './gestione-film.html',
  styleUrls: ['./gestione-film.css']
})
export class GestioneFilmComponent implements OnInit {
  // Dati dal server
  filmList: FilmResponse[] = [];
  generi: Genere[] = [];
  attori: Attore[] = [];
  registi: Regista[] = [];
  testoRicerca = '';
  genereSelezionato = '';

  ricercaGenereTerm = '';
  ricercaRegistaTerm = '';
  ricercaAttoreTerm = '';

  // Gestione stato UI
  mostraForm = false;
  isLoading = false;
  filmInModificaId: number | null = null;
  filmForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private filmService: FilmService,
    private adminCatalogoService: AdminCatalogoService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
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

  get generiFiltrati(): Genere[] {
    const selezionati = this.filmForm.get('idGeneri')?.value || [];
    const term = this.ricercaGenereTerm.toLowerCase().trim();

    return this.generi.filter(g =>
      selezionati.includes(g.id) || g.nome.toLowerCase().includes(term)
    ).sort((a, b) => this.ordinaSelezionatiInCima(selezionati, a.id, b.id) || a.nome.localeCompare(b.nome));
  }

  get registiFiltrati(): Regista[] {
    const selezionati = this.filmForm.get('idRegisti')?.value || [];
    const term = this.ricercaRegistaTerm.toLowerCase().trim();

    return this.registi.filter(r => {
      const nomeCompleto = `${r.nome} ${r.cognome}`.toLowerCase();
      return selezionati.includes(r.id) || nomeCompleto.includes(term);
    }).sort((a, b) => this.ordinaSelezionatiInCima(selezionati, a.id, b.id) || a.nome.localeCompare(b.nome));
  }

  get attoriFiltrati(): Attore[] {
    const selezionati = this.filmForm.get('idAttori')?.value || [];
    const term = this.ricercaAttoreTerm.toLowerCase().trim();

    return this.attori.filter(a => {
      const nomeCompleto = `${a.nome} ${a.cognome}`.toLowerCase();
      return selezionati.includes(a.id) || nomeCompleto.includes(term);
    }).sort((a, b) => this.ordinaSelezionatiInCima(selezionati, a.id, b.id) || a.nome.localeCompare(b.nome));
  }

  // Helper per mantenere gli elementi spuntati sempre in cima alla lista
  private ordinaSelezionatiInCima(selezionati: number[], idA: number, idB: number): number {
    const aSel = selezionati.includes(idA);
    const bSel = selezionati.includes(idB);
    if (aSel && !bSel) return -1;
    if (!aSel && bSel) return 1;
    return 0; // Se entrambi selezionati o entrambi non selezionati, passa al sorting alfabetico
  }

  caricaDatiBase() {
    this.adminCatalogoService.ottieniGeneri().subscribe(g => this.generi = g);
    this.adminCatalogoService.ottieniAttori().subscribe(a => this.attori = a);
    this.adminCatalogoService.ottieniRegisti().subscribe(r => this.registi = r);
  }

  caricaFilm() {
    this.isLoading = true;

    // Costruiamo dinamicamente l'oggetto con i filtri solo se contengono testo
    const filtri: any = {};
    if (this.testoRicerca.trim()) {
      filtri.titolo = this.testoRicerca.trim();
    }
    if (this.genereSelezionato) {
      filtri.nomeGenere = this.genereSelezionato;
    }

    // Ora passiamo l'oggetto filtri al service
    this.filmService.esploraCatalogo(filtri).subscribe({
      next: (f) => {
        this.filmList = f;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  salvaFilm() {
    if (this.filmForm.invalid) return;
    this.isLoading = true;

    const rawValue = this.filmForm.value;
    const requestData: CreaFilmRequest = {
      ...rawValue,
      idGeneri: rawValue.idGeneri.map(Number),
      idAttori: rawValue.idAttori.map(Number),
      idRegisti: rawValue.idRegisti.map(Number)
    };

    const isModifica = !!this.filmInModificaId;
    const operazione = isModifica
      ? this.filmService.aggiornaFilm(this.filmInModificaId!, requestData)
      : this.filmService.creaFilm(requestData);

    operazione.subscribe({
      next: () => {
        this.isLoading = false;
        this.mostraForm = false;

        // Toast notification
        if (isModifica) {
          this.notificationService.success('Modifica salvata con successo! ✏️');
        } else {
          this.notificationService.success('Nuovo film aggiunto al catalogo! 🍿');
        }

        this.caricaFilm();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.notificationService.error('Errore durante il salvataggio: ' + (err.error?.message || 'Riprova.'));
        this.cdr.detectChanges();
      }
    });
  }

  async eliminaFilm(id: number, titolo: string) {
    const conferma = await this.notificationService.confirm({
      title: 'Conferma eliminazione',
      message: `Sei sicuro di voler disattivare il film "${titolo}"? Il film non sarà più visibile nel catalogo.`,
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      type: 'danger'
    });

    if (conferma) {
      this.filmService.eliminaFilm(id).subscribe({
        next: () => {
          this.notificationService.success(`Il film "${titolo}" è stato rimosso dal catalogo. 🗑️`);
          this.caricaFilm();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.notificationService.error('Errore durante l\'eliminazione: ' + (err.error?.message || 'Riprova.'));
        }
      });
    }
  }

  apriFormModifica(film: FilmResponse) {
    this.filmInModificaId = film.idFilm;

    // 1. Ricostruiamo gli ID dei Generi
    const idGeneriEstratti = film.genere
      ? this.generi.filter(g => film.genere.includes(g.nome)).map(g => g.id)
      : [];

    // 2. Ricostruiamo gli ID dei Registi
    const idRegistiEstratti = film.registi
      ? this.registi.filter(r => film.registi.includes(`${r.nome} ${r.cognome}`)).map(r => r.id)
      : [];

    // 3. Ricostruiamo gli ID degli Attori
    const idAttoriEstratti = film.attori
      ? this.attori.filter(a => film.attori.includes(`${a.nome} ${a.cognome}`)).map(a => a.id)
      : [];

    // 4. Popoliamo il form con i dati completi
    this.filmForm.patchValue({
      titolo: film.titolo,
      anno: film.anno,
      durataMinuti: film.durataMinuti,
      prezzo: film.prezzo,
      stock: film.stock,
      trama: film.trama,
      urlImmagine: film.urlImmagine,
      idGeneri: idGeneriEstratti,
      idAttori: idAttoriEstratti,
      idRegisti: idRegistiEstratti
    });

    this.mostraForm = true;
  }

  annulla() {
    this.mostraForm = false;
    this.filmInModificaId = null;
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
      this.adminCatalogoService.creaGenere({ nome: nome.trim() }).subscribe({
        next: (nuovo) => {
          this.generi = [...this.generi, nuovo];
          const attuali = this.filmForm.value.idGeneri || [];
          this.filmForm.patchValue({ idGeneri: [...attuali, nuovo.id] });
          this.annullaCreazioneRapida();
          this.notificationService.success(`Genere "${nuovo.nome}" creato con successo!`);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.notificationService.error('Errore: ' + (err.error?.message || 'Impossibile creare il genere.'));
          this.cdr.detectChanges();
        }
      });
    } else if (tipo === 'regista') {
      this.adminCatalogoService.creaRegista({ nome: nome.trim(), cognome: cognome.trim() }).subscribe({
        next: (nuovo) => {
          this.registi = [...this.registi, nuovo];
          const attuali = this.filmForm.value.idRegisti || [];
          this.filmForm.patchValue({ idRegisti: [...attuali, nuovo.id] });
          this.annullaCreazioneRapida();
          this.notificationService.success(`Regista "${nuovo.nome} ${nuovo.cognome}" creato con successo!`);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.notificationService.error('Errore: ' + (err.error?.message || 'Impossibile creare il regista.'));
          this.cdr.detectChanges();
        }
      });
    } else if (tipo === 'attore') {
      this.adminCatalogoService.creaAttore({ nome: nome.trim(), cognome: cognome.trim() }).subscribe({
        next: (nuovo) => {
          this.attori = [...this.attori, nuovo];
          const attuali = this.filmForm.value.idAttori || [];
          this.filmForm.patchValue({ idAttori: [...attuali, nuovo.id] });
          this.annullaCreazioneRapida();
          this.notificationService.success(`Attore "${nuovo.nome} ${nuovo.cognome}" creato con successo!`);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.notificationService.error('Errore: ' + (err.error?.message || "Impossibile creare l'attore."));
          this.cdr.detectChanges();
        }
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

  async eliminaGenere(id: number, nome: string, event: Event) {
    event.stopPropagation();

    const conferma = await this.notificationService.confirm({
      title: 'Eliminazione definitiva',
      message: `Sei sicuro di voler eliminare DEFINITIVAMENTE il genere "${nome}" dal database? Questa azione non può essere annullata.`,
      confirmText: 'Elimina definitivamente',
      cancelText: 'Annulla',
      type: 'danger'
    });

    if (!conferma) return;

    this.adminCatalogoService.eliminaGenere(id).subscribe({
      next: () => {
        this.generi = this.generi.filter(g => g.id !== id);
        this.pulisciSelezioneSeEliminato('idGeneri', id);
        this.notificationService.success(`Genere "${nome}" eliminato.`);
      },
      error: () => this.notificationService.error("Errore durante l'eliminazione. Potrebbe essere utilizzato da alcuni film.")
    });
  }

  async eliminaRegista(id: number, nome: string, cognome: string, event: Event) {
    event.stopPropagation();

    const conferma = await this.notificationService.confirm({
      title: 'Eliminazione definitiva',
      message: `Sei sicuro di voler eliminare DEFINITIVAMENTE il regista "${nome} ${cognome}"?`,
      confirmText: 'Elimina definitivamente',
      cancelText: 'Annulla',
      type: 'danger'
    });

    if (!conferma) return;

    this.adminCatalogoService.eliminaRegista(id).subscribe({
      next: () => {
        this.registi = this.registi.filter(r => r.id !== id);
        this.pulisciSelezioneSeEliminato('idRegisti', id);
        this.notificationService.success(`Regista "${nome} ${cognome}" eliminato.`);
      },
      error: () => this.notificationService.error('Impossibile eliminare.')
    });
  }

  async eliminaAttore(id: number, nome: string, cognome: string, event: Event) {
    event.stopPropagation();

    const conferma = await this.notificationService.confirm({
      title: 'Eliminazione definitiva',
      message: `Sei sicuro di voler eliminare DEFINITIVAMENTE l'attore "${nome} ${cognome}"?`,
      confirmText: 'Elimina definitivamente',
      cancelText: 'Annulla',
      type: 'danger'
    });

    if (!conferma) return;

    this.adminCatalogoService.eliminaAttore(id).subscribe({
      next: () => {
        this.attori = this.attori.filter(a => a.id !== id);
        this.pulisciSelezioneSeEliminato('idAttori', id);
        this.notificationService.success(`Attore "${nome} ${cognome}" eliminato.`);
      },
      error: () => this.notificationService.error('Impossibile eliminare.')
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

  apriFormCreazione()
  {
    this.filmInModificaId = null;
    this.filmForm.reset({ anno: new Date().getFullYear(), prezzo: 0 }); // Valori default puliti
    this.mostraForm = true;
    this.cdr.detectChanges(); // Consigliato per transizione fluida
  }

  annullaForm() {
    this.mostraForm = false;
    this.cdr.detectChanges();
  }
}
