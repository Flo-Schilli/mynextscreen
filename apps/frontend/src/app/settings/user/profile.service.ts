import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserProfile {
  userId: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  gravatarEnabled: boolean;
  /** Gravatar URL when enabled; null when the user opted out. */
  avatarUrl: string | null;
}

/**
 * Self-service access to the signed-in user's own profile. Name lives here;
 * email and password changes have their own verify/confirm flows on AuthService.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>('/api/me/profile');
  }

  updateProfile(input: {
    name?: string | null;
    gravatarEnabled?: boolean;
  }): Observable<UserProfile> {
    return this.http.patch<UserProfile>('/api/me/profile', input);
  }
}
