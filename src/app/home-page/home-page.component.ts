import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { SharedService } from '../service/shared-service';
@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss']
})
export class HomePageComponent implements OnInit , AfterViewInit{

  private hasReloaded = false;
  constructor(private location: Location, private sharedService: SharedService) { }
 


ngOnInit(){

}
ngAfterViewInit() {

}

navigateToMenu(menu:any)
{
this.sharedService.navigateToMenu(menu);
}

}
