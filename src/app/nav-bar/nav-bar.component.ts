import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';

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
constructor(private router: Router) {}


isMenuActive: boolean = false; // Set it to true to make it initially active
cartCount:any;
isOtherItemsActive:boolean = false; 

previousUrl:any;

ngOnInit(){
  const sessionCartDataList = sessionStorage.getItem('cartDataList');

  if (sessionCartDataList) {
    let cartDataList = JSON.parse(sessionStorage.getItem("cartDataList")!);
      this.cartCount =  cartDataList.length;
  }
  this.previousUrl = sessionStorage.getItem("previousUrl");
 // this.loadScript("assets/js/main.js");
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
}
