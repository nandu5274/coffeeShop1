import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { WebSocketService } from '../service/WebSocket.service';
import { Observable } from 'rxjs/internal/Observable';
import { timer } from 'rxjs';
import { Howl } from 'howler';
import * as Papa from 'papaparse';
import { DatePipe } from '@angular/common';
import { DropboxService } from '../service/dropbox.service';
import { SharedService } from '../service/shared-service';
import { SingleFileOrderDto } from '../dtos/singleFileOrderDto';
@Component({
  selector: 'app-captain-page',
  templateUrl: './captain-page.component.html',
  styleUrls: ['./captain-page.component.scss']
})
export class CaptainPageComponent implements AfterViewInit {
  messages: string[] = [];
  Status: any = ""
  showSpinner: Boolean = false;
  showMenuOrderModal:  Boolean = false;
  approvedShowSpinner: Boolean = false;
  count: any = 0;
  private sound: Howl;
  ApprovalOrderList: SingleFileOrderDto[] = [];
  ApprovedOrderList: SingleFileOrderDto[] = [];
  ApprovedOrderListMap!: Map<string, SingleFileOrderDto[]>;
  popmessgae: any = ""
  constructor(private webSocketService: WebSocketService, private datePipe: DatePipe, private dropboxService: DropboxService,
    private sharedService: SharedService) {
    this.initializePushNotifications();
    this.sound = new Howl({
      src: ['assets/audio/order_waiting.mp3'],
    });
  }
  logs: string[] = [];
  ngOnInit() {
    this.getApprovedOrders();
    console.log = (message: string) => {
      this.logs.push(message);
      // console.log(message); // Log to the browser console
    };

    this.getApprovalWaitingOrders();

    this.webSocketService.getMessageSubject().subscribe((event) => {
      // Handle incoming WebSocket messages here
      const message = event.data;
      this.triggerPopupMessage(message)
      console.log("message", message)
      this.messages.push(message);
    });



    console.log("caption")
  }

  sendMessageToWebSocket(msg: any) {
    this.webSocketService.sendMessage(msg);
  }

  ngAfterViewInit() {
    timer(0, 300000).subscribe(() => {
      this.count = this.count + 1
      this.webSocketService.reconnect();
      this.Status = "reconnecting" + this.count
      console.log("tetsing")
    });

  }


