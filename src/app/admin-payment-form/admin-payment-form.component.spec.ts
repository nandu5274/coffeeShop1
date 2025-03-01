import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPaymentFormComponent } from './admin-payment-form.component';

describe('AdminPaymentFormComponent', () => {
  let component: AdminPaymentFormComponent;
  let fixture: ComponentFixture<AdminPaymentFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminPaymentFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminPaymentFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
