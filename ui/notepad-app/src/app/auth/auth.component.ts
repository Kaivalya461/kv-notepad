import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { AuthService } from '../service/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotepadService } from '../service/notepad.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    HttpClientModule // Added to handle API requests to cloud functions
  ],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent {
  email = '';
  otpCode = ''; // Track the 6 digit text field
  user: any = null;
  isOpen = false;
  isOnline = true;

  viewState: 'email' | 'otp' = 'email'; // Controls step flow state
  isLoading = false; // Prevents button spam during network calls

  // REPLACE THIS with your deployed Cloud Function root domain url (No trailing slash)
  private readonly SEND_OTP = 'https://sendotp-k5dqedb3pq-uc.a.run.app';
  private readonly VERIFY_OTP = 'https://verifyotp-k5dqedb3pq-uc.a.run.app';


  @Input() isDarkMode = false;
  @Output() logoutEvent = new EventEmitter<void>();

  @ViewChild('otpInput') otpInput!: ElementRef<HTMLInputElement>;

  constructor(
    private authService: AuthService,
    private notepadService: NotepadService,
    private http: HttpClient
  ) {
    this.authService.user$.subscribe(u => this.user = u);
    this.notepadService.online$.subscribe(status => this.isOnline = status);
  }

  // Phase 1: Call sendOtp Function
  async requestOtp() {
    if (!this.email) return;
    this.isLoading = true;

    try {
      const response: any = await firstValueFrom(
        this.http.post(`${this.SEND_OTP}`, { email: this.email })
      );

      if (response && response.success) {
        this.viewState = 'otp'; // Swap view to code entry

        // ✅ Focus the OTP input after view updates
        setTimeout(() => {
          this.otpInput?.nativeElement.focus();
        }, 0);
      } else {
        alert(response?.message || 'Failed to send OTP code.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.error?.message || 'An error occurred while connecting to authentication servers.');
    } finally {
      this.isLoading = false;
    }
  }

  // Phase 2: Call verifyOtp Function and apply session token
  async verifyOtp() {
    if (!this.email || !this.otpCode) return;
    this.isLoading = true;

    try {
      const response: any = await firstValueFrom(
        this.http.post(`${this.VERIFY_OTP}`, { email: this.email, otp: this.otpCode })
      );

      if (response && response.success && response.token) {
        // ✅ Ask user what to do with local unsaved notes
        this.notepadService.clearAllEmptyNotes();
        if (this.notepadService.hasLocalNotes()) {
          const choice = confirm("Do you want to upload your unsaved notes to cloud? Press Cancel to discard them.");
          if (choice) {
            this.notepadService.prepareUnsavedNotesForSync();
          } else {
            this.notepadService.clearLocalNotes();
          }
        }

        // Log user into Firebase Client SDK using custom generated security token
        await this.authService.loginWithToken(response.token);
        this.close();
      } else {
        alert(response?.message || 'Invalid verification code.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.error?.message || 'Verification failed. The code might be expired or incorrect.');
    } finally {
      this.isLoading = false;
    }
  }

  // Let user fix a typo in their email address
  changeEmail() {
    this.viewState = 'email';
    this.otpCode = '';
  }

  async logout() {
    await this.authService.logout();
    this.logoutEvent.emit();
  }

  open() {
    this.isOpen = true;
    this.viewState = 'email'; // Reset state on open
    this.otpCode = '';
  }

  close() {
    this.isOpen = false;
  }

  closeAuthDialog() {
    this.close();
  }
}
