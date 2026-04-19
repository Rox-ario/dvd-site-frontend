import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { RegistrazioneRequest } from '../../../models/auth.model';

@Component({
  selector: 'app-registrazione',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './registrazione.html',
  styleUrls: ['./registrazione.css']
})
export class RegistrazioneComponent {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2)]],
      cognome: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confermaPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator }); // Applichiamo il validatore all'intero form
  }

  // Validatore Custom: controlla se password e confermaPassword coincidono
  // Definito come arrow function per mantenere il contesto `this` corretto
  passwordMatchValidator = (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const conferma = control.get('confermaPassword')?.value;

    if (password !== conferma) {
      control.get('confermaPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      return null;
    }
  };

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Estraiamo solo i dati che servono al backend (scartando confermaPassword)
    const formValue = this.registerForm.value;
    const requestData: RegistrazioneRequest = {
      nome: formValue.nome,
      cognome: formValue.cognome,
      email: formValue.email,
      password: formValue.password
    };

    this.authService.registra(requestData).subscribe({
      next: (responseStr: any) => {
        this.isLoading = false;
        // Il backend restituisce una stringa. La mostriamo.
        this.successMessage = responseStr || 'Registrazione completata con successo!';

        // Aspettiamo 2.5 secondi per far leggere il messaggio, poi via al login
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2500);
      },
      error: (err: any) => {
        this.isLoading = false;
        // Il tuo backend lancia un'eccezione se l'email esiste già
        if (err.status === 400 || err.status === 500) {
          // Cerchiamo di estrarre il messaggio dal backend, altrimenti fallback generico
          this.errorMessage = err.error?.message || err.error || 'Errore durante la registrazione. Forse l\'email è già in uso?';
        } else {
          this.errorMessage = 'Errore di connessione al server.';
        }
      }
    });
  }
}
