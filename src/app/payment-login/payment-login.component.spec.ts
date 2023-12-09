import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentLoginComponent } from './payment-login.component';

describe('PaymentLoginComponent', () => {
  let component: PaymentLoginComponent;
  let fixture: ComponentFixture<PaymentLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PaymentLoginComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
