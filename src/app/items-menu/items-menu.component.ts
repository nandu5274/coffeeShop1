import { AfterViewInit, Component } from '@angular/core';

@Component({
  selector: 'app-items-menu',
  templateUrl: './items-menu.component.html',
  styleUrls: ['./items-menu.component.scss']
})
export class ItemsMenuComponent implements AfterViewInit {

  ngAfterViewInit() {
    setTimeout(() => {
      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);
    }, 20);
  }
  handleCustomEvent(event: Event): void {
    console.log('Handling customEvent in AppComponent');
    // Do your handling logic here
    // Remove the event listener to prevent further execution
    window.removeEventListener('customEvent', this.handleCustomEvent);
  }

  ngOnDestroy(): void {
    // Clean up: Remove the event listener when the component is destroyed
    window.removeEventListener('customEvent', this.handleCustomEvent);
  }

  showModal = false;

  openModal() {
    document.body.style.overflow = 'hidden';
    this.showModal = true;
  }

  closeModal() {
    document.body.style.overflow = 'auto';
    this.showModal = false;
  }

  quantity: number = 1;

  increment() {
    this.quantity++;
  }

  decrement() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }
}
