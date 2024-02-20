import { Component, ElementRef, HostListener, OnInit, Renderer2, ViewChild } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit  { 
  title = 'cofeeshop1';

  public loadScript(url: string) {
    let node = document.createElement('script');
    node.src = url;
    node.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(node);
  }
    
     hearts: { left: number, duration: number }[] = [];
     @ViewChild('container') container!: ElementRef;
   
     constructor(private renderer: Renderer2) { }
   

     ngOnInit(): void {
      this.loadScript("assets/js/main.js");
      this.generateHearts();
    //  this.openModal('d')
    }
  
    ngAfterViewInit(): void {
      if (this.container) {
        this.scrollToBottom();
      }
    }
  
    generateHearts(): void {
      let counter = 0;
      const intervalId = setInterval(() => {
        if (counter >= 50) {
          clearInterval(intervalId);
          return;
        }
        const newHeart = {
          left: this.getRandomNumber(0, window.innerWidth - 20),
          duration: this.getRandomNumber(3, 7) // Duration in seconds
        };
        this.hearts.push(newHeart);
        this.scrollToBottom();
        counter++;
      }, 500);
    }
  
    scrollToBottom(): void {
      try {
        if (this.container) {
          this.renderer.setProperty(this.container.nativeElement, 'scrollTop', this.container.nativeElement.scrollHeight);
        }
      } catch (err) {
        console.error(err);
      }
    }
  
    getRandomNumber(min: number, max: number): number {
      return Math.random() * (max - min) + min;
    }
  
    @HostListener('window:scroll', ['$event'])
    onScroll(event: any): void {
      this.restartAnimation();
    }
  
    restartAnimation(): void {
      const elements = document.querySelectorAll('.heart');
      elements.forEach((element) => {
        element.classList.remove('animation');
      
        element.classList.add('animation');
      });
    }

   
  showModal = false;

  showOrderModal = false;

  openModal(item: any) {

    this.showModal = true;
this.updateImageBasedOnScreenSize()
    document.body.style.overflow = 'hidden';
  }

  closeModal() {

    this.showModal = false;
    document.body.style.overflow = 'auto';
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.updateImageBasedOnScreenSize();
  }
  imageUrl: string = '';
  updateImageBasedOnScreenSize() {
    const screenWidth = window.innerWidth;
    if (screenWidth < 768) {
      // Set image for small screens
      this.imageUrl = 'assets/img/event/valm.jpg';
    } else {
      // Set image for larger screens
      this.imageUrl = 'assets/img/event/valc.jpg';
    }
  }
  }

