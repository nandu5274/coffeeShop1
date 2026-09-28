import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { SharedService } from '../service/shared-service';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../service/data.service';
import { HasuraApiService } from '../service/hasura.api.service';
import { BookingForm } from '../dtos/bookingForm';
import { DELIVERY_HOME_BUTTON_ENABLED } from '../common/constanst';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss']
})
export class HomePageComponent implements OnInit, AfterViewInit {

  private hasReloaded = false;
  readonly deliveryHomeButtonEnabled = DELIVERY_HOME_BUTTON_ENABLED;

  constructor(
    private location: Location,
    private sharedService: SharedService,
    private dataService: HasuraApiService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  showMenu:any = this.sharedService.getShowMenuFlagData();
  showSpinner:any = true;
  ngOnInit() {
    setTimeout(() => {
      this.showSpinner = false;
    }, 1000);

    this.route.fragment.subscribe((fragment) => {
      if (fragment) {
        this.scrollToFragment(fragment);
      }
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.showMenu = this.sharedService.getShowMenuFlagData();
  
      this.sharedService.getShowMenuFlagDataObservable().subscribe((data) => {
        this.showMenu = data;
      });

      if (this.route.snapshot.fragment) {
        this.scrollToFragment(this.route.snapshot.fragment);
      }
    }, 150);
  }

  private scrollToFragment(fragment: string) {
    setTimeout(() => {
      const el = document.getElementById(fragment);
      if (el) {
        const header = document.getElementById('header');
        const offset = header ? header.offsetHeight : 0;
        const elementPos = el.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
          top: elementPos - offset,
          behavior: 'smooth'
        });
      }
    }, 250);
  }

  navigateToMenu(menu: any) {
    this.scrollToFragment(menu);
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
