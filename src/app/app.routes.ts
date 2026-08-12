import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent) },
  { path: 'display', loadComponent: () => import('./features/display/display.component').then((m) => m.DisplayComponent) },
  {
    path: 'frontdesk',
    canActivate: [authGuard, roleGuard(['frontdesk', 'admin'])],
    loadComponent: () => import('./features/front-desk/front-desk.component').then((m) => m.FrontDeskComponent),
  },
  {
    path: 'window',
    canActivate: [authGuard, roleGuard(['window'])],
    loadComponent: () => import('./features/window-operator/window-operator.component').then((m) => m.WindowOperatorComponent),
  },
  {
    path: 'admin/users',
    canActivate: [authGuard, roleGuard(['admin'])],
    loadComponent: () => import('./features/admin/users/users.component').then((m) => m.AdminUsersComponent),
  },
  { path: '**', redirectTo: 'login' },
];
