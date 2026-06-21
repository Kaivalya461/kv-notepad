// migration.service.ts
import { Injectable } from '@angular/core';
import { NoteData } from '../models/note-data.interface';
import { APP_CONSTANTS } from '../constant/app.constants';

@Injectable({
  providedIn: 'root'
})
export class MigrationService {

  /** Handles migration from V1 to V2 */
  migrateV1ToV2(parsed: any): { files: Record<string, NoteData>, activeFile: string | null, noteCounter: number } {
    const migratedFiles: Record<string, NoteData> = {};

    for (const [filename, value] of Object.entries(parsed.files || {})) {
      if (typeof value === 'string') {
        migratedFiles[filename] = {
          content: value,
          updatedAt: new Date().toISOString()
        };
      } else {
        migratedFiles[filename] = value as NoteData;
      }
    }

    return {
      files: migratedFiles,
      activeFile: parsed.activeFile || null,
      noteCounter: parsed.noteCounter || 0
    };
  }

  /** Perform backup + migration + cleanup */
  performMigration(): { files: Record<string, NoteData>, activeFile: string | null, noteCounter: number } | null {
    const savedDataV1 = localStorage.getItem(APP_CONSTANTS.NOTEPAD_DATA_OLD);
    if (!savedDataV1) return null;

    console.log("Migration started at -> " + Date().toLocaleString());
    // 1. Backup old data
    localStorage.setItem('notepadDataV1Bak', savedDataV1);

    // 2. Migrate
    const parsed = JSON.parse(savedDataV1);
    const migrated = this.migrateV1ToV2(parsed);

    // 3. Save migrated data under new key
    localStorage.setItem('notepadDataV2', JSON.stringify(migrated));

    // 4. Delete old key
    localStorage.removeItem(APP_CONSTANTS.NOTEPAD_DATA_OLD);

    return migrated;
  }
}
