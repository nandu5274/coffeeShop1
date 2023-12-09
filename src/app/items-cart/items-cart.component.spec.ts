import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemsCartComponent } from './items-cart.component';

describe('ItemsCartComponent', () => {
  let component: ItemsCartComponent;
  let fixture: ComponentFixture<ItemsCartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ItemsCartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemsCartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
