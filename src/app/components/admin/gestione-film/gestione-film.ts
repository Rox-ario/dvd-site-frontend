import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { FilmService } from '../../../services/film';
import { AdminCatalogoService } from '../../../services/admin-catalogo.service';
import { NotificationService } from '../../../services/notification.service';
import { FilmResponse, CreaFilmRequest } from '../../../models/film.model';
import { Genere, Attore, Regista } from '../../../models/catalogo.model';
import { RouterLink } from '@angular/router';
import { Observable, debounceTime, distinctUntilChanged, switchMap, of, map } from 'rxjs';
import { Page } from '../../../models/pagination.model';

@Component({
  selector: 'app-gestione-film',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './gestione-film.html',
  styleUrls: ['./gestione-film.css']
})
export class GestioneFilmComponent implements OnInit {
  // Dati dal server per la tabella
  filmList: FilmResponse[] = [];
  generi: Genere[] = []; // Utilizzato solo per la tendina dei filtri veloci

  // Paginazione e Ricerca Tabella
  testoRicerca = '';
  genereSelezionato = '';
  paginaCorrente = 0;
  dimensionePagina = 10;
  totaleElementi = 0;
  totalePagine = 0;

  // Gestione stato UI
  mostraForm = false;
  isLoading = false;
  filmInModificaId: number | null = null;
  filmForm: FormGroup;

  // Gestione Curiosità
  curiositaTemp: string[] = [];
  lunghezzaMassima = 250;
  nuovaCuriositaTesto: string = '';

  // Controlli per i Typeahead (Nuova logica)
  searchGenereCtrl = new FormControl('');
  searchAttoreCtrl = new FormControl('');
  searchRegistaCtrl = new FormControl('');

  // Risultati delle ricerche Typeahead
  generiRisultati$!: Observable<Genere[]>;
  attoriRisultati$!: Observable<Attore[]>;
  registiRisultati$!: Observable<Regista[]>;

  // Stato visuale degli elementi selezionati (Chips)
  generiSelezionati: Genere[] = [];
  attoriSelezionati: Attore[] = [];
  registiSelezionati: Regista[] = [];

  // Stato per la creazione rapida
  creazioneRapida = {
    attiva: false,
    tipo: '' as 'genere' | 'regista' | 'attore',
    nome: '',
    cognome: ''
  };

