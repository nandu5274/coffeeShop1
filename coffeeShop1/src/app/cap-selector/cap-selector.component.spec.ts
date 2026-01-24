import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CapSelectorComponent } from './cap-selector.component';

describe('CapSelectorComponent', () => {
  let component: CapSelectorComponent;
  let fixture: ComponentFixture<CapSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CapSelectorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CapSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
