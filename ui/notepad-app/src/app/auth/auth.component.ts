// auth.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AuthService } from '../service/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotepadComponent } from '../notepad/notepad.component';
import { NotepadService } from '../service/notepad.service';

@Component({
  selector: 'app-auth',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent {
  email = '';
  password = '';
  user: any = null;
  isOpen = false;

  @Input() isDarkMode = false;
  @Output() logoutEvent = new EventEmitter<void>();

  isOnline = true;

  constructor(private authService: AuthService, private notepadService: NotepadService) {
    this.authService.user$.subscribe(u => this.user = u);
    this.notepadService.online$.subscribe(status => this.isOnline = status);
  }

  async login() {
    try {
      await this.authService.login(this.email, this.password);
      this.close();
    } catch (err) {
      alert(err);
    }
  }

  async register() {
    try {
      await this.authService.register(this.email, this.password);
      this.close();
    } catch (err) {
      alert(err);
    }
  }

  async logout() {
    await this.authService.logout();
    this.logoutEvent.emit();
  }

  open() {
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }

  closeAuthDialog() {
    this.close();
  }
}
