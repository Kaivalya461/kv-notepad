// editor.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent {
  @Input() noteText: string = '';
  @Output() noteChange = new EventEmitter<string>();

  onTextChange(value: string) {
    this.noteChange.emit(value);
  }
}
