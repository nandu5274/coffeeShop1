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
ngOnInit(){
  
  this.loadScript("assets/js/main.js");
}
navigateToMenu(nav:any) {
  if(nav=='menu')
  {
    
    this.router.navigate(['/' + nav], { fragment: nav });
  }
  else{
    this.router.navigate(['/'], { fragment: nav });
  }

}

}
