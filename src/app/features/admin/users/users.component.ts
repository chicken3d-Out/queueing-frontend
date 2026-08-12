import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  window_id: number | null;
  window_number?: number | null;
  status: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <h1>Manage Users</h1>

      <form class="add-form" (ngSubmit)="addUser()">
        <input placeholder="Username" name="username" [(ngModel)]="newUser.username" required />
        <input placeholder="Full name" name="full_name" [(ngModel)]="newUser.full_name" required />
        <input placeholder="Password" type="password" name="password" [(ngModel)]="newUser.password" required />
        <select name="role" [(ngModel)]="newUser.role" required>
          <option value="" disabled selected>Role…</option>
          <option value="admin">Admin</option>
          <option value="frontdesk">Front Desk</option>
          <option value="window">Window Operator</option>
        </select>
        <button type="submit">Add User</button>
      </form>
      <p class="error" *ngIf="error">{{ error }}</p>

      <table>
        <thead><tr><th>Username</th><th>Full Name</th><th>Role</th><th>Window</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr *ngFor="let u of users">
            <td>{{ u.username }}</td>
            <td>{{ u.full_name }}</td>
            <td>{{ u.role }}</td>
            <td>{{ u.window_number || '—' }}</td>
            <td><span class="badge" [class.inactive]="u.status !== 'active'">{{ u.status }}</span></td>
            <td>
              <button (click)="toggleStatus(u)">{{ u.status === 'active' ? 'Deactivate' : 'Activate' }}</button>
              <button class="danger" (click)="remove(u)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [
    `
      .page { max-width: 900px; margin: 0 auto; padding: 32px 20px; font-family: system-ui, sans-serif; }
      h1 { color: var(--primary); }
      .add-form { display: flex; gap: 8px; flex-wrap: wrap; background: #fff; padding: 16px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
      .add-form input, .add-form select { flex: 1 1 160px; padding: 8px; border: 1px solid #ccc; border-radius: 6px; }
      .add-form button { padding: 8px 16px; background: var(--primary); color: #fff; border: none; border-radius: 6px; font-weight: 600; }
      .error { color: #b3261e; }
      table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
      th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
      .badge { padding: 3px 8px; border-radius: 4px; background: #d4f4dd; font-size: 12px; }
      .badge.inactive { background: #f4d4d4; }
      button { margin-right: 6px; padding: 5px 10px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px; background: #f5f5f5; }
      .danger { background: #b3261e; color: #fff; border: none; }
    `,
  ],
})
export class AdminUsersComponent implements OnInit {
  users: User[] = [];
  newUser = { username: '', full_name: '', password: '', role: '' };
  error = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.http.get<{ success: boolean; users: User[] }>(`${environment.apiUrl}/admin/users`).subscribe({
      next: (res) => (this.users = res.users || []),
    });
  }

  addUser(): void {
    this.error = '';
    this.http.post(`${environment.apiUrl}/admin/users`, this.newUser).subscribe({
      next: () => {
        this.newUser = { username: '', full_name: '', password: '', role: '' };
        this.load();
      },
      error: (err) => (this.error = err.error?.error || 'Failed to add user.'),
    });
  }

  toggleStatus(u: User): void {
    this.http.post(`${environment.apiUrl}/admin/users/${u.id}/toggle-status`, {}).subscribe({ next: () => this.load() });
  }

  remove(u: User): void {
    if (!confirm(`Delete user "${u.username}"?`)) return;
    this.http.delete(`${environment.apiUrl}/admin/users/${u.id}`).subscribe({ next: () => this.load() });
  }
}
