import { AfterViewInit, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild, Renderer2, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CartItemDto } from '../dtos/CartItemDto';
import { SharedService } from '../service/shared-service';
import * as menuListJsonData from 'src/app/sampleResponse/menu-list.json';
import * as menuCourseCuisineListJsonData from 'src/app/sampleResponse/cuisine-list.json';
import { CustomerService } from '../service/customer.service';
import { KUBERA_ACCOUNT_MENU_GRAPHQL_QUERY_API, KUBERA_ACCOUNT_MENU_GRAPHQL_KEY } from '../common/constanst';
import { firstValueFrom, Observable, Subject } from 'rxjs';


@Component({
  selector: 'app-items-menu',
  templateUrl: './items-menu.component.html',
  styleUrls: ['./items-menu.component.scss']
})
export class ItemsMenuComponent implements AfterViewInit, OnInit {
  filteredMenuItems: any;

  constructor(private sharedService: SharedService, private renderer: Renderer2,
    private customerService: CustomerService, private el: ElementRef, private cdRef: ChangeDetectorRef, private http: HttpClient) { }
  showMenu: any = false
  showCourse: any = false
  useRemoteMenuData: boolean = true;
  menuEndpointUrl: string = KUBERA_ACCOUNT_MENU_GRAPHQL_QUERY_API;
  ngOnInit(): void {
    this.useRemoteMenuData = true;
    this.populateMenuList();
    this.sharedService.getIsLoginFlag().subscribe((data) => {
      this.is_login = sessionStorage.getItem('is_login');
      if (data) {
        this.getLoyalPoints();
      }

    })


  }
  public loadScript(url: string) {
    let node = document.createElement('script');
    node.src = url;
    node.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(node);
  }



  menuListData: any = menuListJsonData;
  menuCourseCuisineList: any = menuCourseCuisineListJsonData;
  menuCourseList: any = [];
  menuItemsList: any = [];
  filteredMenuCourseList: any = [];
  menuList: any;
  OriginaldMenuItems: any;
  cartItemDto: CartItemDto = new CartItemDto;
  selectedItem: any;
  quantity: number = 1;
  isCap: any;
  tableNumber: any
  tableCustomerName: any
  tablePlace: any;
  selectedSize: any;
  section: boolean = true;
  loyalty_point: any;
  is_login: any;
  ngAfterViewInit() {
    this.isCap = sessionStorage.getItem('isCap');
    this.tableNumber = sessionStorage.getItem('table');
    this.tablePlace = sessionStorage.getItem('tablePlace');
    this.is_login = sessionStorage.getItem('is_login');
    this.tableCustomerName = sessionStorage.getItem('tableCustomerName');

    if (!this.isCap && this.is_login) {
      this.getLoyalPoints();
    }

  

  }
  handleCustomEvent(event: Event): void {

    // Do your handling logic here
    // Remove the event listener to prevent further execution
    window.removeEventListener('customEvent', this.handleCustomEvent);
  }
  private destroy$ = new Subject<void>();
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Clean up: Remove the event listener when the component is destroyed
    window.removeEventListener('customEvent', this.handleCustomEvent);

  }

  showModal = false;
  originalId: any;
  originalName: any
  originalCost: any
  // openModal(item: any) {

  //   this.showModal = true;
  //   this.selectedItem = { ...item };
  //   this.quantity = 1;
  //   document.body.style.overflow = 'hidden';

  //   if (item.isSizes) {
  //     this.selectedSize = this.selectedItem.sizes[0];
  //     this.selectedItem.cost = this.selectedItem.sizes[0].cost;
  //     const originalId = this.selectedItem.id
  //     const originalName = this.selectedItem.name;
  //     const originalCost = this.selectedItem.cost;
  //     this.originalId = originalId
  //     this.originalName = originalName
  //     this.originalCost = originalCost
  //     this.selectedItem.id = parseInt(this.selectedItem.id.toString() + this.selectedItem.sizes[0].id.toString(), 10)
  //     this.selectedItem.name = this.selectedItem.name + " - " + this.selectedItem.sizes[0].size
  //   }

  // }

openModal(item: any) {

  this.showModal = true;
  this.selectedItem = { ...item };
  this.quantity = 1;
  document.body.style.overflow = 'hidden';
  this.openItem(item);

  // Store original values
  this.originalId = this.selectedItem.id;
  this.originalName = this.selectedItem.name;
  this.originalCost = this.selectedItem.cost;

  /* ===== SIZE LOGIC ===== */
  if (item.isSizes && this.selectedItem.sizes?.length) {

    this.selectedSize = this.selectedItem.sizes[0];

    this.selectedItem.cost = this.selectedSize.cost;

    this.selectedItem.id = parseInt(
      this.originalId.toString() + this.selectedSize.id.toString(),
      10
    );

    this.selectedItem.name =
      this.originalName + " - " + this.selectedSize.size;

    this.originalCost = this.selectedSize.cost;
  }

  /* ===== FLAVOUR DEFAULT ===== */
  if (this.selectedItem.list?.length) {
    this.selectedItem.selectedFlavour = '';
  }

}
openItem(item: any) {

   
this.selectedItem = {
    ...item,
    selectedFlavour: ''   // MUST be empty string
  };

  this.originalCost = item.cost;
  this.originalName = item.name;
  this.originalId = item.id;
  }
