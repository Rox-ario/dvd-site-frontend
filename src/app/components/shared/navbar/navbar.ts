import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, map } from 'rxjs';
import { OAuthService } from 'angular-oauth2-oidc';
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
    private cartService: CartService,
    private oauthService: OAuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cartItemCount$ = this.cartService.cartItems$.pipe(
      map(items => items.reduce((acc, item) => acc + item.quantita, 0))
    );

    // L'OAuthService lavora fuori dalla zone di Angular.
    // Ci iscriviamo ai suoi eventi per forzare il ricalcolo della vista
    // non appena lo stato di autenticazione cambia (es. dopo il redirect da Keycloak).
    this.oauthService.events.subscribe(() => {
      this.cdr.detectChanges();
    });
  }

  // Getter reattivi basati sul nuovo AuthService
  get isLoggedIn(): boolean { return this.authService.isLoggedIn(); }
  get isAdmin(): boolean { return this.authService.isAdmin(); }
  get isCliente(): boolean { return this.isLoggedIn && !this.isAdmin; }

  login(): void {
    this.authService.login();
  }

  register(): void {
    this.authService.register();
  }

  logout(): void {
    this.authService.logout();
  }
}
