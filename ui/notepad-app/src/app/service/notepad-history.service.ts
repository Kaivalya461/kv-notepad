import { Injectable, inject } from '@angular/core'; // Added inject
import { BehaviorSubject, map } from 'rxjs';
import { NotepadService } from './notepad.service';
import { NoteHistoryEntry } from '../models/note-history-entry.interface';

@Injectable({
  providedIn: 'root'
})
export class NotepadHistoryService {
  // ✅ Inject at class level so it is ready instantly
  private notepadService = inject(NotepadService);

  private selectedVersionSubject = new BehaviorSubject<NoteHistoryEntry | null>(null);
  selectedVersion$ = this.selectedVersionSubject.asObservable();

  availableHistory$ = this.notepadService.notes$.pipe(
    map(notes => {
      const activeFile = this.notepadService.getActiveFileName();
      if (activeFile && notes[activeFile]) {
        return notes[activeFile].history || [];
      }
      return [];
    })
  );

  constructor() {
    this.notepadService.activeFile$.subscribe(() => this.clearPreview());
  }

  selectVersion(version: NoteHistoryEntry) {
    this.selectedVersionSubject.next(version);
  }

  clearPreview() {
    this.selectedVersionSubject.next(null);
  }
}
