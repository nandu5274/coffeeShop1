import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingOrderComponent } from './booking-order.component';

describe('BookingOrderComponent', () => {
  let component: BookingOrderComponent;
  let fixture: ComponentFixture<BookingOrderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BookingOrderComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
