// notepad.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorComponent } from '../editor/editor.component';
import { FileListComponent } from '../file-list/file-list.component';
import { AuthComponent } from '../auth/auth.component';
import { AuthService } from '../service/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { NotepadService } from '../service/notepad.service';
import { NoteData } from '../models/note-data.interface';
import { APP_CONSTANTS } from '../constant/app.constants';
import { MigrationService } from '../service/migration.service';

@Component({
  selector: 'app-notepad',
  imports: [
    FormsModule,
    CommonModule,
    FileListComponent,
    EditorComponent,
    AuthComponent,
    MatIconModule
  ],
  templateUrl: './notepad.component.html',
  styleUrl: './notepad.component.css'
})
export class NotepadComponent implements OnInit {
  files: Record<string, NoteData> = {};
  activeFile: string | null = null;
  noteText: string = '';
  noteCounter: number = 0;   // <-- track number of notes
  isDarkMode = true;

  @ViewChild(EditorComponent) editor!: EditorComponent;
  @ViewChild(AuthComponent) authComponent!: AuthComponent;

  user: any = null;
  isOnline = true;

  constructor(
    private authService: AuthService,
    private notepadService: NotepadService,
    private migrationService: MigrationService
  ) {
    this.authService.user$.subscribe(u => this.user = u);

    this.notepadService.notes$.subscribe(noteMap => {
      this.files = noteMap;
      if (this.activeFile && this.files[this.activeFile]) {
        this.noteText = this.files[this.activeFile].content;
      }
    });

    this.notepadService.online$.subscribe(status => this.isOnline = status);
  }

  ngOnInit(): void {
    this.loadData();
    setTimeout(() => this.ensureActiveNote(), 3000);
  }

  /** Load saved data from localStorage */
  private loadData() {
    // Run migration if old data exists
    this.migrationService.performMigration();

    const savedData = localStorage.getItem(APP_CONSTANTS.NOTEPAD_DATA);
    if (!savedData) return;

    const parsed = JSON.parse(savedData);
    this.files = parsed.files || {};
    this.activeFile = parsed.activeFile || null;
    this.noteCounter = this.computeNoteCounter(parsed);

    if (this.activeFile && this.files[this.activeFile]) {
      this.noteText = this.files[this.activeFile].content;
    }

    // ✅ Push local notes into NotepadService so notesSubject is not empty
    this.notepadService.updateNotes(parsed.files, this.activeFile, this.noteCounter);
  }

  /** Compute the highest note number from filenames or fallback to saved counter */
  private computeNoteCounter(parsed: any): number {
    const noteNumbers = Object.keys(this.files)
      .map(name => {
        const match = name.match(/^note(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });
    return noteNumbers.length ? Math.max(...noteNumbers) : parsed.noteCounter || 0;
  }

  /** Ensure there is always at least one active note */
  private ensureActiveNote() {
    console.log("this.files status---> " + Object.keys(this.files).length);
    if (!Object.keys(this.files).length || !this.activeFile) {
      this.handleNewFile();
    }
  }

  handleSelectFile(filename: string) {
    this.activeFile = filename;
    this.noteText = this.files[filename].content;
    this.saveData();

    // Focus textarea after selecting a file
    setTimeout(() => this.editor.focusTextarea(), 1000);
  }

  handleNewFile() {
    if (Object.keys(this.files).length >= 11) {
      alert("You can only create up to 11 notes.");
      return;
    }

    this.noteCounter++;
    const filename = `note${this.noteCounter}`;
    this.files[filename] = { content: '', updatedAt: new Date().toISOString() };
    this.activeFile = filename;
    this.noteText = '';
    this.saveData();

    setTimeout(() => this.editor.focusTextarea(), 1000);
  }

  handleNoteChange(newText: string) {
    if (this.activeFile) {
      this.files[this.activeFile] = {
        content: newText,
        updatedAt: new Date().toISOString()
      };
      this.noteText = newText;
      this.saveData();
    }
  }

  // LocalStorage logic is moved inside notepadService.updateNotes();
  private saveData() {
    // localStorage.setItem('notepadData', JSON.stringify({
    //   files: this.files,
    //   activeFile: this.activeFile,
    //   noteCounter: this.noteCounter
    // }));
    this.notepadService.updateNotes(this.files, this.activeFile, this.noteCounter);
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
  }

  handleDeleteFile(filename: string) {
    this.notepadService.deleteNote(filename);

    // Update active file selection
    if (this.activeFile === filename) {
      const remaining = Object.keys(this.files);
      this.activeFile = remaining.length ? remaining[0] : null;
      this.noteText = this.activeFile ? this.files[this.activeFile].content : '';
    }

    this.saveData();

    // Focus textarea after deleting new file
    setTimeout(() => this.editor.focusTextarea(), 1000);
  }

  async handleLogout() {
    console.log("Clearing everything");

    // 1. Clear local notes
    this.files = {};
    this.activeFile = null;
    this.noteText = '';
    this.noteCounter = 0;
    localStorage.removeItem(APP_CONSTANTS.NOTEPAD_DATA);

    // 2. Finally, Create one empty note
    this.handleNewFile();
  }

  openAuthDialog() {
    // You can use a service or directly toggle the AuthComponent
    // For simplicity, if using ViewChild:
    this.authComponent.open();
  }
}