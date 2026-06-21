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

  constructor(private firestore: Firestore, private authService: AuthService) {
    this.syncTrigger.pipe(debounceTime(11000)).subscribe(() => {
      this.syncNotes();
    });

    this.authService.user$.subscribe(user => {
      if (user) {
        const firstRegistration = localStorage.getItem('firstRegistration');
        if (firstRegistration) {
          // Only seed local data to Firestore during register, and skip load from Firestore
          console.log("Already seeded Firestore during register, so skip load");
          this.firstTimeReg();
          localStorage.removeItem('firstRegistration');
        } else {
          this.loadNotesFromFirestore(user.uid);
        }
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
  }

  updateNotes(files: Record<string, NoteData>, activeFile?: string | null, noteCounter?: number) {
    this.notesSubject.next(files);

    localStorage.setItem(APP_CONSTANTS.NOTEPAD_DATA, JSON.stringify({
      files: files,
      activeFile,
      noteCounter
    }));

    this.syncTrigger.next();
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
    localStorage.setItem(APP_CONSTANTS.NOTEPAD_DATA, JSON.stringify({ files: mergedNotes, activeFile, noteCounter }));
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

  private async firstTimeReg() {
    // ✅ After registration, save local notes + metadata into firebase
    const user = this.authService.getCurrentUser();
    if (!user) {
      alert("User Registration Failed!");
      return;
    }

    const savedData = JSON.parse(localStorage.getItem(APP_CONSTANTS.NOTEPAD_DATA) || '{}');
    const files = savedData.files || {};
    const activeFile = savedData.activeFile || null;
    const noteCounter = savedData.noteCounter || 0;

    // Save metadata in parent doc
    await setDoc(doc(this.firestore, `notepadUsers/${user.uid}`), {
      activeFile,
      noteCounter
    }, { merge: true });

    // Save notes in subcollection
    console.log("Parsed Files in registration workflow -> " + JSON.stringify(files));
    const notesCol = collection(this.firestore, `notepadUsers/${user.uid}/notes`);
    for (const [noteId, noteData] of Object.entries(files) as [string, NoteData][]) {
      await setDoc(doc(notesCol, noteId), {
        content: noteData.content,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  }
}
