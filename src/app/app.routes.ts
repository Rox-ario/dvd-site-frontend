import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  // 1. ROTTE PUBBLICHE (Catalogo Clienti)
  {
    path: '',
    children: [
      {
        path: 'catalogo',
        loadComponent: () => import('./components/store/catalogo/catalogo').then(m => m.CatalogoComponent)
      },
      {
        path: 'dettaglio/:id',
        loadComponent: () => import('./components/store/dettaglio-film/dettaglio-film').then(m => m.DettaglioFilmComponent)
      },
      { path: '', redirectTo: 'catalogo', pathMatch: 'full' }
    ]
  },

  // 2. AREA PRIVATA CLIENTE (Protetta dalla authGuard, reindirizza a Keycloak se non loggato)
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

  // 3. AREA ADMIN
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: 'dashboard',
        redirectTo: '/profilo',
        pathMatch: 'full'
      },
      {
        path: 'gestione-film',
        loadComponent: () => import('./components/admin/gestione-film/gestione-film').then(m => m.GestioneFilmComponent)
      }
    ]
  },

  {
    path: 'carrello',
    loadComponent: () => import('./components/store/carrello/carrello').then(m => m.CarrelloComponent)
  },

  {
    path: '**',
    redirectTo: 'catalogo'
  }
];
