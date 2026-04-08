import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {Router, RouterModule} from '@angular/router';
import {
  Observable, debounceTime, distinctUntilChanged, startWith, switchMap, catchError, of, shareReplay,
  combineLatest, map
} from 'rxjs';
import { FilmService } from '../../../services/film';
import { CartService } from '../../../services/cart';
import { ClienteService } from '../../../services/cliente'; // Aggiunto per i preferiti
import { AuthService } from '../../../services/auth';       // Aggiunto per verificare se è loggato
import { FilmResponse } from '../../../models/film.model';
import {Attore, Genere, Regista} from '../../../models/catalogo.model';
import {AdminCatalogoService} from '../../../services/admin-catalogo.service';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './catalogo.html',
  styleUrls: ['./catalogo.css']
})
export class CatalogoComponent implements OnInit {
  filterForm: FormGroup;
  searchControl = new FormControl('');
  film$!: Observable<FilmResponse[]>;
  errorMessage = '';
  isAdmin = false;
  mostraFiltriAvanzati = false;
  searchGenere = new FormControl('');
  searchRegista = new FormControl('');
  searchAttore = new FormControl('');

  // Dati per i filtri
  filteredGeneri$!: Observable<Genere[]>;
  filteredRegisti$!: Observable<Regista[]>;
  filteredAttori$!: Observable<Attore[]>;

  // Set reattivo per tenere traccia dei film appena aggiunti al carrello (per il feedback visivo)
  aggiuntiDiRecente = new Set<number>();

  // Nuove variabili per la gestione dei preferiti
  preferitiIds = new Set<number>();
  isLoggedIn = false;

  constructor(
    private fb: FormBuilder,
    private filmService: FilmService,
    private cartService: CartService,
    private clienteService: ClienteService, // Iniettato
    private authService: AuthService,        // Iniettato
    private catalogoService: AdminCatalogoService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    // Definizione di tutti i criteri di ricerca
    this.filterForm = this.fb.group({
      titolo: [''],
      nomeGenere: [''],
      nomeRegista: [''],
      nomeAttore: [''],
      anno: [null],
      prezzoMax: [null]
    });
  }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.isAdmin = this.authService.isAdmin();

    if (this.isLoggedIn) {
      // Usa il metodo leggero al posto di ottieniDettaglioPreferiti()
      this.clienteService.ottieniIdPreferiti().subscribe({
        next: (ids) => {
          ids.forEach(id => this.preferitiIds.add(id));
        },
        error: () => console.error('Impossibile caricare i preferiti in background.')
      });
    }

    const baseGeneri$ = this.catalogoService.ottieniGeneri().pipe(shareReplay(1));
    const baseAttori$ = this.catalogoService.ottieniAttori().pipe(shareReplay(1));
    const baseRegisti$ = this.catalogoService.ottieniRegisti().pipe(shareReplay(1));

    this.filteredGeneri$ = combineLatest([
      baseGeneri$,
      this.searchGenere.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([items, search]) => {
        const term = (search || '').toLowerCase();
        // Filtra per nome e mostra massimo 12 pillole
        return items.filter(i => i.nome.toLowerCase().includes(term)).slice(0, 12);
      })
    );

    this.filteredRegisti$ = combineLatest([
      baseRegisti$,
      this.searchRegista.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([items, search]) => {
        const term = (search || '').toLowerCase();
        return items.filter(i => (i.nome + ' ' + i.cognome).toLowerCase().includes(term)).slice(0, 12);
      })
    );

    this.filteredAttori$ = combineLatest([
      baseAttori$,
      this.searchAttore.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([items, search]) => {
        const term = (search || '').toLowerCase();
        return items.filter(i => (i.nome + ' ' + i.cognome).toLowerCase().includes(term)).slice(0, 12);
      })
    );

    // 2. Logica di ricerca reattiva del catalogo
    this.film$ = this.filterForm.valueChanges.pipe(
      startWith(this.filterForm.value),
      debounceTime(400),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      switchMap(filtri => {
        this.errorMessage = '';
        // Rimuoviamo le stringhe vuote o null per non inviare query param inutili
        const filtriPuliti = Object.fromEntries(
          Object.entries(filtri).filter(([_, v]) => v !== null && v !== '')
        );

        return this.filmService.esploraCatalogo(filtriPuliti).pipe(
          catchError(() => {
            this.errorMessage = 'Impossibile caricare il catalogo in questo momento.';
            return of([]);
          })
        );
      })
    );
  }

  toggleFiltri() {
    this.mostraFiltriAvanzati = !this.mostraFiltriAvanzati;
  }

  resetFiltri() {
    this.filterForm.reset({
      titolo: this.filterForm.get('titolo')?.value || '' // Mantiene il titolo, resetta il resto
    });
  }

  // Funzione per il carrello
  aggiungiAlCarrello(film: FilmResponse, event: Event): void {
    // Previene comportamenti anomali bloccando la propagazione del click sulla card
    event.preventDefault();
    event.stopPropagation();

    if (!this.isLoggedIn) {
      // Naviga subito, ma invia un segnale alla pagina di login
      this.router.navigate(['/auth/login'], { queryParams: { avviso: 'carrello' } });
      return;
    }

    this.cartService.aggiungiAlCarrello(film);

    // Feedback visivo
    this.aggiuntiDiRecente.add(film.idFilm);
    this.cdr.detectChanges(); // FORZA IL RICALCOLO DEL DOM PER MOSTRARE LA SPUNTA

    setTimeout(() => {
      this.aggiuntiDiRecente.delete(film.idFilm);
      this.cdr.detectChanges(); // FORZA IL RICALCOLO PER RIPRISTINARE IL PULSANTE
    }, 2000);
  }

  // Nuova funzione per gestire il click sul cuoricino
  togglePreferito(film: FilmResponse): void {
    if (!this.isLoggedIn) {
      alert("Devi effettuare l'accesso per aggiungere film ai preferiti!");
      return;
    }

    // Se il film è già nel Set dei preferiti, chiamiamo l'endpoint di rimozione
    if (this.preferitiIds.has(film.idFilm)) {
      this.clienteService.rimuoviPreferito(film.idFilm).subscribe({
        next: () => this.preferitiIds.delete(film.idFilm),
        error: () => alert("Errore durante la rimozione dai preferiti.")
      });
    }
    // Altrimenti, chiamiamo l'endpoint di aggiunta
    else {
      this.clienteService.aggiungiPreferito(film.idFilm).subscribe({
        next: () => this.preferitiIds.add(film.idFilm),
        error: () => alert("Errore durante l'aggiunta ai preferiti.")
      });
    }
  }
  setFiltroPill(controlName: string, value: string) {
    const currentVal = this.filterForm.get(controlName)?.value;
    // Se clicco la stessa pillola, la deseleziono (svuoto il filtro), altrimenti la imposto
    this.filterForm.get(controlName)?.setValue(currentVal === value ? '' : value);
  }
}
