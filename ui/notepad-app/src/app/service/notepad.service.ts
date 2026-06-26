import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { BehaviorSubject, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { NoteData } from '../models/note-data.interface';
import { APP_CONSTANTS } from '../constant/app.constants';

@Injectable({
  providedIn: 'root'
})
export class NotepadService {
  private notesSubject = new BehaviorSubject<Record<string, NoteData>>({});
  notes$ = this.notesSubject.asObservable();

  private syncTrigger = new Subject<void>();

  private onlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  online$ = this.onlineSubject.asObservable();

  private noteCounterSubject = new BehaviorSubject<number>(0);
  noteCounter$ = this.noteCounterSubject.asObservable();

  private activeFileSubject = new BehaviorSubject<string | null>(null);
  activeFile$ = this.activeFileSubject.asObservable();

  private darkModeSubject = new BehaviorSubject<boolean>(true);
  darkModeSubject$ = this.darkModeSubject.asObservable();

  constructor(private firestore: Firestore, private authService: AuthService) {
    this.syncTrigger.pipe(debounceTime(11000)).subscribe(() => {
      this.syncNotes();
    });

    this.authService.user$.subscribe(user => {
      if (user) {
        this.loadNotesFromFirestore(user.uid);
      }
    });

    // Connectivity listeners
    window.addEventListener('online', () => {
      this.onlineSubject.next(true);
      this.handleReconnect();
    });
    window.addEventListener('offline', () => {
      this.onlineSubject.next(false);
      console.log("App is offline, saving locally only");
    });

    const userTheme = localStorage.getItem("kv-notepad-theme");
    if (userTheme && userTheme == 'light') {
      this.setDarkMode(false);
    }
  }

  updateNotes(files: Record<string, NoteData>, activeFile: string | null, noteCounter: number) {
    this.notesSubject.next(files);
    this.noteCounterSubject.next(noteCounter);

    localStorage.setItem(APP_CONSTANTS.NOTEPAD_DATA, JSON.stringify({
      files: files,
      activeFile,
      noteCounter
    }));

    this.syncTrigger.next();
  }

  forceUpdateNotes(files: Record<string, NoteData>, activeFile: string | null, noteCounter: number) {
    this.notesSubject.next(files);
    this.noteCounterSubject.next(noteCounter);

    localStorage.setItem(APP_CONSTANTS.NOTEPAD_DATA, JSON.stringify({
      files: files,
      activeFile,
      noteCounter
    }));

    this.syncNotes();
  }

  private async syncNotes() {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const localData = JSON.parse(localStorage.getItem(APP_CONSTANTS.NOTEPAD_DATA) || '{}');
    const notes: Record<string, NoteData> = localData.files || {};
    const notesCol = collection(this.firestore, `notepadUsers/${user.uid}/notes`);

    for (const [noteId, note] of Object.entries(notes) as [string, NoteData][]) {
      const ref = doc(notesCol, noteId);
      const snap = await getDoc(ref);

      if (!snap.exists() || new Date(note.updatedAt) > new Date((snap.data() as any).updatedAt)) {
        await setDoc(ref, {
          content: note.content,
          updatedAt: note.updatedAt
        }, { merge: true });
      }
    }

    await setDoc(doc(this.firestore, `notepadUsers/${user.uid}`), {
      activeFile: localData.activeFile || null,
      noteCounter: localData.noteCounter || 0
    }, { merge: true });

    // ✅ Notify sync completion (for animation)
    document.dispatchEvent(new CustomEvent('notesSynced'));
  }

  private async loadNotesFromFirestore(uid: string) {
    const localData = JSON.parse(localStorage.getItem(APP_CONSTANTS.NOTEPAD_DATA) || '{}');
    const localNotes: Record<string, NoteData> = localData.files || {};

    const notesCol = collection(this.firestore, `notepadUsers/${uid}/notes`);
    const snap = await getDocs(notesCol);

    const mergedNotes: Record<string, NoteData> = { ...localNotes };

    snap.forEach(docSnap => {
      const data = docSnap.data() as any;
      const noteId = docSnap.id;
      const remoteNote: NoteData = {
        content: data.content || '',
        updatedAt: data.updatedAt || new Date().toISOString()
      };

      const localNote = localNotes[noteId];
      if (!localNote) {
        // New note from Firestore
        mergedNotes[noteId] = remoteNote;
      } else {
        // Conflict resolution: prefer the newer one
        if (new Date(remoteNote.updatedAt) > new Date(localNote.updatedAt)) {
          mergedNotes[noteId] = remoteNote;
        } else {
          mergedNotes[noteId] = localNote;
        }
      }
    });

    // Also keep any local notes not present in Firestore
    for (const [noteId, localNote] of Object.entries(localNotes)) {
      if (!mergedNotes[noteId]) {
        mergedNotes[noteId] = localNote;
      }
    }

    // Load metadata
    const userDoc = doc(this.firestore, `notepadUsers/${uid}`);
    const userSnap = await getDoc(userDoc);
    let activeFile = localData.activeFile || null;
    let noteCounter = localData.noteCounter || 0;
    if (userSnap.exists()) {
      const data = userSnap.data() as any;
      activeFile = data.activeFile || activeFile;
      noteCounter = data.noteCounter || noteCounter;
    }

    this.notesSubject.next(mergedNotes);
    this.noteCounterSubject.next(noteCounter);
    localStorage.setItem(APP_CONSTANTS.NOTEPAD_DATA, JSON.stringify({ files: mergedNotes, activeFile, noteCounter }));
    this.activeFileSubject.next(activeFile); // this will trigger handleSelectFile in Notepad Component.
  }

  async deleteNote(noteId: string) {
    const notes = { ...this.notesSubject.value };
    delete notes[noteId];
    this.notesSubject.next(notes);

    const user = this.authService.getCurrentUser();
    if (!user) return;

    const ref = doc(this.firestore, `notepadUsers/${user.uid}/notes/${noteId}`);
    await deleteDoc(ref);

    // Update metadata after deletion
    const localData = JSON.parse(localStorage.getItem(APP_CONSTANTS.NOTEPAD_DATA) || '{}');
    await setDoc(doc(this.firestore, `notepadUsers/${user.uid}`), {
      activeFile: localData.activeFile || null,
      noteCounter: localData.noteCounter || 0
    }, { merge: true });
  }

  private async handleReconnect() {
    console.log("Connectivity restored, syncing notes");
    await this.syncNotes();
    const user = this.authService.getCurrentUser();
    if (user) {
      await this.loadNotesFromFirestore(user.uid);
    }
  }

  clearLocalNotes() {
    localStorage.removeItem(APP_CONSTANTS.NOTEPAD_DATA);
    this.notesSubject.next({});
    this.noteCounterSubject.next(0);
  }

  hasLocalNotes(): boolean {
    const localData = JSON.parse(localStorage.getItem(APP_CONSTANTS.NOTEPAD_DATA) || '{}');
    const files: Record<string, NoteData> = localData.files || {};

    // Check if any note has non-empty content
    return Object.values(files).some(note => note.content && note.content.trim().length > 0);
  }

  clearAllEmptyNotes() {
    const localData = JSON.parse(localStorage.getItem(APP_CONSTANTS.NOTEPAD_DATA) || '{}');
    const files: Record<string, NoteData> = localData.files || {};

    // Filter out notes with empty or whitespace-only content
    const filteredNotes: Record<string, NoteData> = {};
    for (const [noteId, note] of Object.entries(files)) {
      if (note.content && note.content.trim().length > 0) {
        filteredNotes[noteId] = note;
      }
    }

    // Update BehaviorSubject and localStorage
    this.updateNotesBehaviourAndLocalStorage(filteredNotes, localData);
  }

  prepareUnsavedNotesForSync() {
    const localData = JSON.parse(localStorage.getItem(APP_CONSTANTS.NOTEPAD_DATA) || '{}');
    const files: Record<string, NoteData> = localData.files || {};

    const renamedNotes: Record<string, NoteData> = {};

    for (const [noteId, noteData] of Object.entries(files)) {
      // Only rename if note has content
      if (noteData.content && noteData.content.trim().length > 0) {
        const randomNum = Math.floor(100 + Math.random() * 900); // Adding random number to avoid overwriting note if same note exists in cloud.
        const newId = `local${randomNum}_${noteId}`;

        renamedNotes[newId] = {
          ...noteData,
          updatedAt: new Date().toISOString()
        };
      }
    }

    // Update BehaviorSubject and localStorage with renamed notes
    this.updateNotesBehaviourAndLocalStorage(renamedNotes, localData);
  }

  updateNotesBehaviourAndLocalStorage(notes: Record<string, NoteData>, localData: any) {
    this.notesSubject.next(notes);
    this.noteCounterSubject.next(localData.noteCounter);
    localStorage.setItem(APP_CONSTANTS.NOTEPAD_DATA, JSON.stringify({
      files: notes,
      activeFile: localData.activeFile || null,
      noteCounter: localData.noteCounter || 0
    }));
  }

  get isDarkMode(): boolean {
    return this.darkModeSubject.value;
  }

  // Setter
  setDarkMode(value: boolean) {
    this.darkModeSubject.next(value);
    localStorage.setItem('kv-notepad-theme', value ? 'dark' : 'light');
  }
}