  triggerPopupMessage(mesg: any) {
    this.schedulePushNotification(mesg)
    this.approveOrderBYpopup(mesg)
    this.popmessgae = mesg;

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

  schedulePushNotification(message: any) {
    setTimeout(() => {
      const options = {
        body: message,
        icon: 'assets/img/menu/lobster-bisque.jpg',
      };

      const notification = new Notification('Cafe Kubera order', options);
    }, 100); // 5 minutes in milliseconds
  }


  playSound() {
    this.sound.play();
  }

  approveOrderBYpopup(msg: any) {
    if (typeof msg === "string") {
      if (msg.includes("approval")) {
        this.playSound()
        if (this.showSpinner == false) {
          this.getUpdatedApprovalWaitingOrders();
          this.getUpdatedApprovedOrders();
        } else {
          setTimeout(() => {
            if (this.showSpinner == false) {
              this.getUpdatedApprovalWaitingOrders();
              this.getUpdatedApprovedOrders();
            }
          }, 30000);
        }

      }
      // It's a string
    } else if (typeof msg === "object") {
      // It's an object

      // const order = JSON.parse(msg);
      // if(order.message == "approval")
      // {
      //   let orderItemTableDataList: any = [];
      //   let ConformOrder:any = [];
      //   let csvOrderTableData = {
      //     id:order.data.data.insert_kubera_order_one.order_ref_id,
      //     order_ref_id: order.data.data.insert_kubera_order_one.order_ref_id,
      //     table_no: order.data.data.insert_kubera_order_one.table_no,
      //     order_summary_amount: order.data.data.insert_kubera_order_one.order_summary_amount,
      //     order_additional_service_amount: order.data.data.insert_kubera_order_one.order_additional_service_amount, 
      //     order_total_amount: order.data.data.insert_kubera_order_one.order_total_amount,
      //   }
      //   order.data.data.insert_kubera_order_one.order_items.forEach((item:any) => {
      //     let orderItemTableData = {
      //       order_ref_id: item.order_ref_id,
      //       item_name: item.item_name,
      //       item_description: item.item_description,
      //       item_quantity: item.item_quantity,
      //       item_cost: item.item_cost,
      //     } 
      //     orderItemTableDataList.push(orderItemTableData)
      //   })
      //  // this.generateAndUploadCSV(csvOrderTableData, orderItemTableDataList);
      //  ConformOrder.push(orderItemTableDataList)
      //  ConformOrder.push(csvOrderTableData)

      //  this.generateAndUploadCSVKitchen(csvOrderTableData,orderItemTableDataList, order.data.data.insert_kubera_order_one.order_ref_id,order.data.data.insert_kubera_order_one.order_ref_id)
      // }
    }

  }

  generateAndUploadCSVKitchen(csvOrderTableData: any, orderItemTableDataList: any, order_ref_id: any, id: any) {
    const orderTableFilePath = '/orders/kitchen_orders/orders/' + 'order_' + id + 'order_ref_' + order_ref_id + '.csv';
    const csvOrderTableDataCsv = this.objectsToCsv2([csvOrderTableData]);
    const orderItemTableDataListCsv = this.objectsToCsv2(orderItemTableDataList);
    const orderTableCsvData = csvOrderTableDataCsv + "\n" + orderItemTableDataListCsv


    this.dropboxService.uploadFile(orderTableFilePath, orderTableCsvData).then((response: any) => {
      console.log('File uploaded:', response);
    }).catch((error) => {

      this.dropboxService.updateFile(orderTableFilePath, orderTableCsvData).then((response: any) => {
        console.log('File updated:', response);
      }).catch((error) => {

        console.error('Error uploading file:', error);
      });

      console.error('Error uploading file:', error);
    });

  }

  generateAndUploadCSV(csvOrderTableData: any, csvOrderItemsTableData: any) {
    const currentDate = new Date();
    const formattedDate = this.datePipe.transform(currentDate, 'yyyy_MM_dd_HH_mm_ss');
    const DateFolder = this.datePipe.transform(currentDate, 'yyyy_MM_dd');
    console.log("formattedDate", formattedDate);
    const orderTableCsvData = this.objectsToCsv([csvOrderTableData]);
    const orderTableFilePath = '/orders/current_orders/orders/' + 'order_' + formattedDate + '.csv'; // Replace with your desired Dropbox path


    const orderItemTableCsvData = this.objectsToCsv(csvOrderItemsTableData);
    const orderItemTableFilePath = '/orders/current_orders/order_items/' + 'order_items_' + formattedDate + '.csv'; // Replace with your desired Dropbox path


    this.dropboxService.uploadFile(orderTableFilePath, orderTableCsvData).then((response: any) => {
      console.log('File uploaded:', response);
    }).catch((error) => {
      console.error('Error uploading file:', error);
    });

    this.dropboxService.uploadFile(orderItemTableFilePath, orderItemTableCsvData).then((response: any) => {
      console.log('File uploaded:', response);
    }).catch((error) => {

      console.error('Error uploading file:', error);
    });
  }
  objectsToCsv(objects: any[]): string {
    const csv = Papa.unparse(objects);
    return csv;
  }
  objectsToCsv2(objects: any[]): string {
    const csv = Papa.unparse(objects, {
      header: true
    });
    return csv;
  }


  files: any[] = [];
  async getApprovalWaitingOrders() {
    this.ApprovalOrderList = []
    this.showSpinner = true;
    const folderPath = '/orders/approval_waiting_orders/'; // Replace with the desired folder path
    this.files = await this.dropboxService.getFilesInFolder(folderPath);
    for (const file of this.files) {
      file.data = await this.dropboxService.getFileData(file.path_display);
      const respo = this.sharedService.parseNestedCsvToObject(file.data.fileBlob)
      let order: SingleFileOrderDto = new SingleFileOrderDto();
      order.order = (await respo).headers1
      order.orderItems = (await respo).headers2
      this.ApprovalOrderList.push(order);
      console.log("respo - ", (await respo).headers1)
    }
    this.ApprovalOrderList.sort((a, b) => a.order.id - b.order.id);
    this.ApprovalOrderList.reverse()
    this.showSpinner = false;
  }


  updatedFiles: any[] = [];
  async getUpdatedApprovalWaitingOrders() {
    //this.ApprovalOrderList = []
    this.showSpinner = true;
    const folderPath = '/orders/approval_waiting_orders/'; // Replace with the desired folder path
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

  removeApprovedItem(item: any) {
    const index = this.approvedFiles.indexOf(item);
    if (index !== -1) {
      this.approvedFiles.splice(index, 1);
    }
    this.removeFromApprovedOrderList(item)
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

  removeFromApprovedOrderList(item: any) {
    const match = item.name.match(/order_(\d+)/);
    let id: string | null; // Variable to store the extracted number

    if (match) {
      id = match[1];
    } else {
      id = null; // Set to null if no match is found
    }
    const index = this.ApprovedOrderList.findIndex(order => order.order.id === id);
    if (index !== -1) {
      this.ApprovedOrderList.splice(index, 1);
    }
  }

  refreshOrder() {
    this.getUpdatedApprovalWaitingOrders();
  }


  async approvedOrder(id: any, order_ref_id: any) {
    this.showSpinner = true;
    const sourcePath = '/orders/approval_waiting_orders/' + 'order_' + id + '_order_ref_' + order_ref_id + '.csv';
    let kitchenDestinationPath = '/orders/kitchen_orders/' + 'order_' + id + '_order_ref_' + order_ref_id + '.csv'
    let approvedDestinationPath = '/orders/approved_orders/' + 'order_' + id + '_order_ref_' + order_ref_id + '.csv'
    let res: any = "";

    res = await this.dropboxService.copyFile(sourcePath, kitchenDestinationPath, "kitchen")
    console.log('Move file response:', res);


    if (res.includes("successful")) {
      res = await this.dropboxService.moveFile(sourcePath, approvedDestinationPath);
      this.sendMessageToWebSocket('kitchen')
      setTimeout(() => {
        this.refreshOrder()
      }, 1000); // 5 minutes in milliseconds

    } else {
      //retry button
    }

  }

  selectedTab: string = 'waiting_order';

  selectTab(tabName: string): void {

    this.selectedTab = tabName;

    if (tabName == 'waiting_order') {
      this.getUpdatedApprovalWaitingOrders();
    } else if (tabName == 'Accepted_order') {
      this.getUpdatedApprovedOrders();
    }
  }

  isExpanded: boolean = false;
  expandedStatus: boolean = false;
  currentkey: any;
  currentClosed: boolean = false;
  toggleExpand(map: any, item: any) {
    if (this.expandedStatus) {
      map.forEach((value: any, key: any) => {
        value[0].order.isExpanded = false;
      });
      item.value[0].order.isExpanded = !item.value[0].order.isExpanded;

      if (this.currentkey == item.value[0].order.table_no && !this.currentClosed) {
        item.value[0].order.isExpanded = false
        this.currentClosed = true;
      } else {
        this.currentClosed = false;
      }
      this.currentkey = item.value[0].order.table_no;


    } else {
      item.value[0].order.isExpanded = !item.value[0].order.isExpanded;
      this.expandedStatus = !this.expandedStatus
    }
    if (item.value[0].order.isExpanded && this.expandedDiv) {
      this.expandedDiv.nativeElement.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }

  @ViewChild('expandedDiv') expandedDiv: ElementRef | undefined;

  async declineOrder(id: any, order_ref_id: any) {
    this.showSpinner = true;
    const sourcePath = '/orders/approval_waiting_orders/' + 'order_' + id + '_order_ref_' + order_ref_id + '.csv';
    let kitchenDestinationPath = '/orders/decline_orders/' + 'order_' + id + '_order_ref_' + order_ref_id + '.csv';
    this.dropboxService.moveFile(sourcePath, kitchenDestinationPath);
    setTimeout(() => {
      this.refreshOrder()
    }, 1000); // 5 minutes in milliseconds

  }


  approvedFiles: any[] = [];
  async getApprovedOrders() {
    this.ApprovedOrderList = []
    this.approvedShowSpinner = true;
    const folderPath = '/orders/approved_orders/'; // Replace with the desired folder path
    this.approvedFiles = await this.dropboxService.getFilesInFolder(folderPath);
    for (const file of this.approvedFiles) {
      file.data = await this.dropboxService.getFileData(file.path_display);
      const respo = this.sharedService.parseNestedCsvToObject(file.data.fileBlob)
      let order: SingleFileOrderDto = new SingleFileOrderDto();
      order.order = (await respo).headers1
      order.orderItems = (await respo).headers2
      order.order.isExpanded = false
      this.ApprovedOrderList.push(order);
      console.log("respo - ", (await respo).headers1)
    }
    this.ApprovedOrderList.sort((a, b) => a.order.id - b.order.id);
    this.ApprovedOrderList.reverse()
    this.converteLIstTomap(this.ApprovedOrderList);
    this.approvedShowSpinner = false;
  }

  updatedApprovedOrderFiles: any[] = [];
  async getUpdatedApprovedOrders() {
    //this.ApprovalOrderList = []
    this.approvedShowSpinner = true;
    const folderPath = '/orders/approved_orders/'; // Replace with the desired folder path
    this.updatedApprovedOrderFiles = await this.dropboxService.getFilesInFolder(folderPath);
    // added only newly added files
    const addedNewFiles = this.updatedApprovedOrderFiles.filter(item1 => !this.approvedFiles.some(item2 => item2["name"] === item1["name"]));
    const removeOldFiles = this.approvedFiles.filter(item1 => !this.updatedApprovedOrderFiles.some(item2 => item2["name"] === item1["name"]));
    for (const file of addedNewFiles) {
      file.data = await this.dropboxService.getFileData(file.path_display);
      const respo = this.sharedService.parseNestedCsvToObject(file.data.fileBlob)
      let order: SingleFileOrderDto = new SingleFileOrderDto();
      order.order = (await respo).headers1
      order.orderItems = (await respo).headers2
      order.order.isExpanded = false
      this.ApprovedOrderList.push(order);
      console.log("respo - ", (await respo).headers1)
    }
    addedNewFiles.forEach(value => this.approvedFiles.push(value))
    removeOldFiles.forEach(value => this.removeApprovedItem(value))
    this.ApprovedOrderList.sort((a, b) => a.order.id - b.order.id);
    this.ApprovedOrderList.reverse()
    this.converteLIstTomap(this.ApprovedOrderList);
    this.approvedShowSpinner = false;
  }
  converteLIstTomap(ApprovedOrderList: any) {
    //   const yourMap: Map<number, SingleFileOrderDto> = new Map(ApprovedOrderList.map((obj:SingleFileOrderDto ) => [obj.order.table_no, obj]));


    const yourMap: Map<string, SingleFileOrderDto[]> = ApprovedOrderList.reduce((map: any, obj: SingleFileOrderDto) => {
      const key = obj.order.table_no;

      // If the key doesn't exist in the map, initialize it with an empty array
      if (!map.has(key)) {
        map.set(key, []);
      }

      // Push the object to the array associated with the key
      map.get(key)?.push(obj);

      return map;
    }, new Map<string, SingleFileOrderDto[]>());


    this.ApprovedOrderListMap = yourMap

    console.log(yourMap);
  }


  refreshApprovedOrder() {
    this.getUpdatedApprovedOrders()
  }
  isSticky: boolean = false;
  @HostListener('window:scroll', ['$event'])
  checkScroll() {
    // Add the 'sticky' class to the tabs when scrolling down, and remove it when scrolling up
    this.isSticky = window.scrollY > 100;
  }

  async moveOrderToCheckOut(data:any) {
    this.approvedShowSpinner = true;
   const value =  this.objectsToCsv2(data);
   let orderData:any = [];
   let orderItem:any = [];
   let filepaths:any = [];
   let id = "";
   data.forEach( (field:any) => {
    let path  = '/orders/approved_orders/'+'order_' + field.order.id + '_order_ref_' + field.order.order_ref_id + '.csv'
    filepaths.push(path);
    orderData.push(field.order);
    id = id+"_"+field.order.id
    field.orderItems.forEach( (item:any) => {
      orderItem.push(item)
    })
   
   })
   const csvOrderTableDataCsv = this.objectsToCsv2(orderData);
   const orderItemTableDataListCsv = this.objectsToCsv2(orderItem);
   const orderTableCsvData  = csvOrderTableDataCsv +"\n" +orderItemTableDataListCsv
   const orderTableFilePath = '/orders/checkout_orders/'+'order'+id+'.csv';
   await this.dropboxService.uploadFile(orderTableFilePath, orderTableCsvData).then(async (response:any) => {
    console.log('File uploaded:', response);
   let  resw = await this.dropboxService.deleteFile(filepaths);
   console.log(resw);
   setTimeout(() => {   this.refreshApprovedOrder(); }, 3000); 

    //delete the approved orders

  }).catch((error) => {
    this.dropboxService.updateFile(orderTableFilePath, orderTableCsvData).then((response:any) => {
      console.log('File updated:', response);
      this.dropboxService.deleteFile(filepaths);
      setTimeout(() => {   this.refreshApprovedOrder(); }, 3000); 
    }).catch((error) => {
      
      console.error('Error uploading file:', error);
    });
    
    console.error('Error uploading file:', error);
  });

  }


  isTableNUmberUndefined(): boolean {
    return this.tableNumber == null; 
  }
  openOrderMenuModal() {
    sessionStorage.removeItem('table')
    sessionStorage.removeItem('tableSet')
    this.showMenuOrderModal = true
  }
  tableNumber: any

  closeOrderMenuModal() {
    this.showMenuOrderModal = false
  }

  openMenuPage()
  {
    sessionStorage.setItem('table', this.tableNumber);
    sessionStorage.setItem('tableSet', '1');
    sessionStorage.setItem('isCap', 'true');
    this.sharedService.setShowMenuFlag(1)
    this.sharedService.navigateToMenu('menu');
  }



}
