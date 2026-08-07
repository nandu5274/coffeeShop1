import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { SharedService } from '../service/shared-service';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../service/data.service';
import { HasuraApiService } from '../service/hasura.api.service';
import { BookingForm } from '../dtos/bookingForm';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss']
})
export class HomePageComponent implements OnInit, AfterViewInit {

  private hasReloaded = false;
  constructor(
    private location: Location,
    private sharedService: SharedService,
    private dataService: HasuraApiService,
    private router: Router
  ) { }

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

  navigateToDelivery() {
    sessionStorage.setItem('order_mode', 'delivery');
    this.router.navigate(['/delivery']);
  }


  bookingForm: BookingForm = {
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    people: 1,
    message: ''
  };

}
