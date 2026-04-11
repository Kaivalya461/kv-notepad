import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotepadComponent } from './notepad/notepad.component';

@Component({
  selector: 'app-root',
  imports: [
    NotepadComponent,
    RouterOutlet
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'notepad-app';
}
