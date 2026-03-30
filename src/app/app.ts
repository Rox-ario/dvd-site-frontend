import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './components/shared/navbar/navbar';

@Component({
  selector: 'app-root',
  imports: [RouterModule, NavbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
}
