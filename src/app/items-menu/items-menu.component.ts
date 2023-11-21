import { AfterViewInit, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CartItemDto } from '../dtos/CartItemDto';
import { SharedService } from '../service/shared-service';
import * as menuListJsonData from 'src/app/sampleResponse/menu-list.json';
@Component({
  selector: 'app-items-menu',
  templateUrl: './items-menu.component.html',
  styleUrls: ['./items-menu.component.scss']
})
export class ItemsMenuComponent implements AfterViewInit,OnInit {

  constructor(private sharedService: SharedService) {}
  showMenu:any  = false
  ngOnInit(): void {
    this.populateMenuList();
  }
  menuListData: any  = menuListJsonData;
  menuCourseList : any = [];
  menuItemsList: any = [];
  menuList:any;
  cartItemDto: CartItemDto = new CartItemDto;
  selectedItem:any;
  quantity: number = 1;
  ngAfterViewInit() {
    setTimeout(() => {
      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);
    }, 20);

    setTimeout(() => {
      this.showMenu = this.sharedService.getShowMenuFlagData();
  
      this.sharedService.getShowMenuFlagDataObservable().subscribe((data) => {
        this.showMenu = data;
      })
  
    })
  }
  handleCustomEvent(event: Event): void {
    console.log('Handling customEvent in AppComponent');
    // Do your handling logic here
    // Remove the event listener to prevent further execution
    window.removeEventListener('customEvent', this.handleCustomEvent);
  }

  ngOnDestroy(): void {
    // Clean up: Remove the event listener when the component is destroyed
    window.removeEventListener('customEvent', this.handleCustomEvent);
  }

  showModal = false;

  openModal(item: any) {
    
    this.showModal = true;
    this.selectedItem = item;
    this.quantity =1;
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
  
    this.showModal = false;
    this.selectedItem = undefined;
    document.body.style.overflow = 'auto';
  }



  increment() {
    this.quantity++;
  }

  decrement() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

populateMenuList()
{

  this.menuList = this.menuListData.menu;
  this.menuList.forEach((course: any) => {
    let value = {
      type:  course.course.type,
      class: ".filter-" + course.course.type,
  
    };
    this.menuCourseList?.push(value)
    let menuItems = course.course.items
    menuItems.forEach((item: any) => {
       let menuItem = item;
       menuItem.class = "filter-" +  course.course.type
      this.menuItemsList.push(menuItem);
    })
   
    
  });
  console.log("menuList" + this.menuList);
  console.log("menuItemsList" + this.menuItemsList);
}

  sendDataToParent(quantity:any) {
   
    this.cartItemDto = this.selectedItem 
    this.cartItemDto.quantity = quantity
    this.sharedService.setItemToCartData(this.cartItemDto!);
    this.closeModal(); 
  }


}
