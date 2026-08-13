import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="wrap">
      <form class="card" (ngSubmit)="submit()">
        <h1>Queueing System</h1>
        <p class="subtitle">DepEd Leyte Division — Records Unit</p>

        <label>Username</label>
        <input type="text" name="username" [(ngModel)]="username" required autocomplete="username" />

        <label>Password</label>
        <input type="password" name="password" [(ngModel)]="password" required autocomplete="current-password" />

        <p class="error" *ngIf="error">{{ error }}</p>

        <button type="submit" [disabled]="loading">{{ loading ? 'Signing in…' : 'Sign In' }}</button>

        <a routerLink="/display" class="display-link">View Public Display →</a>
      </form>
    </div>
  `,
  styles: [
    `
      .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--primary); }
      .card { background: #fff; border-radius: 12px; padding: 32px; width: 100%; max-width: 360px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
      h1 { margin: 0 0 4px; font-size: 22px; color: var(--primary); }
      .subtitle { margin: 0 0 24px; color: #666; font-size: 14px; }
      label { display: block; font-size: 13px; font-weight: 600; margin: 12px 0 4px; color: #333; }
      input { width: 100%; padding: 10px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 15px; }
      button { width: 100%; margin-top: 20px; padding: 12px; background: var(--primary); color: #fff; border: none; border-radius: 6px; font-weight: 600; font-size: 15px; }
      button:disabled { opacity: 0.6; }
      .error { color: #b3261e; font-size: 13px; margin: 12px 0 0; }
      .display-link { display: block; text-align: center; margin-top: 14px; font-size: 13px; color: var(--primary); text-decoration: none; }
      .display-link:hover { text-decoration: underline; }
    `,
  ],
})
export class LoginComponent {
  username = '';
  password = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    if (!this.username || !this.password) return;
    this.loading = true;
    this.error = '';

    this.auth.login(this.username, this.password).subscribe({
      next: (res) => {
        this.loading = false;
        const role = res.user.role;
        if (role === 'admin') this.router.navigate(['/admin/users']);
        else if (role === 'frontdesk') this.router.navigate(['/frontdesk']);
        else if (role === 'window') this.router.navigate(['/window']);
        else this.router.navigate(['/display']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Login failed. Please try again.';
      },
    });
  }
}
