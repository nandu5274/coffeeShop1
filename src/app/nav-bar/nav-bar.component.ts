import { Component, OnInit } from '@angular/core';
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

isOtherItemsActive:boolean = false; 


ngOnInit(){
  
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
  }
  else{
    this.isMenuActive = false
    this.router.navigate(['/'], { fragment: nav });
  }

}

}
