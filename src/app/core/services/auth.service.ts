import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CurrentUser {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'frontdesk' | 'window' | 'display';
  window_id: number | null;
}

const STORAGE_KEY = 'queueing_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<CurrentUser | null>(this.readStoredUser());

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<{ success: boolean; token: string; user: CurrentUser }> {
    return this.http.post<{ success: boolean; token: string; user: CurrentUser }>(`${environment.apiUrl}/auth/login`, { username, password }).pipe(
      tap((res) => {
        if (res.success) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: res.token, user: res.user }));
          this.user.set(res.user);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.user.set(null);
  }

  get token(): string | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw).token as string) : null;
  }

  private readStoredUser(): CurrentUser | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw).user as CurrentUser;
    } catch {
      return null;
    }
  }
}
