import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Observable, map } from 'rxjs';
import { AuthService } from '../../../services/auth';
import { CartService } from '../../../services/cart';
import { Ruolo } from '../../../models/auth.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit {
  // Flussi reattivi per guidare l'interfaccia
  isLoggedIn$!: Observable<boolean>;
  isAdmin$!: Observable<boolean>;
  cartItemCount$!: Observable<number>;

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // 1. L'utente è loggato se esiste un currentUser
    this.isLoggedIn$ = this.authService.currentUser$.pipe(
      map(user => !!user)
    );

    // 2. È admin se il ruolo corrisponde
    this.isAdmin$ = this.authService.currentUser$.pipe(
      map(user => user?.ruolo === Ruolo.ADMIN)
    );

    // 3. Il totale nel carrello è la somma delle quantità fisiche, non solo delle righe
    this.cartItemCount$ = this.cartService.cartItems$.pipe(
      map(items => items.reduce((acc, item) => acc + item.quantita, 0))
    );
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
