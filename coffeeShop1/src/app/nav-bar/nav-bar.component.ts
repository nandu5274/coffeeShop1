import { Component, HostListener, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ResponseDto } from '../dtos/responseDto';
import { isCustomerDeliveryUrl } from '../common/constanst';
import { DeliveryLocationService } from '../service/delivery-location.service';
import { SharedService } from '../service/shared-service';
import { WebSocketService } from '../service/WebSocket.service';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss']
})
export class NavBarComponent implements OnInit, OnDestroy  {


  public loadScript(url: string) {
    let node = document.createElement('script');
    node.src = url;
    node.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(node);
}
constructor(
  private router: Router,
  private route: ActivatedRoute,
  private sharedService: SharedService,
  private deliveryLocation: DeliveryLocationService,
  private webSocketService: WebSocketService,
  private cdr: ChangeDetectorRef
) {}


isMenuActive: boolean = false; // Set it to true to make it initially active
cartCount: number = 0;
isOtherItemsActive:boolean = false; 
orderProcessingStatus:any='';
response!:ResponseDto;
previousUrl:any;
isCap:any;
showSpinner:Boolean = false
showMenu:boolean = false
showCustomerLoginModal:boolean=false;
diable_login_btn:boolean=false;
showCartIcon = false;

isSettingsOpen: boolean = false;
fontSizePercent: number = 100;
themeMode: string = 'dark';

showDeliveryLoc = false;
showDeliverySubheader = false;
subheaderScrolled = false;
deliveryAddressShort = '';
deliveryAddressText = '';
private subs: Subscription[] = [];

ngOnInit(){
  const savedFontSize = localStorage.getItem('app-font-size-percent');
  if (savedFontSize) {
    this.fontSizePercent = parseInt(savedFontSize, 10);
    this.applyFontSize(this.fontSizePercent);
  } else {
    this.fontSizePercent = 100;
  }

  const savedTheme = localStorage.getItem('app-theme-mode');
  if (savedTheme) {
    this.themeMode = savedTheme;
    this.applyThemeMode(this.themeMode);
  } else {
    this.themeMode = 'dark';
    this.applyThemeMode(this.themeMode);
  }

  const sessionCartDataList = sessionStorage.getItem('cartDataList');

  if (sessionCartDataList) {
      this.cartCount = this.sharedService.readCartQtyFromSession();
  }
  this.refreshCartIconVisibility();
  this.previousUrl = sessionStorage.getItem("previousUrl");
 // this.loadScript("assets/js/main.js");

 setTimeout(() => {
  sessionStorage.removeItem('table');
  sessionStorage.removeItem('tableSet');
  this.showMenu =false;
  this.sharedService.setShowMenuFlag(false);
  const currentUrl =  this.router.url;
 console.log('Current URL:', currentUrl);
 if(currentUrl.includes('menu'))
 {
  this.navigateToMenu('hero');
 }
}, 20 * 60 * 1000);  // 20 minutes in milliseconds

 this.route.queryParams.subscribe((queryParams: any) => {
  this.showSpinner = true
  // Access arbitrary query parameters from the URL
  const param1 = queryParams['table'];
  const tableSet = sessionStorage.getItem('tableSet')
  // Use the parameters in your component logic
  if (param1 != undefined) {
      sessionStorage.setItem('table', param1);
      sessionStorage.setItem('tableSet', '1');
      this.navigateToMenu('hero');
  }else if(tableSet=='1')
  {
      this.showMenu = true;
      this.sharedService.setShowMenuFlag(true);
  }else{
    sessionStorage.removeItem('table');
    this.showMenu = false;
  }
  this.refreshCartIconVisibility();
  this.showSpinner = false
});


this.webSocketService.getMessageSubject().subscribe((event) => {
  // Handle incoming WebSocket messages here
  const message = event.data;
  this.triggerPopupMessage(message)
  console.log("message", message)

});
let localStorageData = sessionStorage.getItem("is_login");


this.isCap =  sessionStorage.getItem('isCap');
if(this.isCap )
{
  this.diable_login_btn=true

}
else
{
  this.diable_login_btn=false

if (localStorageData) {
  let isLoggedIn = localStorageData === "true";

  if(isLoggedIn)
  {
    this.onCustomerLogin(isLoggedIn)
  }

}
}

this.sharedService.getOpenCustomerLoginObservable().subscribe(() => {
  this.openCustomerLoginModal();
});

this.subs.push(
  this.sharedService.getOpenCartObservable().subscribe(() => {
    if (!this.showModal) {
      this.toggleModal();
    }
  }),
  this.sharedService.getCartCountObservable().subscribe((count) => {
    this.cartCount = count;
    this.refreshCartIconVisibility();
    this.cdr.markForCheck();
  }),
  this.sharedService.getShowMenuFlagDataObservable().subscribe((flag) => {
    this.showMenu = !!flag;
    this.refreshCartIconVisibility();
  })
);

this.refreshDeliveryLocChip();
this.subs.push(
  this.deliveryLocation.selected$.subscribe(() => this.refreshDeliveryLocChip()),
  this.sharedService.getIsLoginFlag().subscribe(() => this.refreshDeliveryLocChip()),
  this.router.events
    .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
    .subscribe(() => {
      this.refreshDeliveryLocChip();
      this.refreshCartIconVisibility();
    })
);

}

ngOnDestroy(): void {
  this.subs.forEach((s) => s.unsubscribe());
  document.body.classList.remove('has-delivery-subheader');
}

refreshCartIconVisibility(): void {
  const deliveryMode = sessionStorage.getItem('order_mode') === 'delivery';
  const onDeliveryFlow =
    deliveryMode ||
    isCustomerDeliveryUrl(this.router.url) ||
    this.router.url.includes('/menu');
  this.showCartIcon = !!(this.cartCount > 0 && (this.showMenu || onDeliveryFlow));
}

refreshDeliveryLocChip(): void {
  const deliveryMode = sessionStorage.getItem('order_mode') === 'delivery';
  const onDeliveryFlow =
    deliveryMode ||
    isCustomerDeliveryUrl(this.router.url) ||
    (this.router.url.includes('/menu') && deliveryMode);
  const loggedIn = sessionStorage.getItem('is_login') === 'true';
  const sel = this.deliveryLocation.getSelected();
  this.showDeliveryLoc = !!(loggedIn && onDeliveryFlow);
  this.showDeliverySubheader = this.showDeliveryLoc;
  this.deliveryAddressText = sel?.text || '';
  this.deliveryAddressShort = sel
    ? this.deliveryLocation.shortLabel(sel.label || sel.text)
    : 'Select address';
  document.body.classList.toggle('has-delivery-subheader', this.showDeliverySubheader);
  this.cdr.markForCheck();
}

goDeliveryAddresses(): void {
  sessionStorage.setItem('order_mode', 'delivery');
  this.router.navigate(['/delivery/addresses']);
}


triggerPopupMessage(mesg: any) {
 
//this.addInfoMessage(mesg);
}


navigateToMenu(nav:any) {
  
  if(nav=='menu')
  {
    this.isMenuActive = true
    this.router.navigate(['/' + nav], { fragment: nav });
   const elements = document.querySelectorAll(`[href="#hero"], [href="#about"], [href="#specials"], [href="#events"], [href="#chefs"], [href="#gallery"], [href="#contact"]`);
   elements.forEach((element) => {
    element.classList.remove('active');
  });
  this.previousUrl = sessionStorage.getItem("previousUrl");
  sessionStorage.setItem("previousUrl", nav);
  }
  else if(sessionStorage.getItem("previousUrl") == 'menu'){
    this.isMenuActive = false
    this.router.navigate(['/'], { fragment: nav }) .then(() => {
      window.location.reload();
    });
    this.previousUrl = sessionStorage.getItem("previousUrl");
  
    sessionStorage.setItem("previousUrl", nav);
  }else
  {
    this.isMenuActive = false
    this.router.navigate(['/'], { fragment: nav })
    this.previousUrl = sessionStorage.getItem("previousUrl");
  
    sessionStorage.setItem("previousUrl", nav);
  }
}

navigateToDashboard() {
  this.isMenuActive = false;
  this.router.navigate(['/dashboard']);
  sessionStorage.setItem("previousUrl", "dashboard");
}

showModal: boolean = false;


toggleModal(): void {
  this.showModal = !this.showModal;
  this.toggleBodyScroll(this.showModal);
  this.cdr.detectChanges();
}

@HostListener('window:keyup.esc')
onEscKeyup() {
  if (this.showModal) {
    this.toggleModal();
  }
}

private toggleBodyScroll(shouldEnable: boolean): void {
  const body = document.body;
  if (shouldEnable) {
    body.classList.add('right-modal-open');
  } else {
    body.classList.remove('right-modal-open');
  }
}

updateCartCount(cartCount:any)
{
  this.cartCount = Number(cartCount) || 0;
  this.refreshCartIconVisibility();
}


captureOrderProcessingStatus(status:any)
{
  this.orderProcessingStatus = status
}

captureOrderProcessingResponse(response:any)
{
this.response = response;
}



infoMessage: string | null = null;

// Display info alert message
showInfoMessage(msg:any): void {
  this.infoMessage = msg;
}



infoMessages: string[] = [];
pageType:any = "cap"

