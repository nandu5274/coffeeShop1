import { AfterViewInit, Component } from '@angular/core';
import { WebSocketService } from '../service/WebSocket.service';

@Component({
  selector: 'app-captain-page',
  templateUrl: './captain-page.component.html',
  styleUrls: ['./captain-page.component.scss']
})
export class CaptainPageComponent implements AfterViewInit {
  messages: string[] = [];
  popmessgae:any = ""
  constructor(private webSocketService: WebSocketService) {  this.initializePushNotifications();}

  ngOnInit() {
   
    this.webSocketService.getMessageSubject().subscribe((event) => {
      // Handle incoming WebSocket messages here
      const message = event.data;
      this.triggerPopupMessage(message)
      console.log("message", message)
      this.messages.push(message);
    });
    console.log("caption")
  }

  sendMessageToWebSocket() {
    this.webSocketService.sendMessage('Hello, WebSocket Server!');
  }

  ngAfterViewInit() {
    
    console.log("laoeded dev")
  }
  

  triggerPopupMessage(mesg:any)
  {
    this.schedulePushNotification(mesg)
  
    this.popmessgae =mesg;
    this.openModal(mesg);
    setTimeout(() => {
     this.closeModal();
    }, 20000);
  }


  showModal = false;

  openModal(item: any) {
    
    this.showModal = true;
   
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
  
    this.showModal = false;
    document.body.style.overflow = 'auto';
  }

  initializePushNotifications() {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          // Permission granted, you can now schedule a push notification
        
        }
      });
    }
  }

  schedulePushNotification(message:any) {
    setTimeout(() => {
      const options = {
        body: message,
        icon: 'assets/img/menu/lobster-bisque.jpg',
      };

      const notification = new Notification('Push Notification Title', options);
    }, 1000); // 5 minutes in milliseconds
  }





}
