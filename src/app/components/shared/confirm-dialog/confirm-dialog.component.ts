import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService, ConfirmDialogData } from '../../../services/notification.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css']
})
export class ConfirmDialogComponent implements OnInit, OnDestroy {
  isOpen = false;
  data: ConfirmDialogData | null = null;
  private resolveRef: ((result: boolean) => void) | null = null;
  private sub!: Subscription;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.sub = this.notificationService.confirm$.subscribe(({ data, resolve }) => {
      this.data = data;
      this.resolveRef = resolve;
      this.isOpen = true;
    });
  }

  onConfirm(): void {
    this.resolveRef?.(true);
    this.close();
  }

  onCancel(): void {
    this.resolveRef?.(false);
    this.close();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('confirm-overlay')) {
      this.onCancel();
    }
  }

  private close(): void {
    this.isOpen = false;
    this.data = null;
    this.resolveRef = null;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
