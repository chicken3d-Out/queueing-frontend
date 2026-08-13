import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  window_id: number | null;
  window_number?: number | null;
  status: string;
}

interface WindowRow {
  id: number;
  window_number: number;
  window_name: string;
}

interface EditForm {
  username: string;
  full_name: string;
  role: string;
  window_id: number | null;
  new_password: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Manage Users</h1>
        <button class="logout" (click)="logout()">Sign out</button>
      </header>

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

        <select name="window_id" *ngIf="newUser.role === 'window'" [(ngModel)]="newUser.window_id" required>
          <option [ngValue]="null" disabled selected>Assign window…</option>
          <option *ngFor="let w of windows" [ngValue]="w.id">{{ w.window_name }} (#{{ w.window_number }})</option>
        </select>

        <button type="submit">Add User</button>
      </form>
      <p class="error" *ngIf="error">{{ error }}</p>
      <p class="hint" *ngIf="!windows.length">
        No windows exist yet — a Window Operator account can't be assigned to one until you create windows.
      </p>

      <table>
        <thead><tr><th>Username</th><th>Full Name</th><th>Role</th><th>Window</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <ng-container *ngFor="let u of users">
            <!-- Normal row -->
            <tr *ngIf="editingId !== u.id">
              <td>{{ u.username }}</td>
              <td>{{ u.full_name }}</td>
              <td>{{ u.role }}</td>
              <td>
                {{ u.window_number || '—' }}
                <span class="warn" *ngIf="u.role === 'window' && !u.window_id" title="This account has no window assigned.">⚠ unassigned</span>
              </td>
              <td><span class="badge" [class.inactive]="u.status !== 'active'">{{ u.status }}</span></td>
              <td>
                <button (click)="startEdit(u)">Edit</button>
                <button (click)="toggleStatus(u)">{{ u.status === 'active' ? 'Deactivate' : 'Activate' }}</button>
                <button class="danger" (click)="remove(u)">Delete</button>
              </td>
            </tr>

            <!-- Inline edit row -->
            <tr *ngIf="editingId === u.id" class="edit-row">
              <td colspan="6">
                <div class="edit-form">
                  <label>Username<input [(ngModel)]="editForm.username" name="edit_username" /></label>
                  <label>Full name<input [(ngModel)]="editForm.full_name" name="edit_full_name" /></label>
                  <label>Role
                    <select [(ngModel)]="editForm.role" name="edit_role">
                      <option value="admin">Admin</option>
                      <option value="frontdesk">Front Desk</option>
                      <option value="window">Window Operator</option>
                    </select>
                  </label>
                  <label *ngIf="editForm.role === 'window'">Window
                    <select [(ngModel)]="editForm.window_id" name="edit_window_id">
                      <option [ngValue]="null" disabled>Assign window…</option>
                      <option *ngFor="let w of windows" [ngValue]="w.id">{{ w.window_name }} (#{{ w.window_number }})</option>
                    </select>
                  </label>
                  <label>New password <span class="optional">(leave blank to keep current)</span>
                    <input type="password" [(ngModel)]="editForm.new_password" name="edit_password" />
                  </label>
                  <p class="error" *ngIf="editError">{{ editError }}</p>
                  <div class="edit-actions">
                    <button type="button" (click)="saveEdit(u.id)">Save</button>
                    <button type="button" (click)="cancelEdit()">Cancel</button>
                  </div>
                </div>
              </td>
            </tr>
          </ng-container>
        </tbody>
      </table>
    </div>
  `,
  styles: [
    `
      .page { max-width: 900px; margin: 0 auto; padding: 32px 20px; font-family: system-ui, sans-serif; }
      .page-header { display: flex; justify-content: space-between; align-items: center; }
      h1 { color: var(--primary); }
      .logout { background: none; border: 1px solid #ccc; border-radius: 6px; padding: 6px 12px; font-size: 13px; height: fit-content; }
      .add-form { display: flex; gap: 8px; flex-wrap: wrap; background: #fff; padding: 16px; border-radius: 10px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
      .add-form input, .add-form select { flex: 1 1 160px; padding: 8px; border: 1px solid #ccc; border-radius: 6px; }
      .add-form button { padding: 8px 16px; background: var(--primary); color: #fff; border: none; border-radius: 6px; font-weight: 600; }
      .error { color: #b3261e; }
      .hint { color: #8a6d00; background: #fff8e1; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 16px; }
      .warn { color: #b3261e; font-size: 11px; margin-left: 6px; cursor: help; }
      table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
      th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
      .badge { padding: 3px 8px; border-radius: 4px; background: #d4f4dd; font-size: 12px; }
      .badge.inactive { background: #f4d4d4; }
      button { margin-right: 6px; padding: 5px 10px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px; background: #f5f5f5; }
      .danger { background: #b3261e; color: #fff; border: none; }
      .edit-row td { background: #f9fbfa; }
      .edit-form { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; padding: 8px 0; }
      .edit-form label { display: flex; flex-direction: column; font-size: 12px; font-weight: 600; gap: 4px; }
      .edit-form input, .edit-form select { padding: 6px 8px; border: 1px solid #ccc; border-radius: 6px; font-size: 13px; font-weight: normal; }
      .optional { font-weight: normal; color: #888; }
      .edit-actions { display: flex; gap: 6px; }
      .edit-actions button { background: var(--primary); color: #fff; border: none; }
      .edit-actions button:last-child { background: #ccc; color: #333; }
    `,
  ],
})
export class AdminUsersComponent implements OnInit {
  users: User[] = [];
  windows: WindowRow[] = [];
  newUser: { username: string; full_name: string; password: string; role: string; window_id: number | null } = {
    username: '',
    full_name: '',
    password: '',
    role: '',
    window_id: null,
  };
  error = '';

  editingId: number | null = null;
  editForm: EditForm = { username: '', full_name: '', role: '', window_id: null, new_password: '' };
  editError = '';

  constructor(private http: HttpClient, private auth: AuthService, private router: Router) {}

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    this.load();
    this.loadWindows();
  }

  load(): void {
    this.http.get<{ success: boolean; users: User[] }>(`${environment.apiUrl}/admin/users`).subscribe({
      next: (res) => (this.users = res.users || []),
    });
  }

  loadWindows(): void {
    this.http.get<{ success: boolean; windows: WindowRow[] }>(`${environment.apiUrl}/admin/windows`).subscribe({
      next: (res) => (this.windows = res.windows || []),
    });
  }

  addUser(): void {
    this.error = '';
    if (this.newUser.role === 'window' && !this.newUser.window_id) {
      this.error = 'Please assign a window for this Window Operator account.';
      return;
    }
    this.http.post(`${environment.apiUrl}/admin/users`, this.newUser).subscribe({
      next: () => {
        this.newUser = { username: '', full_name: '', password: '', role: '', window_id: null };
        this.load();
      },
      error: (err) => (this.error = err.error?.error || 'Failed to add user.'),
    });
  }

  startEdit(u: User): void {
    this.editingId = u.id;
    this.editError = '';
    this.editForm = {
      username: u.username,
      full_name: u.full_name,
      role: u.role,
      window_id: u.window_id,
      new_password: '',
    };
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editError = '';
  }

  saveEdit(id: number): void {
    this.editError = '';
    if (this.editForm.role === 'window' && !this.editForm.window_id) {
      this.editError = 'Please assign a window for this Window Operator account.';
      return;
    }
    this.http.put(`${environment.apiUrl}/admin/users/${id}`, this.editForm).subscribe({
      next: () => {
        this.editingId = null;
        this.load();
      },
      error: (err) => (this.editError = err.error?.error || 'Failed to save changes.'),
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
