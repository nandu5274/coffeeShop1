import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CaptainPageComponent } from './captain-page.component';

describe('CaptainPageComponent', () => {
  let component: CaptainPageComponent;
  let fixture: ComponentFixture<CaptainPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CaptainPageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CaptainPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
