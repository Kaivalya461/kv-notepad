// notepad.component.ts
import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorComponent } from '../editor/editor.component';
import { FileListComponent } from '../file-list/file-list.component';
import { AuthComponent } from '../auth/auth.component';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar'
import { NotepadService } from '../service/notepad.service';
import { NoteData } from '../models/note-data.interface';
import { APP_CONSTANTS } from '../constant/app.constants';
import { MigrationService } from '../service/migration.service';
import { Subscription } from 'rxjs';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ActionButtons } from '../action-buttons/action-buttons';
import { HistoryViewerComponent } from '../history-viewer/history-viewer.component';

@Component({
  selector: 'app-notepad',
  imports: [
    FormsModule,
    CommonModule,
    FileListComponent,
    EditorComponent,
    AuthComponent,
    ActionButtons,
    MatIconModule,
    MatSidenavModule,
    MatToolbarModule,
    HistoryViewerComponent
  ],
  templateUrl: './notepad.component.html',
  styleUrl: './notepad.component.css'
})
export class NotepadComponent implements OnInit {
  files: Record<string, NoteData> = {};
  activeFile: string | null = null;
  noteText: string = '';
  activeNoteUpdatedAt: string = '';
  noteCounter: number = 0;   // <-- track number of notes
  isDarkMode = true;

  @ViewChild(EditorComponent) editor!: EditorComponent;
  @ViewChild(AuthComponent) authComponent!: AuthComponent;
  @ViewChild('drawer') drawer!: MatSidenav;

  isMobile = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private notepadService: NotepadService,
    private migrationService: MigrationService,
    private breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit(): void {
    // to support mobile-ui
    this.breakpointObserver.observe([Breakpoints.Handset])
      .subscribe(result => {
        this.isMobile = result.matches;
      });

    this.subscriptions.push(
      this.notepadService.notes$.subscribe(noteMap => {
        this.files = noteMap;
        if (this.activeFile && this.files[this.activeFile]) {
          this.noteText = this.files[this.activeFile].content;
          this.activeNoteUpdatedAt = this.files[this.activeFile].updatedAt;
        }
      }),
      this.notepadService.noteCounter$.subscribe(counter => this.noteCounter = counter),
      this.notepadService.activeFile$.subscribe(filename => {
        if (filename) {
          this.handleSelectFile(filename);
        }
      }),
      this.notepadService.darkModeSubject$.subscribe(isDark => this.isDarkMode = isDark)
    );

    this.loadData();
    setTimeout(() => this.ensureActiveNote(), 2000);
    setTimeout(() => this.notepadService.cleanupDeletedNotes(), 10000); // cleanup old deleted notes after 10sec delay

    window.addEventListener('keydown', this.handleKeydown);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    window.removeEventListener('keydown', this.handleKeydown);
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
    this.updateActiveFile(parsed.activeFile);
    console.log("NoteCounter Identified in loadData -> " + this.noteCounter);

    if (this.activeFile && this.files[this.activeFile]) {
      this.noteText = this.files[this.activeFile].content;
      this.activeNoteUpdatedAt = this.files[this.activeFile].updatedAt;
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
    this.activeNoteUpdatedAt = this.files[filename].updatedAt;
    this.forceSaveData();

    if (this.isMobile && this.drawer) {
      this.drawer.close();
    }
  }

  handleNewFile() {
    // ✅ Count only active files using the existing getter
    const activeFilesCount = Object.keys(this.activeNotes).length;

    if (activeFilesCount >= 11) {
      alert("You can only create up to 11 notes.");
      return;
    }

    // Keep incrementing until we find a unique filename
    let filename: string;
    do {
      this.noteCounter++;
      filename = `note${this.noteCounter}`;
    } while (this.files.hasOwnProperty(filename));

    this.files[filename] = { content: '', updatedAt: new Date().toISOString(), isDeleted: false };
    this.activeFile = filename;
    this.noteText = '';
    this.forceSaveData();

    if (this.isMobile && this.drawer) {
      this.drawer.close();
    }
  }

  handleNoteChange(newText: string) {
    if (this.activeFile) {
      this.files[this.activeFile] = {
        // ✅ Copy all existing properties first (including .history!)
        ...this.files[this.activeFile],
        content: newText,
        updatedAt: new Date().toISOString(),
        isDeleted: false
      };
      // this.noteText = newText; // Not required, as this.noteText already subscribes note$.
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

  private forceSaveData() {
    this.notepadService.forceUpdateNotes(this.files, this.activeFile, this.noteCounter);
  }

  handleDeleteFile(filename: string) {
    this.notepadService.deleteNote(filename);

    // Update active file selection
    if (this.activeFile === filename) {
      const remaining = Object.keys(this.activeNotes);
      this.activeFile = remaining.length ? remaining[0] : null;
    }

    this.forceSaveData();
  }

  async handleLogout() {
    console.log("Clearing everything");

    // 1. Clear local notes
    this.files = {};
    this.activeFile = null;
    this.noteText = '';
    this.activeNoteUpdatedAt = '';
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

  handleKeydown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault(); // stop browser "Save Page"
      this.notepadService.forceUpdateNotes(this.files, this.activeFile, this.noteCounter); // trigger sync immediately
    }
  };

  get activeNotes(): Record<string, NoteData> {
    return this.notepadService.getActiveNotes();
  }

  // ✅ Automatically triggers when user brings focus back to this browser tab/window
  @HostListener('window:focus')
  onWindowFocus(): void {
    this.notepadService.syncOnWindowFocus();
  }

  // Used for selecting different notes. handleSelectFile is triggered when activeFile$ is update in NotepadService.
  updateActiveFile(newActiveFileName: string) {
    this.notepadService.updateActiveFileName(newActiveFileName);
  }
}