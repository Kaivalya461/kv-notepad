import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit, AfterViewInit {
  @Input() noteText: string = '';
  @Input() updatedAt: string = '';
  @Output() noteChange = new EventEmitter<string>();

  @ViewChild('noteTextArea') textarea!: ElementRef<HTMLTextAreaElement>;

  readonly maxChars = 21000;

  isMobile = false;

  constructor(
    private breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit(): void {
    // to support mobile-ui
    this.breakpointObserver.observe([Breakpoints.Handset])
      .subscribe(result => {
        this.isMobile = result.matches;
      });
  }

  ngAfterViewInit(): void {
    if (!this.isMobile) {
      this.focusTextarea();
    }
  }

  focusTextarea() {
    this.textarea.nativeElement.focus();
  }

  onTextChange(value: string) {
    // enforce max length
    if (value.length > this.maxChars) {
      value = value.substring(0, this.maxChars);
    }
    this.noteText = value;
    this.noteChange.emit(this.noteText);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      event.preventDefault();
      const spaces = '    ';
      document.execCommand('insertText', false, spaces);
    }

    // block typing beyond maxChars
    if (this.noteText.length >= this.maxChars &&
        event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
    }
  }

}
