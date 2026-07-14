import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoryViewer } from './history-viewer.component';

describe('HistoryViewer', () => {
  let component: HistoryViewer;
  let fixture: ComponentFixture<HistoryViewer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoryViewer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoryViewer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
