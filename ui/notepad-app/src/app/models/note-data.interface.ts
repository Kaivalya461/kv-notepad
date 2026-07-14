import { NoteHistoryEntry } from "./note-history-entry.interface";

export interface NoteData {
  content: string;
  updatedAt: string;
  isDeleted: boolean;
  history?: NoteHistoryEntry[];
}