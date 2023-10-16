import { Injectable } from '@angular/core';
import { Observable, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TimerService {
  private timer$: Observable<number>;

  constructor() {
    // Create a timer that emits a value every 1 second
    this.timer$ = timer(0, 1000); // 1000 milliseconds = 1 second
  }

  getTimer(): Observable<number> {
    return this.timer$;
  }
}