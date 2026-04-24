// editor.component.ts
import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements AfterViewInit {
  @Input() noteText: string = '';
  @Output() noteChange = new EventEmitter<string>();

  @ViewChild('noteTextArea') textarea!: ElementRef<HTMLTextAreaElement>;

  ngAfterViewInit(): void {
    // Focus the textarea once the view is initialized
    this.focusTextarea();
  }

  focusTextarea() {
    this.textarea.nativeElement.focus();
  }

  onTextChange(value: string) {
    this.noteChange.emit(value);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      event.preventDefault();
      const spaces = '    ';
      document.execCommand('insertText', false, spaces);
    }
  }
}
