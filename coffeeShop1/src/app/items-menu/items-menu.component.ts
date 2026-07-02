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
  activeCuisine: string = 'all';
  activeCategory: string = 'all';
  activeVegFilter: 'all' | 'veg' | 'non-veg' = 'all';
  isLoading: boolean = false;

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
  menuCourseCuisineList: any = JSON.parse(JSON.stringify(menuCourseCuisineListJsonData));
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
    this.isLoading = true;
    if (this.useRemoteMenuData && this.menuEndpointUrl) {
      try {
        const result = await firstValueFrom(this.fetchRemoteMenuData());
        this.menuListData = this.normalizeRemoteMenuData(result);
        this.processMenuData(this.menuListData);
      } catch (error: any) {
        console.error('Remote menu fetch failed, falling back to local JSON.', error);
        this.menuListData = menuListJsonData;
        this.processMenuData(this.menuListData);
      } finally {
        this.isLoading = false;
      }
      return;
    }

    this.processMenuData(this.menuListData);
    this.isLoading = false;
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
    if (!this.isCap) {
      if (this.menuCourseCuisineList.cuisines) {
        for (let i = this.menuCourseCuisineList.cuisines.length - 1; i >= 0; i--) {

          if (this.menuCourseCuisineList.cuisines[i].cuisine.type?.includes("Add-ons")) {
            this.menuCourseCuisineList.cuisines.splice(i, 1); // Remove the item
          }
        }
      }
    }

    // Filter out cuisines that have no available items
    if (this.menuCourseCuisineList.cuisines) {
      this.menuCourseCuisineList.cuisines = this.menuCourseCuisineList.cuisines.filter((c: any) => {
        const allowedCourses = c.cuisine.items || [];
        return this.menuItemsList.some((item: any) => allowedCourses.includes(item.cuisine));
      });
    }

    // Initialize our new filtering variables (Default to first cuisine instead of 'all')
    this.activeVegFilter = 'all';
    if (this.menuCourseCuisineList.cuisines && this.menuCourseCuisineList.cuisines.length > 0) {
      this.selectCuisine(this.menuCourseCuisineList.cuisines[0].cuisine.type);
    } else {
      this.activeCuisine = 'all';
      this.activeCategory = 'all';
      this.filteredMenuCourseList = [];
      this.applyFilters();
    }
  }

  sendDataToParent(quantity: any) {

    const cartdata = this.selectedItem
    this.cartItemDto = cartdata
    this.cartItemDto.quantity = quantity
    this.sharedService.setItemToCartData(this.cartItemDto!);

    this.closeModal();

  }

  activeVegFiltered() {
    return this.activeVegFilter;
  }

  toggleVegOnly() {
    this.activeVegFilter = this.activeVegFilter === 'veg' ? 'all' : 'veg';
    this.applyFilters();
  }

  setVegFilter(filter: 'all' | 'veg' | 'non-veg') {
    this.activeVegFilter = filter;
    this.applyFilters();
  }

  applyFilters() {
    let items = [...this.menuItemsList];

    // 1. Filter by Cuisine and Category (only if search is empty or less than 3 chars)
    if (!this.searchTerm.trim() || this.searchTerm.trim().length < 3) {
      this.isSearchEnabled = false;
      
      if (this.activeCuisine !== 'all') {
        // Filter by Cuisine
        const cuisineItem = this.menuCourseCuisineList.cuisines.find(
          (c: any) => c.cuisine.type === this.activeCuisine
        );
        if (cuisineItem) {
          const allowedCourses = cuisineItem.cuisine.items;
          
          if (this.activeCategory !== 'all') {
            // Filter by specific sub-category (course)
            items = items.filter((item: any) => item.cuisine === this.activeCategory);
          } else {
            // Filter by all sub-categories under this cuisine
            items = items.filter((item: any) => allowedCourses.includes(item.cuisine));
          }
        }
      }
    } else {
      // Filter by search query (bypasses category filters)
      this.isSearchEnabled = true;
      const query = this.searchTerm.toLowerCase().trim();
      items = items.filter((item: any) => 
        item.name?.toLowerCase().includes(query) ||
        (item.desc && item.desc.toLowerCase().includes(query))
      );
    }

    // 2. Filter by Veg / Non-Veg
    if (this.activeVegFilter === 'veg') {
      items = items.filter((item: any) => {
        const type = (item.type || '').toLowerCase();
        return type === 'v' || type === 'veg';
      });
    } else if (this.activeVegFilter === 'non-veg') {
      items = items.filter((item: any) => {
        const type = (item.type || '').toLowerCase();
        return type === 'nv' || type === 'nonveg' || type === 'non-veg';
      });
    }

    this.filteredMenuItems = items;
  }

  selectCuisine(cuisine: string) {
    this.activeCuisine = cuisine;
    // this.scrollToElementById();

    if (cuisine === 'all') {
      this.activeCategory = 'all';
      this.filteredMenuCourseList = [];
    } else {
      const cuisineItem = this.menuCourseCuisineList.cuisines.find(
        (c: any) => c.cuisine.type === cuisine
      );
      if (cuisineItem) {
        const allowedCourses = cuisineItem.cuisine.items;
        // Filter menu courses to show only sub-categories belonging to this cuisine
        this.filteredMenuCourseList = this.menuCourseList.filter((course: any) =>
          allowedCourses.includes(course.type)
        );
        // Default to the first category under this cuisine
        if (this.filteredMenuCourseList.length > 0) {
          this.activeCategory = this.filteredMenuCourseList[0].type;
        } else {
          this.activeCategory = 'all';
        }
      } else {
        this.filteredMenuCourseList = [];
        this.activeCategory = 'all';
      }
    }
    this.applyFilters();
  }

  selectCategory(category: string) {
    this.activeCategory = category;
    this.applyFilters();
  }

  @ViewChild('menuContainer') menuContainer!: ElementRef;

  scrollToMenuContainer() {
    if (this.menuContainer) {
      this.menuContainer.nativeElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  scrollToElementById(): void {
    const element = document.getElementById("cuisine-filters-v2");
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  showPointCheckerModal: any = false;
  pointsChecker() {
    this.showPointCheckerModal = true;
  }

  closePointCheckerModal() {
    this.showPointCheckerModal = false;
  }

  searchTerm: string = '';

  onSearchChange(): void {
    this.applyFilters();
  }

  forceRerender() {
    this.el.nativeElement.dispatchEvent(new Event('rerender'));
  }

  isSearchEnabled: boolean = false;

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  reloadComponent(): void {
    this.cdRef.detectChanges();
  }
}
