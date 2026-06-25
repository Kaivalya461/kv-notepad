import { Injectable } from '@angular/core';
import { Auth, signInWithCustomToken, signOut, onAuthStateChanged, User } from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private auth: Auth) {
    onAuthStateChanged(this.auth, (user) => {
      this.userSubject.next(user);
    });
  }

  async logout() {
    return signOut(this.auth);
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  async loginWithToken(token: string) {
    try {
      // Exchange custom backend assertion pass for an official standard Firebase User token
      return await signInWithCustomToken(this.auth, token);
    } catch (error) {
      console.error("Custom token validation processing failure", error);
      throw error;
    }
  }
}
