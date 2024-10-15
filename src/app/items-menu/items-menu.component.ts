import { AfterViewInit, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild ,Renderer2} from '@angular/core';
import { CartItemDto } from '../dtos/CartItemDto';
import { SharedService } from '../service/shared-service';
import * as menuListJsonData from 'src/app/sampleResponse/menu-list.json';
import * as menuCourseCuisineListJsonData from 'src/app/sampleResponse/cuisine-list.json';

@Component({
  selector: 'app-items-menu',
  templateUrl: './items-menu.component.html',
  styleUrls: ['./items-menu.component.scss']
})
export class ItemsMenuComponent implements AfterViewInit,OnInit {
  filteredMenuItems: any;

  constructor(private sharedService: SharedService,private renderer: Renderer2) {}
  showMenu:any  = false
  showCourse:any  = false
  ngOnInit(): void {
    this.populateMenuList();
    
  }
  public loadScript(url: string) {
    let node = document.createElement('script');
    node.src = url;
    node.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(node);
  }


    
  menuListData: any  = menuListJsonData;
  menuCourseCuisineList: any  = menuCourseCuisineListJsonData;
  menuCourseList : any = [];
  menuItemsList: any = [];
  filteredMenuCourseList:any=[];
  menuList:any;
  OriginaldMenuItems:any;
  cartItemDto: CartItemDto = new CartItemDto;
  selectedItem:any;
  quantity: number = 1;
  isCap:any;
  tableNumber:any
  tablePlace:any;
  selectedSize: any;
  ngAfterViewInit() {
     this.isCap = sessionStorage.getItem('isCap');
    this.tableNumber =  sessionStorage.getItem('table' );
    this.tablePlace = sessionStorage.getItem('tablePlace' );

    setTimeout(() => {
      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);
    }, 20);

