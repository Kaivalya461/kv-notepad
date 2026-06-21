import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from '@angular/fire/auth';
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

  async register(email: string, password: string) {
    // Limit registrations to 100 users
    const usersCount = await this.getUserCount();
    if (usersCount >= 100) {
      throw new Error('Registration limit reached (100 users max).');
    }

    // To skip Event Driven Data Load from Firebase in notepad.service.ts, as notes and metadata is already present.
    localStorage.setItem('firstRegistration', 'true');

    const cred = await createUserWithEmailAndPassword(this.auth, email, password);

    return cred;
  }

  async login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async logout() {
    return signOut(this.auth);
  }

  private async getUserCount(): Promise<number> {
    // TODO: implement Firestore query to count users
    return 0;
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }
}
