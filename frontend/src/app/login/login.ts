import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Router } from '@angular/router';
import { register } from '@teamhanko/hanko-elements';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, OnDestroy {
  private router = inject(Router);
  private hankoApiUrl = environment.hankoApiUrl;

  ngOnInit(): void {
    register(this.hankoApiUrl).catch((error) =>
      console.error('Failed to register Hanko elements:', error)
    );

    document.addEventListener(
      'hankoAuthFlowCompleted',
      this.redirectAfterLogin
    );
  }

  ngOnDestroy(): void {
    document.removeEventListener(
      'hankoAuthFlowCompleted',
      this.redirectAfterLogin
    );
  }

  private redirectAfterLogin = () => {
    this.router.navigate(['/']);
  };
}
