import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, map } from 'rxjs';
import { AuthService } from '../../../services/auth';
import { CartService } from '../../../services/cart';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit {
  cartItemCount$!: Observable<number>;

  constructor(
    public authService: AuthService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.cartItemCount$ = this.cartService.cartItems$.pipe(
      map(items => items.reduce((acc, item) => acc + item.quantita, 0))
    );
  }

  // Getter reattivi basati sul nuovo AuthService
  get isLoggedIn(): boolean { return this.authService.isLoggedIn(); }
  get isAdmin(): boolean { return this.authService.isAdmin(); }
  get isCliente(): boolean { return this.isLoggedIn && !this.isAdmin; }

  login(): void {
    this.authService.login(); // Innesca Keycloak
  }

  logout(): void {
    this.authService.logout();
  }
}
