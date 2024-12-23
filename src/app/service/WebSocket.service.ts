import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import SockJS from 'sockjs-client';
import { KUBERA_API_WEB_SOCKET_URL } from '../common/constanst';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {

  private stompClient: any;
  private messageSubject: Subject<MessageEvent> = new Subject<MessageEvent>();
  private connectionStatusSubject: Subject<boolean> = new Subject<boolean>();
  private isOpen: boolean = false;
  private socket: any;

  constructor() {
    this.connect();
    this.setupConnectionListeners();
  }

  private connect() {
    this.socket = new SockJS(KUBERA_API_WEB_SOCKET_URL);

    this.socket.onopen = () => {
      this.isOpen = true;
      console.log('Connection opened');
      this.updateConnectionStatus(true);
    };

    this.socket.onclose = () => {
      this.isOpen = false;
      console.log('Connection closed');
      this.updateConnectionStatus(false);
      this.reconnect(); // Try to reconnect on close
    };

    this.socket.onerror = (error: any) => {
      console.error('WebSocket error', error);
      this.isOpen = false;
      this.updateConnectionStatus(false);
      this.socket.close(); // Close socket on error
    };

    this.socket.onmessage = (event: MessageEvent) => this.handleMessage(event);
  }

  private setupConnectionListeners() {
    window.addEventListener('offline', () => {
      console.log('Internet disconnected');
      this.closeConnection();
      this.updateConnectionStatus(false);
    });

    window.addEventListener('online', () => {
      console.log('Internet reconnected');
      this.reconnect();
    });
  }

  private handleMessage(event: MessageEvent) {
    this.messageSubject.next(event);
  }

  sendMessage(message: string) {
    if (this.isOpen) {
      this.socket.send(message);
    } else {
      console.warn('Cannot send message, WebSocket is not open');
    }
  }

  closeConnection() {
    if (this.isOpen) {
      this.socket.close();
      this.isOpen = false;
      this.updateConnectionStatus(false);
    }
  }

  getMessageSubject(): Observable<MessageEvent> {
    return this.messageSubject.asObservable();
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatusSubject.asObservable();
  }

  private updateConnectionStatus(isConnected: boolean) {
    this.connectionStatusSubject.next(isConnected);
  }

  reconnect() {
    this.closeConnection(); // Ensure the existing connection is closed
    if (!navigator.onLine) return; // Only reconnect if online
    console.log('Attempting to reconnect...');
    setTimeout(() => this.connect(), 1000); // Retry connection after a delay
  }

  isConnectionEstablished(): boolean {
    return this.isOpen;
  }

  
  ngOnDestroy() {
    window.removeEventListener('offline', this.closeConnection);
    window.removeEventListener('online', this.reconnect);
    this.closeConnection(); // Ensure connection is closed on service destruction
  }
}