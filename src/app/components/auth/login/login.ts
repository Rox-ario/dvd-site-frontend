import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import { AuthService } from '../../../services/auth';
import { Ruolo } from '../../../models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Definizione rigorosa del form
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }
  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['avviso'] === 'carrello') {
        this.errorMessage = "Per favore, accedi o registrati per aggiungere articoli al carrello.";
      } else if (params['avviso'] === 'scaduta') {
        this.errorMessage = "La tua sessione è scaduta per inattività. Accedi di nuovo per continuare.";
      }
    });
  }

  onSubmit() {
    // 1. Controllo validità: se il form è invalido, non disturbo nemmeno il backend
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched(); // Forza la visualizzazione degli errori in UI
      return;
    }

    // 2. Transizione di stato: inizio caricamento e pulizia vecchi errori
    this.isLoading = true;
    this.errorMessage = '';

    // 3. Chiamata al servizio
    this.authService.login(this.loginForm.value).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        // 4. Dirottamento logico basato sul ruolo
        if (response.ruolo === Ruolo.ADMIN) {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/']); // Home o Catalogo per il cliente
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        // Gestione mirata dell'errore
        if (err.status === 401 || err.status === 403) {
          this.errorMessage = 'Credenziali non valide. Controlla email e password.';
        } else {
          this.errorMessage = 'Errore di comunicazione con il server. Riprova più tardi.';
        }
      }
    });
  }
}
