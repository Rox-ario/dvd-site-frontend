import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CartService } from '../../../services/cart';
import { NotificationService } from '../../../services/notification.service';
import { OrdineService } from '../../../services/ordine.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.css']
})
export class CheckoutComponent implements OnInit {
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  conflictError = false;  // true quando il backend risponde 409 (Optimistic Lock)
  checkoutForm: FormGroup;

  constructor(
    public cartService: CartService,
    private ordineService: OrdineService,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService
  ) {
    this.checkoutForm = this.fb.group({
      // Sezione Spedizione (I dati che viaggeranno verso il backend)
      indirizzo: ['', [Validators.required, Validators.minLength(5)]],
      citta: ['', Validators.required],
      cap: ['', [Validators.required, Validators.pattern('^[0-9]{5}$')]],

      // Sezione Pagamento (Mock: validati qui, ma mai inviati)
      titolare: ['', Validators.required],
      numeroCarta: ['', [Validators.required, Validators.pattern('^[0-9]{16}$')]],
      scadenza: ['', [Validators.required, Validators.pattern('^(0[1-9]|1[0-2])\\/([0-9]{2})$')]],
      cvv: ['', [Validators.required, Validators.pattern('^[0-9]{3,4}$')]]
    });
  }

  ngOnInit() {
    // Controllo logico: non ha senso stare qui se il carrello è vuoto
    // (ma non se stiamo già gestendo un errore di conflitto o un successo)
    this.cartService.cartItems$.subscribe(items => {
      if (items.length === 0 && !this.successMessage && !this.conflictError) {
        this.router.navigate(['/catalogo']);
      }
    });
  }
  formattaNumeroCarta(event: Event) {
    const inputElement = event.target as HTMLInputElement;

    let soloNumeri = inputElement.value.replace(/\D/g, '');

    let formattato = soloNumeri.match(/.{1,4}/g)?.join(' ') || '';

    this.checkoutForm.get('numeroCarta')?.setValue(formattato, { emitEvent: false });

    inputElement.value = formattato;
  }

  formattaScadenza(event: Event) {
    const inputElement = event.target as HTMLInputElement;

    const isBackspace = (event as InputEvent).inputType === 'deleteContentBackward';

    let numeri = inputElement.value.replace(/\D/g, '');
    let formattato = numeri;

    if (numeri.length > 0) {
      if (numeri.length === 1 && parseInt(numeri[0]) > 1) {
        formattato = `0${numeri}/`;
      }
      else if (numeri.length >= 2) {
        let mese = parseInt(numeri.substring(0, 2));

        if (mese > 12) mese = 12;
        if (mese === 0) mese = 1;

        let meseStr = mese.toString().padStart(2, '0');
        let annoStr = numeri.substring(2, 4);

        if (annoStr.length > 0) {
          formattato = `${meseStr}/${annoStr}`;
        } else {
          formattato = isBackspace ? meseStr : `${meseStr}/`;
        }
      }
    }

    this.checkoutForm.get('scadenza')?.setValue(formattato, { emitEvent: false });

    inputElement.value = formattato;
  }

  confermaOrdine() {
    this.isLoading = true;
    this.errorMessage = '';

    const formVals = this.checkoutForm.value;
    const indirizzoCompleto = `${formVals.indirizzo}, ${formVals.cap} ${formVals.citta}`;

    const payload = this.cartService.generaPayloadOrdine(indirizzoCompleto);

    this.ordineService.inviaOrdine(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Pagamento autorizzato! Riceverai i tuoi film all\'indirizzo indicato 🍿';
        this.cartService.svuotaCarrello();
        this.cdr.detectChanges();

        setTimeout(() => {
          this.router.navigate(['/profilo/ordini']);
        }, 3000);
      },
      error: (err) => {
        this.isLoading = false;

        // Estraiamo il messaggio pulito (Spring boot inserisce il messaggio in err.error.message o nella root)
        const messaggioErrore = err.error?.message || err.error || 'Transazione fallita.';
        this.errorMessage = messaggioErrore;

        // 2. Intercettiamo il Conflitto (409) dell'Optimistic Lock
        if (err.status === 409) {
          // Blocchiamo subito il form: il prodotto non è più disponibile
          this.conflictError = true;

          // Svuotiamo il carrello: l'ordine era atomico, tutti i prodotti
          // vanno rimossi così l'utente riparte da zero nel catalogo
          this.cartService.svuotaCarrello();

          // Toast con durata aumentata (8 secondi) per dare tempo di leggere
          this.notificationService.error("🍿 Oh no! " + messaggioErrore, 8000);

          // Riportiamo l'utente al catalogo dopo 4 secondi
          setTimeout(() => {
            this.router.navigate(['/catalogo']);
          }, 4000);
        } else {
          // Per tutti gli altri errori
          this.notificationService.error(messaggioErrore);
        }

        this.cdr.detectChanges();
      }
    });
  }
}
