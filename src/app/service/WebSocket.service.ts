import { Injectable } from '@angular/core';
import { Stomp } from '@stomp/stompjs';
import { Observable, Subject, catchError, delay, retryWhen, take, throwError } from 'rxjs';

import SockJS from 'sockjs-client';


@Injectable({
    providedIn: 'root'
  })
  export class WebSocketService  {
    
    private stompClient: any;
    private messageSubject: Subject<MessageEvent> = new Subject<MessageEvent>();

    private socket: any;
    constructor() {
  
      //this.socket = new SockJS('https://kuber-backup.onrender.com/ws');
      this.socket = new SockJS('http://localhost:8080/ws');
      
    
      console.log("this.socket.status - ", this.socket)
      this.socket.onmessage = (test:any) => this.handleMessage(test);

    }



      
    private handleMessage(event: MessageEvent) {
      // Notify subscribers of the new WebSocket message
      this.messageSubject.next(event);
    }
  
    sendMessage(message: string) {
      this.socket.send(message);
    }
  
    closeConnection() {
      this.socket.close();
    }
  
    getMessageSubject() {
      return this.messageSubject.asObservable();
    }
  }