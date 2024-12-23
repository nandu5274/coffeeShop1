import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerAvailableCheckerComponent } from './customer-available-checker.component';

describe('CustomerAvailableCheckerComponent', () => {
  let component: CustomerAvailableCheckerComponent;
  let fixture: ComponentFixture<CustomerAvailableCheckerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CustomerAvailableCheckerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomerAvailableCheckerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
