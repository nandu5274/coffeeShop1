import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-cap-selector',
  templateUrl: './cap-selector.component.html',
  styleUrls: ['./cap-selector.component.scss']
})
export class CapSelectorComponent implements OnInit {

   constructor(private router: Router) {}

  ngOnInit(): void {
   this.openPopup();
  }
  loggedIn: any = false;
    showSpinner: Boolean = false;


  showPopup = false;
  selectedStyle: 'normal' | 'counter' | null = null;

  openPopup() {
    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
  }



  chooseStyle(style: 'normal' | 'counter') {
    this.showPopup = false;

    if (style === 'normal') {
      this.router.navigate(['/captain']);
    } else {
      this.router.navigate(['/counter']);
    }
  }
}
