import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { SharedService } from '../service/shared-service';
import { ActivatedRoute } from '@angular/router';
@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss']
})
export class HomePageComponent implements OnInit, AfterViewInit {

  private hasReloaded = false;
  constructor(private location: Location, private sharedService: SharedService) { }

  showMenu:any = this.sharedService.getShowMenuFlagData();
  showSpinner:any = true;
  ngOnInit() {
    setTimeout(() => {
      this.showSpinner = false
    }, 1000); // 5 minutes in milliseconds

  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.showMenu = this.sharedService.getShowMenuFlagData();
  
      this.sharedService.getShowMenuFlagDataObservable().subscribe((data) => {
        this.showMenu = data;
      })
  
    })


  }

  navigateToMenu(menu: any) {
    this.sharedService.navigateToMenu(menu);
  }

}
