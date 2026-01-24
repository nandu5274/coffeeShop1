import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CounterCapComponent } from './counter-cap.component';

describe('CounterCapComponent', () => {
  let component: CounterCapComponent;
  let fixture: ComponentFixture<CounterCapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CounterCapComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CounterCapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
