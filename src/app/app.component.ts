import { trigger, transition, style, animate } from '@angular/animations';

import { Component, ElementRef, HostListener, OnInit, Renderer2, ViewChild } from '@angular/core';
import {VERSION} from './common/constanst';
import { HasuraApiService } from './service/hasura.api.service';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-in', style({ transform: 'translateX(0%)' }))
      ]),
    
    ])
  ]
})
export class AppComponent implements OnInit  { 
  title = 'cofeeshop1';
  version:any = VERSION;
  private sound: Howl;
  public loadScript(url: string) {
    let node = document.createElement('script');
    node.src = url;
    node.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(node);
  }
    
     hearts: { left: number, duration: number }[] = [];
     @ViewChild('container') container!: ElementRef;
   
     constructor(private renderer: Renderer2,  private dataService: HasuraApiService) { 
      this.sound = new Howl({
        src: ['assets/audio/ipl.mp3'],
      });

     }
   


     playSound() {
      this.sound.play();
    }
  


     ngOnInit(): void {
      this.loadScript("assets/js/main.js");
      this.generateHearts();
      this.getLatestVersion()
    //  this.openModal('d')

//below code is for popups 

   /* 
   this.playSound();
    this.updateImageBasedOnScreenSize();
*/
//above code is for popups 
    }
  
    ngAfterViewInit(): void {
      if (this.container) {
        this.scrollToBottom();
      }
    
    }

    getLatestVersion()
    {
      this.dataService.getLatestVersion().subscribe((response) => {
        // Handle the response here
        const versionNumber = response.kubera_Account_ui_version[0].verison;
        console.log("API version - ",versionNumber); 
        console.log("UI version - ",this.version); // Example: log the response
      this.checkVersion(versionNumber)
      },
      (error) => {
        // Handle errors here
        console.error(error);
      });
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

   
  showModal = true;

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
      this.imageUrl = 'assets/img/event/ipl.jpg';
    } else {
      // Set image for larger screens
      this.imageUrl = 'assets/img/event/iplc.jpg';
    }
  }
  showPopup: boolean = false;
  step: number = 0; // Introduce a new step
  name: string = '';
  mobile: string = '';
  selectedOption: string = '';
  wheelResult: number | null = null;

  openPopup() {
    this.showPopup = true;
  }

  continue() {
if (this.step === 0) {
      // Move to the next step after accepting the disclaimer
      this.step = 1;
    } else if (this.name !== '' && this.mobile !== '') {
      // Proceed to the next step after entering name and mobile
      this.step = 2;
    } else {
      alert('Please enter name and mobile.');
    }
  }

  next() {
    if (this.selectedOption !== '') {
      if (this.selectedOption === 'Option 1') {
        this.step = 3;
      } else {
        // Handle other options if needed
      }
    } else {
      alert('Please select an option.');
    }
  }

  spinWheel() {
    this.wheelResult = Math.floor(Math.random() * 5) + 1;
  }

  reset() {
    this.name = '';
    this.mobile = '';
    this.selectedOption = '';
    this.wheelResult = null;
    this.step = 0; // Reset to the disclaimer step
    this.showPopup = false;
  }
  showVersionModal:any = false
  checkVersion(api_version:any)
  {
    if(this.version === api_version)
    {
      sessionStorage.setItem("reloadCount","0")
      console.log("latest version");
      this.showVersionModal = false
    }else
    {
      this.showVersionModal = true
      console.log("old version");
      setTimeout(() => {
        this.reloadMultipleTimes()
     
      },100);
   
    }
  }



  reloadCount = 0;
  maxReloads = 1;
  reloadMultipleTimes() {
    const reloadCountCon = sessionStorage.getItem('reloadCount');

    if (reloadCountCon) {
      this.reloadCount = Number(reloadCountCon)
      if (this.reloadCount < this.maxReloads) {
        this.reloadCount++;
        console.log("retry - ",this.reloadCount)
        sessionStorage.setItem("reloadCount",String(this.reloadCount))
       // window.location.reload();
  
      }
    }else{
      sessionStorage.setItem("reloadCount","1")
      window.location.reload();
    }

  }
}



  

