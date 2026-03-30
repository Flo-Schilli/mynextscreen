import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `<div class="flex items-center justify-center h-screen w-screen bg-black text-white">
    <p class="text-text-muted text-lg">Signage Player</p>
  </div>`,
  styles: [`:host { display: block; width: 100vw; height: 100vh; }`]
})
export class App {}
