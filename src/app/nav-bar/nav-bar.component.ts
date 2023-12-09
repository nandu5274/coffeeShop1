import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ResponseDto } from '../dtos/responseDto';
import { SharedService } from '../service/shared-service';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss']
})
export class NavBarComponent implements OnInit  {


  public loadScript(url: string) {
    let node = document.createElement('script');
    node.src = url;
    node.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(node);
}
constructor(private router: Router,  private route: ActivatedRoute, private sharedService:SharedService) {}


isMenuActive: boolean = false; // Set it to true to make it initially active
cartCount:any;
isOtherItemsActive:boolean = false; 
orderProcessingStatus:any='';
response!:ResponseDto;
previousUrl:any;
showSpinner:Boolean = false
showMenu:boolean = false
ngOnInit(){
  const sessionCartDataList = sessionStorage.getItem('cartDataList');

  if (sessionCartDataList) {
    let cartDataList = JSON.parse(atob(sessionStorage.getItem("cartDataList")!));
      this.cartCount =  cartDataList.length;
  }
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
  this.showSpinner = false
});
}

navigateToMenu(nav:any) {
  
  if(nav=='menu')
  {
    this.isMenuActive = true
    this.router.navigate(['/' + nav], { fragment: nav });
   const elements = document.querySelectorAll(`[href="#hero"], [href="#about"], [href="#specials"], [href="#events"], [href="#chefs"], [href="#gallery"]`);
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

showModal: boolean = false;



toggleModal(): void {
  this.showModal = !this.showModal;
  this.toggleBodyScroll(this.showModal);
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
  this.cartCount = cartCount;
}


captureOrderProcessingStatus(status:any)
{
  this.orderProcessingStatus = status
}

captureOrderProcessingResponse(response:any)
{
this.response = response;
}
}
