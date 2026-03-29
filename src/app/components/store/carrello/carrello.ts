import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { CartService } from '../../../services/cart';
import { CartItem } from '../../../models/cart.model';

@Component({
  selector: 'app-carrello',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './carrello.html',
  styleUrls: ['./carrello.css']
})
export class CarrelloComponent implements OnInit {
  cartItems$!: Observable<CartItem[]>;

  constructor(
    public cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Ci agganciamo al flusso reattivo del carrello
    this.cartItems$ = this.cartService.cartItems$;
  }

  cambiaQuantita(idFilm: number, quantitaAttuale: number, incremento: number, maxStock: number): void {
    const nuovaQuantita = quantitaAttuale + incremento;

    // Controlli di sicurezza lato UI (già presenti anche nel service)
    if (nuovaQuantita > 0 && nuovaQuantita <= maxStock) {
      this.cartService.aggiornaQuantita(idFilm, nuovaQuantita);
    }
  }

  rimuoviArticolo(idFilm: number): void {
    this.cartService.rimuoviDalCarrello(idFilm);
  }

  svuotaTutto(): void {
    if(confirm('Sei sicuro di voler svuotare il carrello?')) {
      this.cartService.svuotaCarrello();
    }
  }

  procediAlCheckout(): void {
    // Navighiamo verso la rotta di checkout che proteggeremo con l'AuthGuard
    this.router.navigate(['/checkout']);
  }
}
