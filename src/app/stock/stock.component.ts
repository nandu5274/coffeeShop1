import { Component, HostListener } from '@angular/core';
import { SingleFileOrderDto } from '../dtos/singleFileOrderDto';
import { WebSocketService } from '../service/WebSocket.service';
import { DatePipe } from '@angular/common';
import { TimerService } from '../service/timer.service';
import { GraphqlService } from '../service/graphql.service';
import { SharedService } from '../service/shared-service';
import { DropboxService } from '../service/dropbox.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-stock',
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.scss']
})
export class StockComponent {
  messages: string[] = [];
  Status: any = ""
  showSpinner: Boolean = false;
  showMenuOrderModal: Boolean = false;
  approvedShowSpinner: Boolean = false;
  count: any = 0;
  private sound: Howl;
  ApprovalOrderList: SingleFileOrderDto[] = [];
  ApprovedOrderList: SingleFileOrderDto[] = [];
  orderItemsStatusList: any = [];
  orderItemsStatusLisRes: any;
  orderItemsStatus: any = {};
  ApprovedOrderListMap!: Map<string, SingleFileOrderDto[]>;
  popmessgae: any = ""

  selectedTab: string = 'waiting_order';
  constructor(private webSocketService: WebSocketService, private datePipe: DatePipe, private timerService: TimerService,
    private dropboxService: DropboxService, private graphqlService: GraphqlService,
    private sharedService: SharedService) {
   // this.initializePushNotifications();
    this.sound = new Howl({
      src: ['assets/audio/order_waiting.mp3'],
    });
  }
  logs: string[] = [];
  items!: any[];
  timer$!: Observable<number>;
  ngOnInit() {
    //this.getApprovedOrders();
    console.log = (message: string) => {
      this.logs.push(message);
      // console.log(message); // Log to the browser console
    };

   // this.getApprovalWaitingOrders();

    this.webSocketService.getMessageSubject().subscribe((event) => {
      // Handle incoming WebSocket messages here
      const message = event.data;
    //  this.triggerPopupMessage(message)
      console.log("message", message)
      this.messages.push(message);
    });

    this.timer$ = this.timerService.getTimer();



    console.log("caption")
  }

  selectTab(tabName: string): void {

    this.selectedTab = tabName;

    if (tabName == 'waiting_order') {
     // this.getUpdatedApprovalWaitingOrders();
    } else if (tabName == 'Accepted_order') {
     // this.getUpdatedApprovedOrders();
    }
  }
  isSticky: boolean = false;
  @HostListener('window:scroll', ['$event'])
  checkScroll() {
    // Add the 'sticky' class to the tabs when scrolling down, and remove it when scrolling up
    this.isSticky = window.scrollY > 100;
  }
}
