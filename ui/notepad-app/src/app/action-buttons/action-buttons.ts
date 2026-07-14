import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { NotepadService } from '../service/notepad.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AuthService } from '../service/auth.service';
import { Subscription, take } from 'rxjs';
import { NotepadHistoryService } from '../service/notepad-history.service';

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
  isHistoryActive = false;
  private historySub!: Subscription;

  @Input() isDarkMode = false;
  @Output() openAuthDialogOut = new EventEmitter<void>();

  constructor(
    private authService: AuthService,
    private notepadService: NotepadService,
    private historyService: NotepadHistoryService
  ) {}

  ngOnInit(): void {
      this.authService.user$.subscribe(u => this.user = u);
      this.notepadService.online$.subscribe(status => this.isOnline = status);
      // Watch if history mode is open globally to style the button correctly
      this.historySub = this.historyService.selectedVersion$.subscribe(version => {
        this.isHistoryActive = version !== null;
      });

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

  toggleHistoryMode(): void {
    if (this.isHistoryActive) {
      // If history is open, close it
      this.historyService.clearPreview();
    } else {
      // If history is closed, fetch available items and trigger the default view selection
      this.historyService.availableHistory$.pipe(take(1)).subscribe(historyList => {
        if (historyList && historyList.length > 0) {
          const latestEntry = historyList[historyList.length - 1];
          this.historyService.selectVersion(latestEntry);
        } else {
          alert('No history entries recorded yet for this note.');
        }
      });
    }
  }
}
