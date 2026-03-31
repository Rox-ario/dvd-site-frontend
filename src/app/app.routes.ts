import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [

  // 1. ROTTE PUBBLICHE (Autenticazione)
  // Non serve essere loggati.
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        // Lazy loading: il file login.ts viene scaricato solo se l'utente va qui
        loadComponent: () => import('./components/auth/login/login').then(m => m.LoginComponent)
      },
      {
        path: 'registrazione',
        loadComponent: () => import('./components/auth/registrazione/registrazione').then(m => m.RegistrazioneComponent)
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // 2. ROTTE PUBBLICHE (Catalogo Clienti)
  // Accessibili a tutti (o con un layout specifico per lo store)
  {
    path: '',
    // Qui in futuro potremmo mettere un componente LayoutStore (con la navbar pubblica)
    // loadComponent: () => import('./components/layout/store-layout.component').then(...)
    children: [
      {
        path: 'catalogo',
        loadComponent: () => import('./components/store/catalogo/catalogo').then(m => m.CatalogoComponent)
      },
      // ... altre rotte pubbliche come dettaglio film
      { path: '', redirectTo: 'catalogo', pathMatch: 'full' }
    ]
  },

  // 3. AREA PRIVATA CLIENTE (Profilo, Storico Ordini, Preferiti)
  // Protetta dalla authGuard: se non sei loggato, vieni sbattuto fuori
  {
    path: 'profilo',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/user-profile/dashboard/dashboard-cliente').then(m => m.DashboardClienteComponent)
      },
      {
        path: 'ordini',
        loadComponent: () => import('./components/user-profile/storico-ordini/storico-ordini').then(m => m.StoricoOrdiniComponent)
      }
    ]
  },

  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () => import('./components/store/checkout/checkout').then(m => m.CheckoutComponent)
  },

  // 4. AREA ADMIN (Dashboard Gestionale)
  // Altamente protetta: devi essere loggato E avere il ruolo ADMIN
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./components/admin/dashboard/dashboard-admin').then(m => m.DashboardAdminComponent)
      },
      {
        path: 'gestione-film',
        loadComponent: () => import('./components/admin/gestione-film/gestione-film').then(m => m.GestioneFilmComponent)
      }
      // ... gestione attori, registi, ordini, ecc.
    ]
  },

  // 5. ROTTA DI FALLBACK (Pagina 404)
  {
    path: '**',
    redirectTo: 'catalogo' // o a una pagina 404 dedicata
  }
];
