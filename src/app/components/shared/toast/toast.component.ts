import {Component, OnInit, OnDestroy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService, ToastNotification } from '../../../services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css']
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: ToastNotification[] = [];
  private sub!: Subscription;

  constructor(
    private notificationService: NotificationService,
  private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.sub = this.notificationService.toast$.subscribe(toast => {

      // 2. Creiamo un NUOVO array per forzare il riconoscimento del cambiamento di stato
      this.toasts = [...this.toasts, toast];

      // 3. Forziamo esplicitamente l'aggiornamento del DOM del Toast
      this.cdr.detectChanges();

      // Auto-dismiss
      setTimeout(() => {
        this.removeToast(toast.id);
      }, toast.duration || 4000);
    });
  }

  removeToast(id: number): void {
    // filter() crea già un nuovo array, ma forziamo comunque il ricalcolo
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.cdr.detectChanges(); // <-- 4. Ricalcolo anche alla rimozione
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '';
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
