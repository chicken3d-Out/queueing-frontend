import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SocketService } from '../../core/services/socket.service';

interface QueueType {
  id: number;
  code: string;
  name: string;
  start_number: number;
  end_number: number;
}
interface Ticket {
  id: number;
  number: string;
  status: string;
  queue_code: string;
  queue_name: string;
  created_at: string;
}

@Component({
  selector: 'app-front-desk',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <h1>Front Desk — Register Ticket</h1>

      <form class="register-form" (ngSubmit)="register()">
        <label>Transaction</label>
        <select name="queue_code" [(ngModel)]="selectedQueueCode" required>
          <option value="" disabled selected>Select transaction…</option>
          <option *ngFor="let q of queueTypes" [value]="q.code">{{ q.name }} ({{ pad(q.start_number) }}–{{ pad(q.end_number) }})</option>
        </select>

        <label>Ticket Number</label>
        <input type="number" name="ticket_number" [(ngModel)]="ticketNumber" required placeholder="e.g. 12" />

        <p class="error" *ngIf="error">{{ error }}</p>
        <p class="success" *ngIf="successMsg">{{ successMsg }}</p>

        <button type="submit" [disabled]="submitting">{{ submitting ? 'Registering…' : 'Register Ticket' }}</button>
      </form>

      <h2>Active Tickets Today</h2>
      <table>
        <thead><tr><th>Number</th><th>Transaction</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr *ngFor="let t of tickets">
            <td class="mono">{{ t.number }}</td>
            <td>{{ t.queue_name }}</td>
            <td><span class="badge" [class]="'badge--' + t.status.toLowerCase()">{{ t.status }}</span></td>
            <td><button class="cancel" *ngIf="isRemovable(t.status)" (click)="cancel(t.id)">Remove from Queue</button></td>
          </tr>
          <tr *ngIf="!tickets.length"><td colspan="4" class="empty">No active tickets.</td></tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [
    `
      .page { max-width: 720px; margin: 0 auto; padding: 32px 20px; font-family: system-ui, sans-serif; }
      h1 { color: var(--primary); }
      .register-form { background: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 32px; }
      label { display: block; font-size: 13px; font-weight: 600; margin: 12px 0 4px; }
      select, input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 15px; }
      button { margin-top: 16px; padding: 10px 20px; background: var(--primary); color: #fff; border: none; border-radius: 6px; font-weight: 600; }
      button:disabled { opacity: 0.6; }
      .error { color: #b3261e; font-size: 13px; }
      .success { color: #1a7a3a; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
      th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
      .mono { font-family: monospace; font-weight: 700; }
      .badge { padding: 3px 8px; border-radius: 4px; font-size: 12px; background: #eee; }
      .badge--waiting { background: #fff3cd; }
      .badge--called, .badge--serving { background: #cfe8ff; }
      .cancel { background: #b3261e; padding: 5px 10px; font-size: 12px; }
      .empty { text-align: center; color: #999; }
    `,
  ],
})
export class FrontDeskComponent implements OnInit {
  queueTypes: QueueType[] = [];
  tickets: Ticket[] = [];
  selectedQueueCode = '';
  ticketNumber: number | null = null;
  submitting = false;
  error = '';
  successMsg = '';

  constructor(private http: HttpClient, private socket: SocketService) {}

  ngOnInit(): void {
    this.loadQueueTypes();
    this.loadTickets();
    // Real-time refresh — no polling interval. Re-fetch only happens when
    // something actually changed (another window/frontdesk action) or the
    // socket reconnects after a drop.
    this.socket.queueUpdate$.subscribe(() => this.loadTickets());
    this.socket.connected$.subscribe(() => this.loadTickets());
  }

  loadQueueTypes(): void {
    this.http.get<{ success: boolean; queue_types: QueueType[] }>(`${environment.apiUrl}/admin/queues`).subscribe({
      next: (res) => (this.queueTypes = res.queue_types || []),
      error: (err) => {
        this.error = err.error?.error || 'Could not load the list of transactions. Try refreshing the page.';
      },
    });
  }

  loadTickets(): void {
    this.http.get<{ success: boolean; tickets: Ticket[] }>(`${environment.apiUrl}/frontdesk`).subscribe({
      next: (res) => (this.tickets = res.tickets || []),
      error: () => {},
    });
  }

  register(): void {
    if (!this.selectedQueueCode || !this.ticketNumber) return;
    this.submitting = true;
    this.error = '';
    this.successMsg = '';

    this.http.post<{ success: boolean; ticket: Ticket }>(`${environment.apiUrl}/frontdesk/add-ticket`, {
      queue_code: this.selectedQueueCode,
      ticket_number: this.ticketNumber,
    }).subscribe({
      next: (res) => {
        this.submitting = false;
        this.successMsg = `Registered ticket ${res.ticket.number}.`;
        this.ticketNumber = null;
        this.loadTickets();
      },
      error: (err) => {
        this.submitting = false;
        this.error = err.error?.error || 'Failed to register ticket.';
      },
    });
  }

  cancel(ticketId: number): void {
    this.http.post(`${environment.apiUrl}/frontdesk/cancel-ticket`, { ticket_id: ticketId }).subscribe({
      next: () => this.loadTickets(),
    });
  }

  pad(n: number): string {
    return String(n).padStart(3, '0');
  }

  isRemovable(status: string): boolean {
    return status === 'WAITING' || status === 'CALLED' || status === 'SERVING';
  }
}
