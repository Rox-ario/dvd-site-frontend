import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './components/shared/navbar/navbar';
import { ToastComponent } from './components/shared/toast/toast.component';
import { ConfirmDialogComponent } from './components/shared/confirm-dialog/confirm-dialog.component';
import { OAuthService } from 'angular-oauth2-oidc';
import { ClienteService } from './services/cliente';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, ToastComponent, ConfirmDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('frontend');

  // Segnale per bloccare l'interfaccia durante la sincronizzazione JIT
  isSyncing = signal(false);

  constructor(
    private oauthService: OAuthService,
    private clienteService: ClienteService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // 1. Ascoltiamo gli eventi di redirect completati da Keycloak
    this.oauthService.events.subscribe(event => {
      if (event.type === 'token_received') {
        this.eseguiSincronizzazioneJIT();
      }
    });

    // 2. Copertura per i refresh di pagina (se l'utente ha già il token valido in sessione)
    this.authService.isDoneLoading$.subscribe(isDone => {
      if (isDone && this.authService.isLoggedIn()) {
        this.eseguiSincronizzazioneJIT();
      }
    });
  }

  private eseguiSincronizzazioneJIT() {
    this.isSyncing.set(true);
    // La GET su /profilo forza il backend Spring Boot a estrarre il token
    // e creare il record a DB se non esiste ancora.
    this.clienteService.ottieniProfilo().subscribe({
      next: () => this.isSyncing.set(false),
      error: (err) => {
        console.error("Errore critico di sincronizzazione JIT", err);
        // Eventuale logica di fallback (es. forzare il logout se il DB è giù)
        this.isSyncing.set(false);
      }
    });
  }
}
