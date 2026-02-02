import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ThemeService } from '../../core/services/theme.service';
import { LoginComponent } from './pages/login/login.component';

@Component({
  selector: 'app-authentication',
  templateUrl: './authentication.component.html',
  styleUrls: ['./authentication.component.scss'],
  imports: [ButtonModule, LoginComponent],
  standalone: true,
})
export class AuthenticationComponent {
  constructor() {}
}