  addInfoMessage(message: string): void {
    this.infoMessage = message;
    this.infoMessages.push(message);
  }

  closeInfoMessage(index: number): void {
    this.infoMessage = null;
    this.infoMessages.splice(index, 1);
  }
  openCustomerLoginModal()
  {
    this.showCustomerLoginModal=true;
  }
  closeModal()
  {
    this.showCustomerLoginModal = false;
  }
  
  isLoggedIn: boolean = false;
  userInitial: string = ''; // First letter of the user's name
  customerName:string = ''; 
  // Example login success handler
  onLoginSuccess(userName: string) {
    this.isLoggedIn = true;
    this.userInitial = userName.charAt(0).toUpperCase();
    this.customerName = userName
  }
  
  // Example signout handler
  onSignOut() {
    this.isLoggedIn = false;
    this.userInitial = '';
    sessionStorage.removeItem('customer_Details')
    sessionStorage.removeItem('is_login')
    sessionStorage.removeItem('customer_number')
    this.deliveryLocation.clear();
    this.sharedService.setIsLoginFlag(false);
    this.refreshDeliveryLocChip();
  }
  isDropdownOpen: boolean = false;

toggleDropdown() {
  this.isDropdownOpen = !this.isDropdownOpen;
}
onCustomerLogin(login_status: any) {
  console.log('User logged in:', login_status);
  this.closeModal()
  
  let customer_details = JSON.parse(sessionStorage.getItem("customer_Details")!);

  this.onLoginSuccess(customer_details.customer_detail.name);
  const customerId = customer_details?.customer_detail?.id;
  if (
    customerId &&
    sessionStorage.getItem('order_mode') === 'delivery' &&
    !this.deliveryLocation.getSelected()
  ) {
    this.deliveryLocation.autoSelectNearest(customerId);
  }
  this.refreshDeliveryLocChip();
}


navigateToProfile(){
let customer_details = JSON.parse(sessionStorage.getItem("customer_Details")!);
this.router.navigate(['/profile'], { queryParams: { data: btoa(customer_details.customer_detail.mobile_number) } });

}

toggleSettingsDropdown(event: Event) {
  event.stopPropagation();
  this.isSettingsOpen = !this.isSettingsOpen;
}

resetFontSize(event: Event) {
  event.stopPropagation();
  this.fontSizePercent = 100;
  localStorage.setItem('app-font-size-percent', '100');
  this.applyFontSize(100);
}

onFontSizeChange(event: any) {
  this.fontSizePercent = parseInt(event.target.value, 10);
  localStorage.setItem('app-font-size-percent', String(this.fontSizePercent));
  this.applyFontSize(this.fontSizePercent);
}

applyFontSize(percent: number) {
  const zoomVal = percent / 100;
  (document.body.style as any).zoom = String(zoomVal);
}

setThemeMode(theme: string) {
  this.themeMode = theme;
  localStorage.setItem('app-theme-mode', theme);
  this.applyThemeMode(theme);
}

applyThemeMode(theme: string) {
  const body = document.body;
  if (theme === 'light') {
    body.classList.add('light-mode');
    body.classList.remove('dark-mode');
  } else {
    body.classList.add('dark-mode');
    body.classList.remove('light-mode');
  }
}

@HostListener('document:click', ['$event'])
onDocumentClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (this.isSettingsOpen && !target.closest('.settings-dropdown')) {
    this.isSettingsOpen = false;
  }
  if (this.isDropdownOpen && !target.closest('.user-dropdown')) {
    this.isDropdownOpen = false;
  }
}

@HostListener('window:scroll')
onWindowScroll(): void {
  this.subheaderScrolled = window.scrollY > 8;
}
}