originalOrder = (a: any, b: any): number => {
    return 0;
  };


onFlavourChange() {

  // Reset base values
  this.selectedItem.cost = this.originalCost;
  this.selectedItem.name = this.originalName;
  this.selectedItem.id = this.originalId;

  let totalCost = this.originalCost;

  // Apply flavour price
  if (this.selectedItem.selectedFlavour) {

    const flavourName = this.selectedItem.selectedFlavour;

    const flavourPrice =
      this.selectedItem.list?.[flavourName] || 0;

    totalCost += flavourPrice;

    this.selectedItem.name =
      this.originalName + " (" + flavourName + ")";

    // Unique ID for cart
    const timestamp = Date.now();
    this.selectedItem.id = parseInt(
      this.originalId.toString() + timestamp.toString(),
      10
    );
  }

  this.selectedItem.cost = totalCost;
}
  selectSize(menuItem: any) {
    this.selectedSize = menuItem;
    this.selectedItem.cost = menuItem.cost;
    this.selectedItem.id = parseInt(this.originalId.toString() + menuItem.id.toString(), 10)
    this.selectedItem.name = this.originalName + " - " + menuItem.size
  }
  closeModal() {
    this.showModal = false;
    document.body.style.overflow = 'auto';
    this.selectedItem = undefined;
  }

  getLoyalPoints() {
    let customer_details = JSON.parse(sessionStorage.getItem("customer_Details")!);
    this.customerService.getCustomerPointByName(customer_details.customer_detail.name).subscribe(

      (result: any) => {


        if (result.data.kubera_profile_customer_points.length > 0) {
          this.loyalty_point = result.data.kubera_profile_customer_points[0].available_points
        }

      },
      (error: any) => {

        this.loyalty_point = "error"
      })
  }

  increment() {
    this.quantity++;
  }

  decrement() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  async populateMenuList() {
    if (this.useRemoteMenuData && this.menuEndpointUrl) {
      try {
        const result = await firstValueFrom(this.fetchRemoteMenuData());
        this.menuListData = this.normalizeRemoteMenuData(result);
        this.processMenuData(this.menuListData);
      } catch (error: any) {
        console.error('Remote menu fetch failed, falling back to local JSON.', error);
        this.menuListData = menuListJsonData;
        this.processMenuData(this.menuListData);
      }
      return;
    }else{
      
    }

    this.processMenuData(this.menuListData);
  }

  private fetchRemoteMenuData(): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_ACCOUNT_MENU_GRAPHQL_KEY,
    });

    return this.http.get<any>(this.menuEndpointUrl, { headers });
  }

  private normalizeRemoteMenuData(response: any): any {
    if (Array.isArray(response?.menu_json_mv) && response.menu_json_mv.length > 0) {
      return response.menu_json_mv[0]?.menu_json ?? response;
    }
    return response?.menu ? response : response?.data ? response.data : response;
  }

  private processMenuData(menuData: any): void {

    setTimeout(() => {
      this.showMenu = this.sharedService.getShowMenuFlagData();
      this.showCourse = this.sharedService.getShowMenuFlagData();

      this.sharedService.getShowMenuFlagDataObservable().subscribe((data) => {
        this.showMenu = data;
        this.showCourse = data;
      })



    })

      setTimeout(() => {
      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);
    }, 20);


    this.menuList = menuData?.menu ?? menuData;
    if (!Array.isArray(this.menuList)) {
      this.menuList = [];
    }

    this.menuCourseList = [];
    this.menuItemsList = [];
    this.filteredMenuCourseList = [];

    this.menuList.forEach((course: any) => {

      let value = {
        type: course.course.type,
        view: true,
        emj: course.course.typemoji,
        class: ".filter-" + course.course.type,

      };
      if (value.type == 'Add-ons') {
        this.isCap = sessionStorage.getItem('isCap');
        if (this.isCap) {
          this.menuCourseList?.push(value)

        }

      } else {

        this.menuCourseList?.push(value)

      }
      if (value.type == 'Add-ons') {
        this.isCap = sessionStorage.getItem('isCap');
        if (this.isCap) {
         let menuItems = course.course.items
          menuItems.forEach((item: any) => {
            if (!item.available || item.available.toLowerCase() === 'y') {
              let menuItem = item;
              menuItem.class = "filter-" + course.course.type
              menuItem.cuisine = course.course.type;
              this.menuItemsList.push(menuItem);
            }
          })

        }
      }
      else {

        let menuItems = course.course.items
        menuItems.forEach((item: any) => {
          if (!item.available || item.available.toLowerCase() === 'y') {
            let menuItem = item;
            menuItem.class = "filter-" + course.course.type
            menuItem.cuisine = course.course.type;
            this.menuItemsList.push(menuItem);
          }
        })


      }
    


    });
    

    this.filteredMenuItems = [...this.menuItemsList];
    this.OriginaldMenuItems = [...this.menuCourseList];
    this.filteredMenuCourseList = [...this.menuCourseList];
    if (!this.isCap) {
      if (this.menuCourseCuisineList.cuisines) {
        for (let i = this.menuCourseCuisineList.cuisines.length - 1; i >= 0; i--) {

          if (this.menuCourseCuisineList.cuisines[i].cuisine.type?.includes("Add-ons")) {
            this.menuCourseCuisineList.cuisines.splice(i, 1); // Remove the item
          }
        }
      }
    }



  }

  sendDataToParent(quantity: any) {

    const cartdata = this.selectedItem
    this.cartItemDto = cartdata
    this.cartItemDto.quantity = quantity
    this.sharedService.setItemToCartData(this.cartItemDto!);

    this.closeModal();

  }

  showVegItems() {
    this.filteredMenuItems = this.menuItemsList;
    // Filter and display only veg items
    this.filteredMenuItems = this.menuItemsList.filter((item: any) => item.type === "V");
  }

  showNonVegItems() {
    this.filteredMenuItems = this.menuItemsList;
    // Filter and display only non-veg items
    this.filteredMenuItems = this.menuItemsList.filter((item: any) => item.type == "NV");
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

  filterBYcuisine(cuisine: any) {
    if (cuisine == "all") {
      this.filteredMenuCourseList.forEach((item: any) => {
        item.view = true;
      });
    }
    else {
      this.scrollToElementById()
      this.filteredMenuCourseList = [...this.OriginaldMenuItems];
      let cuisineItems = this.menuCourseCuisineList.cuisines.find((cuisineItem: any) => cuisineItem.cuisine.type === cuisine);
      const filterCourseListByName = this.filterMenuCourseByCuisine(this.filteredMenuCourseList, cuisineItems.cuisine.items);
      this.filteredMenuCourseList = filterCourseListByName

      setTimeout(() => {
        this.simulateClick(cuisineItems.cuisine.items[0]);

      }, 1);


    }





  }



  filterMenuCourseByCuisine(items: any[], nameList: string[]) {
    items.forEach(item => {
      item.view = nameList.includes(item.type) ? false : true;

    });
    return items;

  }


  simulateClick(id: any) {
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
  showPointCheckerModal: any = false
  pointsChecker() {
    this.showPointCheckerModal = true
  }

  closePointCheckerModal() {
    this.showPointCheckerModal = false
  }
  searchTerm: string = '';

  onSearchChange(): void {
    this.clickAllItems()

    this.filterMenuCourseByName(this.filteredMenuItems, 'pizza');

  }
  forceRerender() {
    // Force change detection
    this.el.nativeElement.dispatchEvent(new Event('rerender'));
  }
  isSearchEnabled: boolean = false;
  filterMenuCourseByName(items: any[], nameList: string) {
    // Check if the search field is empty or has less than 3 characters
    if (!this.searchTerm.trim() || this.searchTerm.trim().length < 3) {
      this.isSearchEnabled = true;
      if(!this.searchTerm.trim())
      {
        this.resetFilter()
      }
      return;
    }
  
    this.isSearchEnabled = true;
    this.filteredMenuItems = this.menuItemsList.slice(); 
    // Filter menu items based on the search term
    const matchedItems: any[] = [];
    this.filteredMenuItems.forEach((item: any) => {
      if (
        item.name?.toLowerCase().includes(this.searchTerm?.toLowerCase()) &&
        !matchedItems.some(matchedItem => matchedItem.name === item.name)
      ) {
        matchedItems.push(item);
      }
    });
  
    this.filteredMenuItems = matchedItems;
  
    // Dynamically set the height and overflow of the container
    const container = this.el.nativeElement.querySelector('.menu-container');
    if (container) {
      // Calculate height based on the number of items
      const itemHeight = 140; // Approximate height of a single item in pixels
      const totalHeight = this.filteredMenuItems.length * itemHeight;
  
      // Set the calculated height or fallback to 100% if no items
      this.renderer.setStyle(container, 'height', totalHeight > 0 ? `${totalHeight}px` : '100%');
      // Add overflow: auto to handle scrollable content
      this.renderer.setStyle(container, 'overflow-y', totalHeight > 0 ? 'auto' : 'hidden'); 
    }
  }
  
  // Helper function to reset filter state
  resetFilter() {
    this.isSearchEnabled = false;
    
   
  
    this.reinitializeComponent();
  }
  @ViewChild('allItems', { static: false }) allItems!: ElementRef;

  reinitializeComponent() {
    this.filteredMenuItems = this.menuItemsList.slice(); 

    setTimeout(() => {
      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);
    }, 1);
  }

  clickAllItems(): void {
    if (this.allItems) {
      this.allItems.nativeElement.click();
    }
  }
  reloadComponent(): void {
    this.cdRef.detectChanges();

  }
  clearSearch(): void {
    this.searchTerm = '';
    this.onSearchChange(); // Trigger the search change logic, if needed
  }
}
