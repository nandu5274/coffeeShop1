import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosInvoiceComponent } from './pos-invoice.component';

describe('PosInvoiceComponent', () => {
  let component: PosInvoiceComponent;
  let fixture: ComponentFixture<PosInvoiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PosInvoiceComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosInvoiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
