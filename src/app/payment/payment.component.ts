import { AfterViewInit, Component, HostListener } from '@angular/core';
import { WebSocketService } from '../service/WebSocket.service';
import { DatePipe } from '@angular/common';
import { DropboxService } from '../service/dropbox.service';
import { SharedService } from '../service/shared-service';
import { SingleFileOrderDto } from '../dtos/singleFileOrderDto';
import Papa from 'papaparse';
import { PaidFileOrderDto } from '../dtos/paidFileOrderDto';
import { DataService } from '../service/data.service';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss']
})
export class PaymentComponent implements AfterViewInit {
  selectedTab: string = 'waiting_order';
  loggedIn: boolean = false;
  private sound: Howl;
  currentDateTimeInIST:any
  showSpinner: boolean = false;
  showPaidSpinner: boolean = false;
  printValue:any
  TotalPaidAmount:any = 0;
  TotalActualAmount:any = 0;
  constructor(private webSocketService: WebSocketService, private datePipe: DatePipe, private dropboxService: DropboxService,
    private sharedService: SharedService, private dataService: DataService) {
    this.initializePushNotifications();
    this.sound = new Howl({
      src: ['assets/audio/order_waiting.mp3'],
    });
  }
  ngAfterViewInit(): void {

  }



  ngOnInit() {


    this.webSocketService.getMessageSubject().subscribe((event) => {
      // Handle incoming WebSocket messages here
      const message = event.data;
      this.triggerPopupMessage(message)
      console.log("message", message)

    });

    this.getCheckOutOrders();
    //this.getPaidOrders();

    console.log("caption")
  }

  triggerPopupMessage(mesg: any) {
    this.schedulePushNotification(mesg)
    this.approveOrderBYpopup(mesg)

  }

  playSound() {
    //this.sound.play();
  }

  schedulePushNotification(message: any) {
    setTimeout(() => {
      const options = {
        body: message,
        icon: 'assets/img/menu/lobster-bisque.jpg',
      };

      const notification = new Notification('Cafe Kubera order', options);
    }, 100); // 5 minutes in milliseconds
  }



