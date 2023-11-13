import { Component } from '@angular/core';
import { WebSocketService } from '../service/WebSocket.service';
import { DatePipe } from '@angular/common';
import { DropboxService } from '../service/dropbox.service';
import { SharedService } from '../service/shared-service';
import { SingleFileOrderDto } from '../dtos/singleFileOrderDto';
import { timer } from 'rxjs';

@Component({
  selector: 'app-kitchen-page',
  templateUrl: './kitchen-page.component.html',
  styleUrls: ['./kitchen-page.component.scss']
})
export class KitchenPageComponent {

  messages: string[] = [];
  Status:any = ""
  showSpinner :Boolean = false;
  count:any = 0;
  private sound: Howl;
  ApprovalOrderList: SingleFileOrderDto[] = [];
  popmessgae:any = ""
  constructor(private webSocketService: WebSocketService, private datePipe: DatePipe, private dropboxService: DropboxService,
    private sharedService: SharedService) {  
    this.initializePushNotifications();
    this.sound = new Howl({
      src: ['assets/audio/order_waiting.mp3'],
    });
  }


  logs: string[] = [];
  ngOnInit() {
    
    console.log = (message: string) => {
      this.logs.push(message);
    //  console.log(message); // Log to the browser console
    };

    this.getKitchenOrders();
    this.webSocketService.getMessageSubject().subscribe((event) => {
      // Handle incoming WebSocket messages here
      const message = event.data;
     // this.triggerPopupMessage(message)
      console.log("message", message)
      this.messages.push(message);
    });

   
 
    console.log("caption")
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

  ngAfterViewInit() {
    timer(0, 300000).subscribe(() => { 
      this.count = this.count+1
      this.webSocketService.reconnect();
      this.Status = "reconnecting"+ this.count
      console.log("tetsing")
    });
  
  }
  playSound() {
    this.sound.play();
  }

  approveOrderBYpopup(msg:any)
  {
    if (typeof msg === "string") {
      if(msg = "approval")
      {
        this.playSound()
          if(this.showSpinner == false)
          {
            this.getUpdatedKitchenOrders();
          }else
          {
            setTimeout(() => {
              if (this.showSpinner == false) {
                this.getUpdatedKitchenOrders();
              }
            }, 30000);
          }
   
      }
      // It's a string
    } else if (typeof msg === "object") {
 
     } 

  }

  files: any[] = [];
  async getKitchenOrders()
  {
    this.ApprovalOrderList = []
    this.showSpinner = true;
    const folderPath = '/orders/kitchen_orders/'; // Replace with the desired folder path
    this.files = await this.dropboxService.getFilesInFolder(folderPath);
    for (const file of this.files) {
      file.data = await this.dropboxService.getFileData(file.path_display);
      const respo = this.sharedService.parseNestedCsvToObject(file.data.fileBlob)
      let order:SingleFileOrderDto = new SingleFileOrderDto();
      order.order =  (await respo).headers1
      order.orderItems = (await respo).headers2
      this.ApprovalOrderList.push(order);
      console.log("respo - " , (await respo).headers1)
      this.ApprovalOrderList.sort((a, b) => a.order.id - b.order.id);
      this.ApprovalOrderList.reverse()
    }
    this.showSpinner = false;

  }
  

  updatedFiles: any[] = [];
  async getUpdatedKitchenOrders() {
    //this.ApprovalOrderList = []
    this.showSpinner = true;
    const folderPath = '/orders/kitchen_orders/'; // Replace with the desired folder path
    this.updatedFiles = await this.dropboxService.getFilesInFolder(folderPath);
    // added only newly added files
    const addedNewFiles = this.updatedFiles.filter(item1 => !this.files.some(item2 => item2["name"] === item1["name"]));
    const removeOldFiles = this.files.filter(item1 => !this.updatedFiles.some(item2 => item2["name"] === item1["name"]));
    for (const file of addedNewFiles) {
      file.data = await this.dropboxService.getFileData(file.path_display);
      const respo = this.sharedService.parseNestedCsvToObject(file.data.fileBlob)
      let order: SingleFileOrderDto = new SingleFileOrderDto();
      order.order = (await respo).headers1
      order.orderItems = (await respo).headers2
      this.ApprovalOrderList.push(order);
      console.log("respo - ", (await respo).headers1)
    }
    addedNewFiles.forEach(value => this.files.push(value))
    removeOldFiles.forEach(value => this.removeItem(value))
    this.ApprovalOrderList.sort((a, b) => a.order.id - b.order.id);
    this.ApprovalOrderList.reverse()
    this.showSpinner = false;

  }


  removeItem(item: any) {
    const index = this.files.indexOf(item);
    if (index !== -1) {
      this.files.splice(index, 1);
    }
    this.removeFromApprovalOrderList(item)
  }


  removeFromApprovalOrderList(item: any) {
    const match = item.name.match(/order_(\d+)/);
    let id: string | null; // Variable to store the extracted number

    if (match) {
      id = match[1];
    } else {
      id = null; // Set to null if no match is found
    }
    const index = this.ApprovalOrderList.findIndex(order => order.order.id === id);
    if (index !== -1) {
      this.ApprovalOrderList.splice(index, 1);
    }
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


  async approvedOrder(id:any ,order_ref_id:any)
  {
    this.showSpinner = true;
    const sourcePath = '/orders/approval_waiting_orders/'+'order_'+id+'_order_ref_'+order_ref_id+'.csv';
    let kitchenDestinationPath = '/orders/kitchen_orders/'+'order_'+id+'_order_ref_'+order_ref_id+'.csv'
    let approvedDestinationPath = '/orders/approved_orders/'+'order_'+id+'_order_ref_'+order_ref_id+'.csv'
        let res:any = "";
      
        res = await this.dropboxService.copyFile(sourcePath, kitchenDestinationPath, "kitchen")
        console.log('Move file response:', res);
     
      
        if(res.includes("successful"))
        {
           this.dropboxService.moveFile(sourcePath, approvedDestinationPath);
           setTimeout(() => {
            this.refreshOrder()
          }, 1000); // 5 minutes in milliseconds

        }else{
          //retry button
        }

  }
  refreshOrder()
  {
    this.getUpdatedKitchenOrders();
  }

}
