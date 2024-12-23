import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembershipCreateComponent } from './membership-create.component';

describe('MembershipCreateComponent', () => {
  let component: MembershipCreateComponent;
  let fixture: ComponentFixture<MembershipCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MembershipCreateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MembershipCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