  handleLoginStatus(status: boolean) {
    this.loggedIn = status;
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


  approveOrderBYpopup(msg: any) {
    if (typeof msg === "string") {
      if (msg.includes("payment")) {
        this.playSound()
        if (this.showSpinner == false) {
          this.getUpdatedCheckOutOrders();

        } else {
          setTimeout(() => {
            if (this.showSpinner == false) {
              this.getUpdatedCheckOutOrders();
            }
          }, 30000);
        }

      }
      // It's a string
    } else if (typeof msg === "object") {
    }

  }





  files: any[] = [];
  checkOutOrderList: SingleFileOrderDto[] = [];
  async getCheckOutOrders() {
    this.checkOutOrderList = []
    this.showSpinner = true;
    const folderPath = '/orders/checkout_orders/'; // Replace with the desired folder path
    this.files = await this.dropboxService.getFilesInFolder(folderPath);
    this.files.shift() 
    for (const file of this.files) {
      file.data = await this.dropboxService.getFileData(file.path_display);
      const respo = this.sharedService.parseNestedCsvToObjectDynamicHeader(file.data.fileBlob)
      let order: SingleFileOrderDto = new SingleFileOrderDto();
      order.filePath = file.name
      order.order = (await respo).headers1
      order.orderItems = (await respo).headers2
      this.checkOutOrderList.push(order);
      console.log("respo - ", (await respo).headers1)
    }
    this.checkOutOrderList.sort((a, b) => a.order.id - b.order.id);
    this.checkOutOrderList.reverse()
    this.checkOutOrderList.forEach(order => {
      let conItems = this.combineOrderItemsQuantities(order.orderItems)
      order.orderItems = conItems
    })
    this.showSpinner = false;
  }



  paidFiles: any[] = [];
  paidOrderList: PaidFileOrderDto[] = [];
  async getPaidOrders() {
    this.paidOrderList = []
    this.showPaidSpinner = true;
    const folderPath = '/orders/paid_orders/'; // Replace with the desired folder path
    this.paidFiles = await this.dropboxService.getFilesInFolder(folderPath);
    this.paidFiles.shift() 
    for (const file of this.paidFiles) {
      file.data = await this.dropboxService.getFileData(file.path_display);
      const respo = this.sharedService.parseNestedCsvToObjectDynamic3THeader(file.data.fileBlob)
      let order: PaidFileOrderDto = new PaidFileOrderDto();
      order.filePath = file.name
      order.order = (await respo).headers1
      order.orderItems = (await respo).headers2
      order.paidDetails = (await respo).headers3
      this.paidOrderList.push(order);
      console.log("respo - ", (await respo).headers1)
      this.TotalPaidAmount = this.TotalPaidAmount+ parseFloat(order.paidDetails[0].paid_amount);
      this.TotalActualAmount = this.TotalActualAmount+ parseFloat(order.paidDetails[0].actual_amount);
    }
    this.paidOrderList.sort((a, b) => a.order.id - b.order.id);
    this.paidOrderList.reverse()
    this.showPaidSpinner = false;
  }

  showInvoice(invoiceData:any)
  {
    this.openPopup();
      this.printValue = invoiceData

  }


  updatedPaidFiles: any[] = [];
  async getUpdatedPaidOrders() {
    //this.ApprovalOrderList = []
    this.showPaidSpinner = true;
    const folderPath = '/orders/paid_orders/'; // Replace with the desired folder path
    this.updatedPaidFiles = await this.dropboxService.getFilesInFolder(folderPath);
    this.updatedPaidFiles.shift() 
    // added only newly added files
    const addedNewFiles = this.updatedPaidFiles.filter(item1 => !this.paidFiles.some(item2 => item2["name"] === item1["name"]));
    const removeOldFiles = this.paidFiles.filter(item1 => !this.updatedPaidFiles.some(item2 => item2["name"] === item1["name"]));
    for (const file of addedNewFiles) {
      file.data = await this.dropboxService.getFileData(file.path_display);
      const respo = this.sharedService.parseNestedCsvToObjectDynamic3THeader(file.data.fileBlob)
      let order: PaidFileOrderDto = new PaidFileOrderDto();
      order.filePath = file.name
      order.order = (await respo).headers1
      order.orderItems = (await respo).headers2
      order.paidDetails = (await respo).headers3
      this.paidOrderList.push(order);
      console.log("respo - ", (await respo).headers1)
      this.TotalPaidAmount = this.TotalPaidAmount+ parseFloat(order.paidDetails[0].paid_amount);
      this.TotalActualAmount = this.TotalActualAmount+ parseFloat(order.paidDetails[0].actual_amount);
    }
    addedNewFiles.forEach(value => this.paidFiles.push(value))
    removeOldFiles.forEach(value => this.removePaidItem(value))
    this.paidOrderList.sort((a, b) => a.order.id - b.order.id);
    this.paidOrderList.reverse()
    this.paidOrderList.forEach(order => {
      let conItems = this.combineOrderItemsQuantities(order.orderItems)
      order.orderItems = conItems
    })
    this.showPaidSpinner = false;

  }

  removePaidItem(item: any) {
    const index = this.files.indexOf(item);
    if (index !== -1) {
      this.files.splice(index, 1);
    }
    this.removeFromPaidOrderList(item)
  }

  removeFromPaidOrderList(item: any) {
    const match = item.name.match(/order_(\d+)/);
    let id: string | null; // Variable to store the extracted number

    if (match) {
      id = match[1];
    } else {
      id = null; // Set to null if no match is found
    }
    const index = this.paidOrderList.findIndex(order => order.filePath === item.name);
    if (index !== -1) {
      this.paidOrderList.splice(index, 1);
    }
  }

  formatStringWithTwoDecimalPlaces(value :any): string {
    const numberValue = parseFloat(value);
    const formattedNumber = numberValue.toFixed(2);
    return formattedNumber;
  }

  updatedFiles: any[] = [];
  async getUpdatedCheckOutOrders() {
    //this.ApprovalOrderList = []
    this.showSpinner = true;
    const folderPath = '/orders/checkout_orders/'; // Replace with the desired folder path
    this.updatedFiles = await this.dropboxService.getFilesInFolder(folderPath);
    this.updatedFiles.shift()
    // added only newly added files
    const addedNewFiles = this.updatedFiles.filter(item1 => !this.files.some(item2 => item2["name"] === item1["name"]));
    const removeOldFiles = this.files.filter(item1 => !this.updatedFiles.some(item2 => item2["name"] === item1["name"]));
    for (const file of addedNewFiles) {
      file.data = await this.dropboxService.getFileData(file.path_display);
      const respo = this.sharedService.parseNestedCsvToObjectDynamicHeader(file.data.fileBlob)
      let order: SingleFileOrderDto = new SingleFileOrderDto();
      order.filePath = file.name
      order.order = (await respo).headers1
      order.orderItems = (await respo).headers2
      this.checkOutOrderList.push(order);
      console.log("respo - ", (await respo).headers1)
    }
    addedNewFiles.forEach(value => this.files.push(value))
    removeOldFiles.forEach(value => this.removeItem(value))
    this.checkOutOrderList.sort((a, b) => a.order.id - b.order.id);
    this.checkOutOrderList.reverse()
    this.checkOutOrderList.forEach(order => {
      let conItems = this.combineOrderItemsQuantities(order.orderItems)
      order.orderItems = conItems
    })
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
    const index = this.checkOutOrderList.findIndex(order => order.filePath === item.name);
    if (index !== -1) {
      this.checkOutOrderList.splice(index, 1);
    }
  }

  refreshApprovedOrder() {
    this.getUpdatedCheckOutOrders()
  }

  refreshOrder() {
    this.getUpdatedCheckOutOrders()
  }

  refreshPaidOrder() {
    this.getUpdatedPaidOrders()
  }
  selectTab(tabName: string): void {

    this.selectedTab = tabName;

    if (tabName == 'waiting_order') {
      // this.getUpdatedApprovalWaitingOrders();
    } else if (tabName == 'Accepted_order') {
      this.getUpdatedPaidOrders();
    }
  }

  isSticky: boolean = false;
  @HostListener('window:scroll', ['$event'])
  checkScroll() {
    // Add the 'sticky' class to the tabs when scrolling down, and remove it when scrolling up
    this.isSticky = window.scrollY > 100;
  }



  combineOrderItemsQuantities(orderItem: any) {
    const itemMap: any = {};

    // Iterate through the itemList and update the itemMap
    orderItem.forEach((item: any) => {
      const itemName = item.item_name;
      const quantity = parseInt(item.item_quantity, 10);

      if (!isNaN(quantity)) {
        if (itemMap[itemName]) {
          itemMap[itemName].item_quantity += quantity;
        } else {
          // If the item is not in the map, create a new entry
          itemMap[itemName] = { ...item, item_quantity: quantity };
        }
      }
    });

    // Convert the itemMap back to the itemList
    return Object.values(itemMap);

  }

  isPopupOpen = false;
  isPaymentTypePopupOpen = false;
selectedOrder:any;
  openPopup(): void {
    this.isPopupOpen = true;
  }

  closePopup(): void {
    this.isPopupOpen = false;
  }
  paymentDone(order: any) {
    this.isPaymentTypePopupOpen = true;
    this.selectedOrder= order;
  }

  makePaymentCompleted()
  {
//convert the object tpo csv and save to the paidorder folder 
  this.moveOrderToPaid( this.selectedOrder);

  }

  async sendMailPaymentOrder(data:any) {

   const value =  this.objectsToCsv2(data);

   let paymentType:any = {};
   let request: any = {};
   let attachment :any = {};
   let fileName:any = data.filePath
   paymentType.paid_amount = this.amount;
   paymentType.actual_amount = this.formatStringWithTwoDecimalPlaces(this.getActualAmount(data.orderItems));
   paymentType.mode = this.paymentMode
   paymentType.period =this.sharedService.updateCurrentDateTimeInIST();

   const csvOrderTableDataCsv = this.objectsToCsv2(data.order);
   const orderItemTableDataListCsv = this.objectsToCsv2(data.orderItems);
   const paymentTypeListCsv = this.objectsToCsv2([paymentType]);
   const orderTableCsvData  = paymentTypeListCsv+"\n" +csvOrderTableDataCsv +"\n" +orderItemTableDataListCsv
   const orderTableFilePath ='/orders/paid_orders/'+fileName;
   attachment.content = orderTableCsvData
   attachment.fileName = fileName
   request.recipient = "cafekubera2223@gmail.com";
   request.msgBody = "Hey! In\nThis is a message from the cafe kubera order payment completed \n\nThanks";
   request.subject = "details for the orders - "+  data.order.map((obj: any) => obj.id).join(',') +" for  the table "+ data.order[0].table_no+" on " + paymentType.period;
   request.attachment = attachment;
    this.dataService.postData(request).subscribe();
  }

  async moveOrderToPaid(data:any) {
    this.showSpinner = true;
  
   const value =  this.objectsToCsv2(data);

   let paymentType:any = {};
   let fileName:any = data.filePath
   paymentType.paid_amount = this.amount;
   paymentType.actual_amount = this.formatStringWithTwoDecimalPlaces(this.getActualAmount(data.orderItems));
   paymentType.mode = this.paymentMode
   paymentType.period =this.sharedService.updateCurrentDateTimeInIST();
   delete data.order[0].table_place;
   const csvOrderTableDataCsv = this.objectsToCsv2(data.order);
   const orderItemTableDataListCsv = this.objectsToCsv2(data.orderItems);
   const paymentTypeListCsv = this.objectsToCsv2([paymentType]);
   const orderTableCsvData  = paymentTypeListCsv+"\n" +csvOrderTableDataCsv +"\n" +orderItemTableDataListCsv
   const orderTableFilePath ='/orders/paid_orders/'+fileName;
   await this.dropboxService.uploadFile(orderTableFilePath, orderTableCsvData).then(async (response:any) => {
    console.log('File uploaded:', response);
    let checkOutOrder = "/orders/checkout_orders/"+fileName
   let  resw = await this.dropboxService.deleteFile([checkOutOrder]);
   this.sendMailPaymentOrder(data);
   console.log(resw);
   setTimeout(() => {  this.closePaymentTypePopup();  this.refreshOrder(); }, 3000); 

    //delete the approved orders

  }).catch((error) => {
    this.dropboxService.updateFile(orderTableFilePath, orderTableCsvData).then((response:any) => {
      console.log('File updated:', response);
      this.dropboxService.deleteFile(["/orders/paid_orders/"+fileName]);
      setTimeout(() => {  
        this.closePaymentTypePopup();
         this.refreshOrder(); 
        }, 3000); 
    }).catch((error) => {
      
      console.error('Error uploading file:', error);
    });
    
    console.error('Error uploading file:', error);
  });

  }

  getActualAmount(orderItems: any) {
    let orderCost = 0;

    orderItems.forEach((item: any) => {
      let itemCost = item.item_quantity * item.item_cost
      orderCost = orderCost + itemCost

    })
    return orderCost;
  }

  closePaymentTypePopup() {
    this.isPaymentTypePopupOpen = false;
  }

  isNewProfile: boolean = false;
  paymentMode: any = "cash"
  amount:any ;
  paymentMde(mode: any) {
    if (mode) {
      this.paymentMode = "online";
    } else if (!mode) {
      this.paymentMode = "cash";
    }
  }
  isAmountUndefined(): boolean {
    return this.amount == null; 
  }


  objectsToCsv2(objects: any[]): string {
    const csv = Papa.unparse(objects, {
      header: true
    });
    return csv;
  }

}
