import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { NotepadService } from '../service/notepad.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AuthService } from '../service/auth.service';

@Component({
  selector: 'app-action-buttons',
  imports: [
    CommonModule,
    MatIconModule
  ],
  templateUrl: './action-buttons.html',
  styleUrl: './action-buttons.css',
})
export class ActionButtons implements OnInit {
  user: any = null;
  isOnline = true;
  isShining = false;

  @Input() isDarkMode = false;
  @Output() openAuthDialogOut = new EventEmitter<void>();

  constructor(
    private authService: AuthService,
    private notepadService: NotepadService,
  ) {}

  ngOnInit(): void {
      this.authService.user$.subscribe(u => this.user = u);
      this.notepadService.online$.subscribe(status => this.isOnline = status);

      document.addEventListener('notesSynced', () => this.triggerCloudShine());
  }

  triggerCloudShine() {
    this.isShining = true;
    setTimeout(() => this.isShining = false, 1000); // remove after animation
  }

  openAuthDialogEvent() {
    this.openAuthDialogOut.emit();
  }

  toggleDarkMode(): void {
    const newValue = !this.notepadService.isDarkMode;   // use getter
    this.notepadService.setDarkMode(newValue);          // use setter
  }
}
