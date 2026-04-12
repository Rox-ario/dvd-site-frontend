import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastNotification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toastSubject = new Subject<ToastNotification>();
  private confirmSubject = new Subject<{ data: ConfirmDialogData; resolve: (result: boolean) => void }>();

  private idCounter = 0;

  toast$ = this.toastSubject.asObservable();
  confirm$ = this.confirmSubject.asObservable();

  success(message: string, duration = 4000): void {
    this.toastSubject.next({
      id: ++this.idCounter,
      message,
      type: 'success',
      duration
    });
  }

  error(message: string, duration = 5000): void {
    this.toastSubject.next({
      id: ++this.idCounter,
      message,
      type: 'error',
      duration
    });
  }

  warning(message: string, duration = 4500): void {
    this.toastSubject.next({
      id: ++this.idCounter,
      message,
      type: 'warning',
      duration
    });
  }

  info(message: string, duration = 4000): void {
    this.toastSubject.next({
      id: ++this.idCounter,
      message,
      type: 'info',
      duration
    });
  }

  confirm(data: ConfirmDialogData): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.confirmSubject.next({ data, resolve });
    });
  }
}
