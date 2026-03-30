import { Injectable } from '@angular/core';
import { Hanko } from '@teamhanko/hanko-frontend-sdk';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private hanko = new Hanko(environment.hankoApiUrl);

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
  }
}
