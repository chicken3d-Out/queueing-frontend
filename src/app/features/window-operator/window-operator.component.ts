import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SocketService } from '../../core/services/socket.service';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

interface WindowState {
  success: boolean;
  window: { id: number; number: number; name: string };
  queue: { code: string; name: string };
  current_ticket: { id: number; number: string; status: string } | null;
  waiting_count: number;
  error?: string;
}

@Component({
  selector: 'app-window-operator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page" *ngIf="!state && loading">
      <p class="loading">Loading your window…</p>
    </div>

    <div class="page" *ngIf="!state && !loading">
      <div class="load-error">
        <h1>Can't load this window</h1>
        <p>{{ loadError || 'Something went wrong.' }}</p>
        <p class="hint">If you're not sure why, ask an administrator to check that your account has a window assigned (Admin → Users).</p>
        <button (click)="load()">Try Again</button>
        <button class="logout" (click)="logout()">Sign out</button>
      </div>
    </div>

    <div class="page" *ngIf="state as s">
      <header>
        <div>
          <h1>{{ s.window?.name }}</h1>
          <p class="subtitle">{{ s.queue?.name }}</p>
        </div>
        <button class="logout" (click)="logout()">Sign out</button>
      </header>

      <div class="current-card">
        <p class="label">Current Ticket</p>
        <p class="number">{{ s.current_ticket?.number || '—' }}</p>
        <p class="status" *ngIf="s.current_ticket">{{ s.current_ticket.status }}</p>
      </div>

      <p class="waiting">{{ s.waiting_count }} waiting in this queue</p>
      <p class="error" *ngIf="error">{{ error }}</p>

      <div class="actions">
        <button class="primary" (click)="callNext()" [disabled]="busy">Call Next</button>
        <button (click)="recall()" [disabled]="busy || !s.current_ticket">Recall</button>
        <button (click)="serving()" [disabled]="busy || !s.current_ticket || s.current_ticket.status !== 'CALLED'">Start Serving</button>
        <button class="success" (click)="complete()" [disabled]="busy || !s.current_ticket">Complete</button>
        <button class="danger" (click)="skip()" [disabled]="busy || !s.current_ticket">Skip</button>
      </div>
    </div>
  `,
  styles: [
    `
      .page { max-width: 480px; margin: 0 auto; padding: 32px 20px; font-family: system-ui, sans-serif; }
      header { display: flex; justify-content: space-between; align-items: flex-start; }
      h1 { color: var(--primary); margin: 0; }
      .subtitle { color: #666; margin: 4px 0 0; }
      .logout { background: none; border: 1px solid #ccc; border-radius: 6px; padding: 6px 12px; font-size: 13px; }
      .current-card { background: var(--primary); color: #fff; border-radius: 12px; padding: 32px; text-align: center; margin: 24px 0; }
      .label { opacity: 0.8; letter-spacing: 0.1em; text-transform: uppercase; font-size: 13px; margin: 0; }
      .number { font-family: monospace; font-size: 64px; font-weight: 800; margin: 8px 0; }
      .status { opacity: 0.9; margin: 0; }
      .waiting { text-align: center; color: #666; }
      .error { color: #b3261e; text-align: center; }
      .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px; }
      button { padding: 14px; border: none; border-radius: 8px; font-weight: 600; font-size: 15px; background: #eee; }
      button:disabled { opacity: 0.5; }
      .primary { grid-column: 1 / -1; background: var(--primary); color: #fff; }
      .success { background: #1a7a3a; color: #fff; }
      .danger { background: #b3261e; color: #fff; }
      .loading { text-align: center; color: #666; margin-top: 60px; }
      .load-error { background: #fff; border-radius: 10px; padding: 24px; margin-top: 40px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
      .load-error h1 { color: #b3261e; font-size: 18px; margin: 0 0 8px; }
      .load-error .hint { color: #888; font-size: 13px; }
      .load-error button { margin-top: 12px; }
    `,
  ],
})
export class WindowOperatorComponent implements OnInit {
  state: WindowState | null = null;
  loading = true;
  loadError = '';
  busy = false;
  error = '';

  constructor(private http: HttpClient, private socket: SocketService, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.load();
    this.socket.queueUpdate$.subscribe(() => this.load());
    this.socket.connected$.subscribe(() => this.load());
  }

  load(): void {
    this.loading = true;
    this.http.get<WindowState>(`${environment.apiUrl}/window`).subscribe({
      next: (s) => {
        this.loading = false;
        this.state = s;
      },
      error: (err) => {
        this.loading = false;
        this.state = null;
        this.loadError = err.error?.error || 'Could not reach the server.';
      },
    });
  }

  private run(path: string, body: any = {}): void {
    this.busy = true;
    this.error = '';
    this.http.post<WindowState>(`${environment.apiUrl}/window/${path}`, body).subscribe({
      next: (s) => {
        this.busy = false;
        this.state = s;
      },
      error: (err) => {
        this.busy = false;
        this.error = err.error?.error || 'Action failed.';
      },
    });
  }

  callNext(): void { this.run('call-next'); }
  recall(): void { this.run('recall'); }
  serving(): void { this.run('serving'); }
  complete(): void { this.run('complete'); }
  skip(): void { this.run('skip'); }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
