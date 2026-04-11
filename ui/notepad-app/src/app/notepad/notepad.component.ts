import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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

  ngOnInit(): void {
    const savedData = localStorage.getItem('notepadData');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      this.files = parsed.files || {};
      this.activeFile = parsed.activeFile || null;
    
      // Determine highest note number from existing filenames
      const noteNumbers = Object.keys(this.files)
        .map(name => {
          const match = name.match(/^note(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        });
      this.noteCounter = noteNumbers.length ? Math.max(...noteNumbers) : 0;
      
      if (this.activeFile) {
        this.noteText = this.files[this.activeFile];
      }
    }
  }


  handleSelectFile(filename: string) {
    this.activeFile = filename;
    this.noteText = this.files[filename];
    this.saveData();
  }

  handleNewFile() {
    this.noteCounter++;
    const filename = `note${this.noteCounter}`;
    this.files[filename] = '';
    this.activeFile = filename;
    this.noteText = '';
    this.saveData();
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
  }
}