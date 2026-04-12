import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorComponent } from '../editor/editor.component';
import { FileListComponent } from '../file-list/file-list.component';

@Component({
  selector: 'app-notepad',
  imports: [
    FormsModule,
    CommonModule,
    FileListComponent,
    EditorComponent
  ],
  templateUrl: './notepad.component.html',
  styleUrl: './notepad.component.css'
})
export class NotepadComponent implements OnInit {
  files: { [key: string]: string } = {};
  activeFile: string | null = null;
  noteText: string = '';
  noteCounter: number = 0;   // <-- track number of notes
  isDarkMode = true;

  @ViewChild(EditorComponent) editor!: EditorComponent;

  ngOnInit(): void {
    this.loadData();
    this.ensureActiveNote();
  }

  /** Load saved data from localStorage */
  private loadData() {
    const savedData = localStorage.getItem('notepadData');
    if (!savedData) return;

    const parsed = JSON.parse(savedData);
    this.files = parsed.files || {};
    this.activeFile = parsed.activeFile || null;
    this.noteCounter = this.computeNoteCounter(parsed);

    if (this.activeFile && this.files[this.activeFile]) {
      this.noteText = this.files[this.activeFile];
    }
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
    this.noteText = this.files[filename];
    this.saveData();

    // Focus textarea after selecting a file
    setTimeout(() => this.editor.focusTextarea(), 1000);
  }

  handleNewFile() {
    this.noteCounter++;
    const filename = `note${this.noteCounter}`;
    this.files[filename] = '';
    this.activeFile = filename;
    this.noteText = '';
    this.saveData();

    // Focus textarea after creating new file.
    // delay is needed as textArea html is not initlized in case of handleNewFile() called within EditorComponent.ngOnInit()
    setTimeout(() => this.editor.focusTextarea(), 1000);
  }

  handleNoteChange(newText: string) {
    if (this.activeFile) {
      this.files[this.activeFile] = newText;
      this.noteText = newText;
      this.saveData();
    }
  }

  private saveData() {
    localStorage.setItem('notepadData', JSON.stringify({
      files: this.files,
      activeFile: this.activeFile,
      noteCounter: this.noteCounter
    }));
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
  }

  handleDeleteFile(filename: string) {
    delete this.files[filename];

    // If the deleted file was active, clear or switch
    if (this.activeFile === filename) {
      const remaining = Object.keys(this.files);
      this.activeFile = remaining.length ? remaining[0] : null;
      this.noteText = this.activeFile ? this.files[this.activeFile] : '';
    }

    this.saveData();

    // Focus textarea after deleting new file
    setTimeout(() => this.editor.focusTextarea(), 1000);
  }
}