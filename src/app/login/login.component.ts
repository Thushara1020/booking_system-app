import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';
  message = '';
  isSuccess = false;

  private readonly validCredentials = {
    username: '200110603336',
    password: 'Itmd@#4321'
  };

  constructor(private readonly router: Router) {}

  login(): void {
    const isValid =
      this.username === this.validCredentials.username &&
      this.password === this.validCredentials.password;

    this.isSuccess = isValid;
    this.message = isValid ? 'Login successful!' : 'Invalid username or password.';

    if (isValid) {
      void this.router.navigate(['/dashboard']);
    }
  }
}
