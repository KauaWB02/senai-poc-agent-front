import { Routes } from '@angular/router';
import { LayoutComponent } from './core/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'chat',
        loadComponent: () =>
          import('./features/chat/chat.component').then(m => m.ChatComponent),
      },
      // {
      //   path: 'produtos',
      //   loadComponent: () =>
      //     import('./features/produtos/produtos.component').then(m => m.ProdutosComponent),
      // },
      { path: '', redirectTo: 'chat', pathMatch: 'full' }
    ]
  },

  // Rotas sem layout
  // {
  //   path: 'login',
  //   loadComponent: () =>
  //     import('./features/authentication/authentication.component').then(m => m.AuthenticationComponent)
  // },
];