  constructor(
    private fb: FormBuilder,
    private filmService: FilmService,
    private adminCatalogoService: AdminCatalogoService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {
    this.filmForm = this.fb.group({
      curiosita: [[]],
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
    // Ora il service ci garantisce un Array pulito, zero crash.
    this.adminCatalogoService.ottieniGeneri().subscribe(generi => this.generi = generi);
    this.caricaFilm();
    this.inizializzaTypeahead();
  }

  caricaFilm() {
    this.isLoading = true;
    const filtri: any = {};
    if (this.testoRicerca.trim()) filtri.titolo = this.testoRicerca.trim();
    if (this.genereSelezionato) filtri.nomeGenere = this.genereSelezionato;

    // Passiamo pagina e dimensione, riceviamo direttamente la Page<FilmResponse>
    this.filmService.esploraCatalogo(filtri, this.paginaCorrente, this.dimensionePagina).subscribe({
      next: (page: Page<FilmResponse>) => {
        this.filmList = page.content;
        this.totaleElementi = page.totalElements;
        this.totalePagine = page.totalPages;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.filmList = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  inizializzaTypeahead() {
    // Usiamo ricercaGeneri(term) in modo che il filtro avvenga LATO SERVER sfruttando il backend
    this.generiRisultati$ = this.searchGenereCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => term && term.length > 1 ?
        this.adminCatalogoService.ricercaGeneri(term).pipe(map(p => p.content)) : of([])
      )
    );

    this.attoriRisultati$ = this.searchAttoreCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => term && term.length > 2 ?
        this.adminCatalogoService.ricercaAttori(term).pipe(map(p => p.content)) : of([])
      )
    );

    this.registiRisultati$ = this.searchRegistaCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => term && term.length > 2 ?
        this.adminCatalogoService.ricercaRegisti(term).pipe(map(p => p.content)) : of([])
      )
    );
  }

  // ==========================================
  // AZIONI TYPEAHEAD: AGGIUNGI / RIMUOVI
  // ==========================================
  aggiungiGenere(genere: Genere) {
    if (!this.generiSelezionati.find(g => g.id === genere.id)) {
      this.generiSelezionati.push(genere);
      this.aggiornaFormIds('idGeneri', this.generiSelezionati);
    }
    this.searchGenereCtrl.setValue('');
  }

  rimuoviGenere(id: number) {
    this.generiSelezionati = this.generiSelezionati.filter(g => g.id !== id);
    this.aggiornaFormIds('idGeneri', this.generiSelezionati);
  }

  aggiungiAttore(attore: Attore) {
    if (!this.attoriSelezionati.find(a => a.id === attore.id)) {
      this.attoriSelezionati.push(attore);
      this.aggiornaFormIds('idAttori', this.attoriSelezionati);
    }
    this.searchAttoreCtrl.setValue('');
  }

  rimuoviAttore(id: number) {
    this.attoriSelezionati = this.attoriSelezionati.filter(a => a.id !== id);
    this.aggiornaFormIds('idAttori', this.attoriSelezionati);
  }

  aggiungiRegista(regista: Regista) {
    if (!this.registiSelezionati.find(r => r.id === regista.id)) {
      this.registiSelezionati.push(regista);
      this.aggiornaFormIds('idRegisti', this.registiSelezionati);
    }
    this.searchRegistaCtrl.setValue('');
  }

  rimuoviRegista(id: number) {
    this.registiSelezionati = this.registiSelezionati.filter(r => r.id !== id);
    this.aggiornaFormIds('idRegisti', this.registiSelezionati);
  }

  private aggiornaFormIds(controlName: string, items: any[]) {
    // Filtriamo via eventuali ID negativi/indefiniti generati dai mock per evitare crash backend
    const idValidi = items.map(i => i.id).filter(id => id && id > 0);
    this.filmForm.get(controlName)?.setValue(idValidi);
    this.filmForm.get(controlName)?.markAsDirty();
  }

  // ==========================================
  // TABELLA E PAGINAZIONE
  // ==========================================

  cambiaPagina(nuovaPagina: number) {
    if (nuovaPagina >= 0 && nuovaPagina < this.totalePagine) {
      this.paginaCorrente = nuovaPagina;
      this.caricaFilm();
    }
  }

  onRicercaModificata() {
    this.paginaCorrente = 0;
    this.caricaFilm();
  }

  // ==========================================
  // FORM: APERTURA E CHIUSURA
  // ==========================================
  apriFormCreazione() {
    this.filmInModificaId = null;
    this.filmForm.reset({ anno: new Date().getFullYear(), prezzo: 0 });
    this.generiSelezionati = [];
    this.attoriSelezionati = [];
    this.registiSelezionati = [];
    this.curiositaTemp = [];
    this.mostraForm = true;
    this.cdr.detectChanges();
  }

  apriFormModifica(film: FilmResponse) {
    this.filmInModificaId = film.idFilm;

    // MOCK DEGLI OGGETTI (PERICOLO LOGICO: senza ID reali il salvataggio ignorerà queste entità o fallirà)
    this.generiSelezionati = film.genere
      ? film.genere.map((nome, index) => ({ id: -(index + 1), nome }))
      : [];

    this.attoriSelezionati = film.attori
      ? film.attori.map((nomeCompleto, index) => {
        const parts = nomeCompleto.split(' ');
        return { id: -(index + 1), nome: parts[0], cognome: parts.slice(1).join(' ') };
      })
      : [];

    this.registiSelezionati = film.registi
      ? film.registi.map((nomeCompleto, index) => {
        const parts = nomeCompleto.split(' ');
        return { id: -(index + 1), nome: parts[0], cognome: parts.slice(1).join(' ') };
      })
      : [];

    this.curiositaTemp = film.curiosita ? [...film.curiosita] : [];

    this.filmForm.patchValue({
      titolo: film.titolo,
      anno: film.anno,
      durataMinuti: film.durataMinuti,
      prezzo: film.prezzo,
      stock: film.stock,
      trama: film.trama,
      urlImmagine: film.urlImmagine,
      curiosita: this.curiositaTemp,
      idGeneri: [], // Non possiamo passare ID negativi al form
      idAttori: [],
      idRegisti: []
    });

    this.mostraForm = true;
  }

  annullaForm() {
    this.mostraForm = false;
    this.filmInModificaId = null;
  }

  // ==========================================
  // SALVATAGGIO ED ELIMINAZIONE FILM
  // ==========================================
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

    const operazione = this.filmInModificaId
      ? this.filmService.aggiornaFilm(this.filmInModificaId, requestData)
      : this.filmService.creaFilm(requestData);

    operazione.subscribe({
      next: () => {
        this.isLoading = false;
        this.mostraForm = false;
        this.notificationService.success(this.filmInModificaId ? 'Modifica salvata! ✏️' : 'Nuovo DVD aggiunto! 🍿');
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
      message: `Sei sicuro di voler rimuovere il film "${titolo}"?`,
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      type: 'danger'
    });

    if (conferma) {
      this.filmService.eliminaFilm(id).subscribe({
        next: () => {
          this.notificationService.success(`Il film "${titolo}" è stato rimosso. 🗑️`);
          this.caricaFilm();
          this.cdr.detectChanges();
        },
        error: () => this.notificationService.error('Errore durante l\'eliminazione.')
      });
    }
  }

  // ==========================================
  // GESTIONE CURIOSITA'
  // ==========================================
  aggiungiCuriosita() {
    const testo = this.nuovaCuriositaTesto.trim();
    if (testo && testo.length <= this.lunghezzaMassima) {
      this.curiositaTemp.push(testo);
      this.filmForm.patchValue({ curiosita: this.curiositaTemp });
      this.nuovaCuriositaTesto = '';
    }
  }

  rimuoviCuriosita(index: number) {
    this.curiositaTemp.splice(index, 1);
    this.filmForm.patchValue({ curiosita: this.curiositaTemp });
  }

  // ==========================================
  // CREAZIONE RAPIDA (Generi/Registi/Attori)
  // ==========================================
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
          this.aggiungiGenere(nuovo);
          this.annullaCreazioneRapida();
        }
      });
    } else if (tipo === 'regista') {
      this.adminCatalogoService.creaRegista({ nome: nome.trim(), cognome: cognome.trim() }).subscribe({
        next: (nuovo) => {
          this.aggiungiRegista(nuovo);
          this.annullaCreazioneRapida();
        }
      });
    } else if (tipo === 'attore') {
      this.adminCatalogoService.creaAttore({ nome: nome.trim(), cognome: cognome.trim() }).subscribe({
        next: (nuovo) => {
          this.aggiungiAttore(nuovo);
          this.annullaCreazioneRapida();
        }
      });
    }
  }
}