    setTimeout(() => {
      this.showMenu = this.sharedService.getShowMenuFlagData();
      this.showCourse  = this.sharedService.getShowMenuFlagData();
  
      this.sharedService.getShowMenuFlagDataObservable().subscribe((data) => {
        this.showMenu = data;
        this.showCourse = data;
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
  originalId:any;
  originalName:any
  originalCost:any
  openModal(item: any) {
   
    this.showModal = true;
    this.selectedItem =  { ...item };
    this.quantity =1;
    document.body.style.overflow = 'hidden';
   
    if(item.isSizes)
    {
      this.selectedSize = this.selectedItem.sizes[0];
      this.selectedItem.cost =  this.selectedItem.sizes[0].cost;
      const originalId= this.selectedItem.id
      const originalName = this.selectedItem.name;
      const originalCost = this.selectedItem.cost;
      this.originalId = originalId
      this.originalName = originalName
      this.originalCost = originalCost
      this.selectedItem.id =   parseInt(this.selectedItem.id.toString() + this.selectedItem.sizes[0].id.toString(), 10)
      this.selectedItem.name =   this.selectedItem.name + " - " + this.selectedItem.sizes[0].size
    }

  }
  selectSize(menuItem: any) {
    this.selectedSize = menuItem;
    this.selectedItem.cost =  menuItem.cost;
    this.selectedItem.id =   parseInt(this.originalId.toString() + menuItem.id.toString(), 10)
    this.selectedItem.name =    this.originalName + " - " + menuItem.size
  }
  closeModal() {
    this.showModal = false;
    document.body.style.overflow = 'auto';
    this.selectedItem = undefined;
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
    console.log( course.course.type);
    let value = {
      type:  course.course.type,
      view: true,
      emj: course.course.typemoji,
      class: ".filter-" + course.course.type,
  
    };
    if( value.type == 'Add-ons')
    {
      this.isCap =  sessionStorage.getItem('isCap');
      if(this.isCap )
      {
        this.menuCourseList?.push(value)
     
      }
     
    }else
    {
     
      this.menuCourseList?.push(value)
     
    }
   
    let menuItems = course.course.items
    menuItems.forEach((item: any) => {
      console.log(item.name);
       let menuItem = item;
       menuItem.class = "filter-" +  course.course.type
       menuItem.cuisine= course.course.type,
      this.menuItemsList.push(menuItem);
    })
   
    
  });
  console.log("menuList" + this.menuList);
  console.log("menuItemsList" + this.menuItemsList);
  this.menuItemsList.forEach((element:any) => {

    console.log("name - "+ element.name+ "cost -"+ element.cost )
    
  });
  this.filteredMenuItems =  [...this.menuItemsList]; 
  this.OriginaldMenuItems =  [...this.menuCourseList]; 
  this.filteredMenuCourseList=  [...this.menuCourseList]; 
  if(!this.isCap )
  {
    this.menuCourseCuisineList.cuisines.pop()
  }
  
}

  sendDataToParent(quantity:any) {
 console.log("jkk")
 const cartdata = this.selectedItem 
    this.cartItemDto = cartdata
    this.cartItemDto.quantity = quantity
    this.sharedService.setItemToCartData(this.cartItemDto!);

    this.closeModal(); 

  }

  showVegItems() {
    this.filteredMenuItems =  this.menuItemsList; 
    // Filter and display only veg items
    this.filteredMenuItems = this.menuItemsList.filter((item:any) => item.type === "V");
  }

  showNonVegItems() {
    this.filteredMenuItems =  this.menuItemsList; 
    // Filter and display only non-veg items
    this.filteredMenuItems = this.menuItemsList.filter((item:any) => item.type == "NV");
  }


  showVeg: boolean = false;
  showNonVeg: boolean = false;

  // Function to toggle visibility of vegetarian items
  toggleVegItems() {
    this.showVeg = !this.showVeg;
    if (this.showVeg && this.showNonVeg) {
      this.showNonVeg = false; // Make sure only one type of items is shown at a time
    }
  }

  // Function to toggle visibility of non-vegetarian items
  toggleNonVegItems() {
    this.showNonVeg = !this.showNonVeg;
    if (this.showVeg && this.showNonVeg) {
      this.showVeg = false; // Make sure only one type of items is shown at a time
    }
  }

  @ViewChild('menuContainer') menuContainer!: ElementRef;



  scrollToMenuContainer() {
     if (this.menuContainer) {
       this.menuContainer.nativeElement.scrollIntoView({ behavior: 'smooth' });
       this.moveMenuContainerUp();
     }
  }
  moveMenuContainerUp() {
    if (this.menuContainer) {
      const currentScrollTop = this.menuContainer.nativeElement.scrollTop;
      this.menuContainer.nativeElement.scrollTop = currentScrollTop + 70;
    }
  }

  filterBYcuisine(cuisine:any){
    if(cuisine == "all")
    {
      this.filteredMenuCourseList.forEach((item:any) => {
        item.view = true ;
      }); 
    }
    else 
    {
      this.scrollToElementById()
      this.filteredMenuCourseList =  [...this.OriginaldMenuItems]; 
      let cuisineItems = this.menuCourseCuisineList.cuisines.find((cuisineItem:any) => cuisineItem.cuisine.type === cuisine);
      const filterCourseListByName = this.filterMenuCourseByCuisine(this.filteredMenuCourseList,cuisineItems.cuisine.items);
      this.filteredMenuCourseList = filterCourseListByName
   
      setTimeout(() => {
        this.simulateClick(cuisineItems.cuisine.items[0]);
     
      },1);


    }
    

 
  
   
  }



  filterMenuCourseByCuisine(items: any[], nameList: string[]){
     items.forEach(item => {
      item.view = nameList.includes(item.type) ? false : true;
    
    }); 
    return items;

  }

 
  simulateClick(id:any) {
    const element = document.getElementById(id);
    if (element) {
      element.click();
  
    }
  }
  scrollToElementById(): void {
    const element = document.getElementById("menu-flters");
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  
  }
}
