import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotepadHistoryService } from '../service/notepad-history.service';
import { NoteHistoryEntry } from '../models/note-history-entry.interface';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subscription, Observable } from 'rxjs';

@Component({
  selector: 'app-history-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history-viewer.component.html',
  styleUrls: ['./history-viewer.component.css']
})
export class HistoryViewerComponent implements OnInit, OnDestroy {
  currentVersion: NoteHistoryEntry | null = null;
  availableHistory$: Observable<NoteHistoryEntry[]>;
  isMobile = false;
  private subs = new Subscription();

  constructor(
    private historyService: NotepadHistoryService,
    private breakpointObserver: BreakpointObserver
  ) {
    this.availableHistory$ = this.historyService.availableHistory$;
  }

  ngOnInit(): void {
    // 1. Handle device layouts
    this.subs.add(
      this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
        this.isMobile = result.matches;
      })
    );

    // 2. Manage real-time selections
    this.subs.add(
      this.historyService.selectedVersion$.subscribe(version => {
        this.currentVersion = version;
      })
    );
  }

  onDropdownChange(event: Event, historyList: NoteHistoryEntry[]): void {
    const target = event.target as HTMLSelectElement;
    const match = historyList.find(h => h.date === target.value);
    if (match) {
      this.historyService.selectVersion(match);
    }
  }

  closePreview(): void {
    this.historyService.clearPreview();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
