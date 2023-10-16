import { Injectable } from '@angular/core';
import { Stomp } from '@stomp/stompjs';
import { Observable, Subject, catchError, delay, retryWhen, take, throwError } from 'rxjs';

import SockJS from 'sockjs-client';
import { KUBERA_API_WEB_SOCKET_URL } from '../common/constanst';


@Injectable({
  providedIn: 'root'
})
export class WebSocketService {

  private stompClient: any;
  private messageSubject: Subject<MessageEvent> = new Subject<MessageEvent>();
  private isOpen:Boolean = false;
  private socket: any;
  constructor() {

    this.socket = new SockJS(KUBERA_API_WEB_SOCKET_URL);
    this.connect();

  }

  private connect() {

    this.socket = new SockJS(KUBERA_API_WEB_SOCKET_URL);
   // this.socket = new SockJS('http://localhost:8080/ws');

    this.socket.onopen = () => {
      this.isOpen = true;
      console.log('Connection opened');
    };

    console.log("this.socket.status - ", this.socket)
    this.socket.onmessage = (test: any) => this.handleMessage(test);
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

  reconnect()
  {this.closeConnection()
    console.log("reconnecting ....")
    this.connect();  
  }
isConnectionEstablished()
{
  return this.isOpen;
}
 
}