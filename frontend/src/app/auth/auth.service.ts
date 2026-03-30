import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Hanko } from '@teamhanko/hanko-elements';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private hanko = new Hanko(environment.hankoApiUrl);
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.checkSession();

    this.hanko.onSessionCreated(() => {
      this.checkSession();
    });

    this.hanko.onSessionExpired(() => {
      this.currentUserSubject.next(null);
    });
  }

  private async checkSession() {
    try {
      const session = await this.hanko.validateSession();
      if (session && session.is_valid) {
        this.currentUserSubject.next(session);
      } else {
        this.currentUserSubject.next(null);
      }
    } catch {
      this.currentUserSubject.next(null);
    }
  }

  async isValid(): Promise<boolean> {
    try {
      const session = await this.hanko.validateSession();
      return session.is_valid;
    } catch {
      return false;
    }
  }

  getToken(): string {
    return this.hanko.getSessionToken();
  }

  async logout(): Promise<void> {
    await this.hanko.logout();
    this.currentUserSubject.next(null);
  }
}
