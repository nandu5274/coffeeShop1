import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosKotComponent } from './pos-kot.component';

describe('PosKotComponent', () => {
  let component: PosKotComponent;
  let fixture: ComponentFixture<PosKotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PosKotComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosKotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
