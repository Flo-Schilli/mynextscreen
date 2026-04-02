import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { register } from '@teamhanko/hanko-elements';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private hankoApiUrl = environment.hankoApiUrl;
  private subscription?: Subscription;

  ngOnInit(): void {
    register(this.hankoApiUrl).catch((error) =>
      console.error('Failed to register Hanko elements:', error),
    );

    this.subscription = this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.router.navigate(['/']);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
