import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CartService } from '../../../services/cart';
import { OrdineService } from '../../../services/ordine.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.css']
})
export class CheckoutComponent implements OnInit {
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    public cartService: CartService,
    private ordineService: OrdineService,
    private router: Router
  ) {}

  ngOnInit() {
    // Controllo logico: non ha senso stare qui se il carrello è vuoto
    this.cartService.cartItems$.subscribe(items => {
      if (items.length === 0 && !this.successMessage) {
        this.router.navigate(['/catalogo']);
      }
    });
  }

  confermaOrdine() {
    this.isLoading = true;
    this.errorMessage = '';

    const payload = this.cartService.generaPayloadOrdine();

    this.ordineService.inviaOrdine(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Acquisto completato! Preparati per lo spettacolo 🍿';
        this.cartService.svuotaCarrello();

        // Diamo il tempo all'utente di leggere il successo prima di reindirizzarlo
        setTimeout(() => {
          this.router.navigate(['/profilo/ordini']);
        }, 2500);
      },
      error: (err) => {
        this.isLoading = false;
        // Intercettiamo l'errore esatto dal backend (es. "Copie insufficienti")
        this.errorMessage = err.error?.message || err.error || 'Si è verificato un problema imprevisto durante il pagamento.';
      }
    });
  }
}
