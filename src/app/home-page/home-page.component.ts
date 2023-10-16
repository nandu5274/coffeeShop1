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
  if (!this.hasReloaded) {
    this.reloadPage();
    this.hasReloaded = true; // Set the flag to true to prevent further reloads
  }

  window.addEventListener('load', (event: Event) => {
    console.log('Handling customEvent in AppComponent');

    // You can stop the propagation here if needed
    event.stopPropagation();

    // Do your handling logic
  });
}
ngAfterViewInit() {
  setTimeout(() => {
    const loadEvent = new Event('load');
    window.dispatchEvent(loadEvent);
  }, 20);
 
}
reloadPage(): void {
  // Use the location service to reload the current page
 // window.location.reload();
 
}
}
