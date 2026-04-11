// file-list.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-list.component.html',
  styleUrls: ['./file-list.component.css']
})
export class FileListComponent {
  @Input() files: { [key: string]: string } = {};
  @Input() activeFile: string | null = null;
  @Output() selectFile = new EventEmitter<string>();
  @Output() newFile = new EventEmitter<void>();
  @Output() deleteFile = new EventEmitter<string>();

  onSelect(filename: string) {
    this.selectFile.emit(filename);
  }

  onNewFile() {
    this.newFile.emit();
  }

  onDelete(filename: string) {
    this.deleteFile.emit(filename);
  }
}
