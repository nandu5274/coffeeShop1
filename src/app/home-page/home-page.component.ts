import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss']
})
export class HomePageComponent implements OnInit , AfterViewInit{

  private hasReloaded = false;
  constructor(private location: Location) { }
ngOnInit(){

}
ngAfterViewInit() {

}

}
