import { AfterViewInit, Component, ElementRef, HostListener, ViewChild, ChangeDetectorRef } from '@angular/core';
import { WebSocketService } from '../service/WebSocket.service';
import { Observable } from 'rxjs/internal/Observable';
import { timer } from 'rxjs';
import { Howl } from 'howler';
import * as Papa from 'papaparse';
import { DatePipe } from '@angular/common';
import { DropboxService } from '../service/dropbox.service';
import { SharedService } from '../service/shared-service';
import { SingleFileOrderDto } from '../dtos/singleFileOrderDto';
import { GraphqlService } from '../service/graphql.service';
import { TimerService } from '../service/timer.service';
import { BELL_MSG_TIME_OUT, USE_DATABASE } from '../common/constanst';
import { CustomerService } from '../service/customer.service';
import { ActivatedRoute, Router } from '@angular/router';



@Component({
  selector: 'app-captain-page',
  templateUrl: './captain-page.component.html',
  styleUrls: ['./captain-page.component.scss']
})
export class CaptainPageComponent implements AfterViewInit {
  USE_DATABASE = USE_DATABASE;
  messages: string[] = [];
  Status: any = ""
  loggedIn: any = false;
  pageType: any = "cap";
  showSpinner: Boolean = false;
  showMenuOrderModal: Boolean = false;
  approvedShowSpinner: Boolean = false;
  showCheckOutModal: Boolean = false;
  count: any = 0;
  private sound: Howl;
  private bellSound: Howl;
  employee_name:any='';
  ApprovalOrderList: SingleFileOrderDto[] = [];
  ApprovedOrderList: SingleFileOrderDto[] = [];
  orderItemsStatusList: any = [];
  orderItemsStatusLisRes: any;
  orderItemsStatus: any = {};
  ApprovedOrderListMap!: Map<string, SingleFileOrderDto[]>;
  popmessgae: any = ""
  showBellmsgAlert = false;
  isConnected = false;
  bell_msg = "";
  constructor(private webSocketService: WebSocketService, private datePipe: DatePipe, private timerService: TimerService,
    private dropboxService: DropboxService, private graphqlService: GraphqlService,private customerService: CustomerService, 
    private sharedService: SharedService, private router: Router,  private route: ActivatedRoute, private cdr: ChangeDetectorRef) {
    this.initializePushNotifications();
    this.sound = new Howl({
      src: ['assets/audio/order_waiting.mp3'],
    });
    this.bellSound = new Howl({
      src: ['assets/audio/bell.mp3'],
    });
  }
  logs: string[] = [];
  items!: any[];
  timer$!: Observable<number>;
  ngOnInit() {
    
    // this.getApprovedOrders();
    console.log = (message: string) => {
      this.logs.push(message);
      // console.log(message); // Log to the browser console
    };


    this.webSocketService.getMessageSubject().subscribe((event) => {
      // Handle incoming WebSocket messages here
      const message = event.data;
      this.triggerPopupMessage(message)
      console.log("message", message)
      this.messages.push(message);
    });
    

    this.webSocketService.getConnectionStatus().subscribe((status: boolean) => {
      this.isConnected = status;
      console.log('WebSocket connection status:', status ? 'Connected' : 'Disconnected');
    });

    this.getApprovalWaitingOrders();


    this.timer$ = this.timerService.getTimer();



    console.log("caption")
    this.loginCap()
    this.loggedIn = true;
  }

  sendMessageToWebSocket(msg: any) {
    this.webSocketService.sendMessage(msg);
  }

  ngAfterViewInit() {


  }
  removeSubstring(str: string, substring: string): string {
    return str.replace(substring, '');
  }
  triggerPopupMessage(mesg: any) {
    const trimmedMessage = String(mesg).trim();
    let originalString = this.removeSubstring(trimmedMessage, "broad cast");
 
 if (trimmedMessage.includes("call from")) {
      this.showBellmsgAlert = false;
      this.showBellMessage(originalString);
    }

     else {
      this.schedulePushNotification(mesg)
      this.approveOrderBYpopup(mesg)
      this.popmessgae = mesg;
    }



  }


  showModal = false;

  showOrderModal = false;

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
      if (msg.includes("pickup")) {

      }
      if (msg.includes("approval") || msg.includes("kitchen")) {
        this.playSound()
        if (this.showSpinner == false) {
          this.getUpdatedApprovalWaitingOrders();
          if (USE_DATABASE) {
            this.getUpdatedApprovedOrdersDb();
          } else {
            this.getUpdatedApprovedOrders();
          }
        } else {
          setTimeout(() => {
            if (this.showSpinner == false) {
              this.getUpdatedApprovalWaitingOrders();
              if (USE_DATABASE) {
                this.getUpdatedApprovedOrdersDb();
              } else {
                this.getUpdatedApprovedOrders();
              }
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


  isSyncingActiveOrders = false;
  syncActiveOrdersDb(callback?: () => void) {
    if (this.isSyncingActiveOrders) {
      if (callback) callback();
      return;
    }
    this.isSyncingActiveOrders = true;

    // Get today's start date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = today.toISOString();

    const currentTab = this.selectedTab;
    const targetStatuses = currentTab === 'waiting_order' ? ['approval_waiting'] : ['Approved', 'print'];

    this.graphqlService.getActiveOrdersBasic(targetStatuses, startDate).subscribe(
      (result: any) => {
        try {
          const activeOrders = result.data?.kubera_order || [];
          
          // 1. Gather status map from DB
          const dbStatusMap = new Map<number, string>();
          activeOrders.forEach((o: any) => dbStatusMap.set(Number(o.id), o.order_status));

          // 2. Identify missing/status-changed IDs we need to fetch
          const idsToFetch: number[] = [];

          activeOrders.forEach((o: any) => {
            const id = Number(o.id);
            const status = o.order_status;
            
            if (currentTab === 'waiting_order') {
              const existing = this.ApprovalOrderList.find(item => item?.order && Number(item.order.id) === id);
              if (!existing || !existing.order || existing.order.order_status !== status) {
                idsToFetch.push(id);
              }
            } else {
              const existing = this.ApprovedOrderList.find(item => item?.order && Number(item.order.id) === id);
              if (!existing || !existing.order || existing.order.order_status !== status) {
                idsToFetch.push(id);
              }
            }
          });

          // 3. Remove locally loaded orders that are no longer in DB or have changed status
          if (currentTab === 'waiting_order') {
            this.ApprovalOrderList = this.ApprovalOrderList.filter(item => {
              if (!item || !item.order) return false;
              const id = Number(item.order.id);
              return dbStatusMap.get(id) === 'approval_waiting';
            });
          } else {
            this.ApprovedOrderList = this.ApprovedOrderList.filter(item => {
              if (!item || !item.order) return false;
              const id = Number(item.order.id);
              const dbStatus = dbStatusMap.get(id);
              return dbStatus === 'Approved' || dbStatus === 'print';
            });
          }

          // 4. Fetch details for missing/changed orders
          if (idsToFetch.length > 0) {
            this.graphqlService.getPaidOrdersByIds(idsToFetch).subscribe(
              (detailsResult: any) => {
                try {
                  const detailedOrders = detailsResult.data?.kubera_order || [];
                  detailedOrders.forEach((dbOrder: any) => {
                    let order: SingleFileOrderDto = new SingleFileOrderDto();
                    order.order = {
                      id: dbOrder.id,
                      order_ref_id: dbOrder.order_ref_id,
                      table_no: dbOrder.table_no,
                      table_place: dbOrder.table_place,
                      order_summary_amount: dbOrder.order_summary_amount,
                      order_additional_service_amount: dbOrder.order_additional_service_amount,
                      order_total_amount: dbOrder.order_total_amount,
                      order_status: dbOrder.order_status,
                      employee: dbOrder.employee,
                      comments: dbOrder.comments,
                      customer_number: dbOrder.customer_number,
                      order_created_time: this.convertToIST(dbOrder.created_at),
                      isExpanded: false
                    };
                    order.orderItems = (dbOrder.order_items || []).map((item: any) => ({
                      id: item.id,
                      item_name: item.item_name,
                      item_quantity: item.item_quantity,
                      item_cost: item.item_cost,
                      item_description: item.item_description,
                      status: item.status,
                      order_id: item.order_id
                    }));

                    if (dbOrder.order_status === 'approval_waiting') {
                      this.ApprovalOrderList = this.ApprovalOrderList.filter(o => o?.order && Number(o.order.id) !== dbOrder.id);
                      this.ApprovalOrderList.push(order);
                    } else if (dbOrder.order_status === 'Approved' || dbOrder.order_status === 'print') {
                      this.ApprovedOrderList = this.ApprovedOrderList.filter(o => o?.order && Number(o.order.id) !== dbOrder.id);
                      this.ApprovedOrderList.push(order);
                    }
                  });

                  // Finalize sorting and conversions
                  this.finalizeActiveOrdersLists();
                  this.isSyncingActiveOrders = false;
                  if (callback) callback();
                } catch (e) {
                  console.error('Exception in getPaidOrdersByIds details handler:', e);
                  this.isSyncingActiveOrders = false;
                  if (callback) callback();
                }
              },
              (err: any) => {
                console.error('Error fetching delta active orders details:', err);
                this.isSyncingActiveOrders = false;
                if (callback) callback();
              }
            );
          } else {
            // No details to fetch, just clean up and render
            this.finalizeActiveOrdersLists();
            this.isSyncingActiveOrders = false;
            if (callback) callback();
          }
        } catch (e) {
          console.error('Exception in getActiveOrdersBasic next handler:', e);
          this.isSyncingActiveOrders = false;
          if (callback) callback();
        }
      },
      (err: any) => {
        console.error('Error fetching basic orders for statuses ' + targetStatuses.join(','), err);
        this.isSyncingActiveOrders = false;
        if (callback) callback();
      }
    );
  }

  finalizeActiveOrdersLists() {
    this.ApprovalOrderList.sort((a, b) => Number(b.order.id) - Number(a.order.id));
    this.ApprovedOrderList.sort((a, b) => Number(b.order.id) - Number(a.order.id));
    this.converteLIstTomap(this.ApprovedOrderList);
    this.getOrderItemStatus(this.ApprovedOrderList);
  }

  files: any[] = [];
  async getApprovalWaitingOrders() {
    if (USE_DATABASE) {
      this.showSpinner = true;
      this.syncActiveOrdersDb(() => {
        this.showSpinner = false;
      });
    } else {
      this.ApprovalOrderList = []
      this.showSpinner = true;
      const folderPath = '/orders/approval_waiting_orders/'; // Replace with the desired folder path
      this.files = await this.dropboxService.getFilesInFolder(folderPath);
      //this.files.shift()
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
  }


  updatedFiles: any[] = [];
  async getUpdatedApprovalWaitingOrders() {
    if (USE_DATABASE) {
      await this.getApprovalWaitingOrders();
    } else {
      //this.ApprovalOrderList = []
      this.showSpinner = true;
      const folderPath = '/orders/approval_waiting_orders/'; // Replace with the desired folder path
      this.updatedFiles = await this.dropboxService.getFilesInFolder(folderPath);
     // this.updatedFiles.shift()
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
    const index = this.ApprovalOrderList.findIndex(order => order?.order?.id === id);
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


  loadingOrderId: any = null;

  async approvedOrder(id: any, order_ref_id: any) {
    this.loadingOrderId = id;
    const sourcePath = '/orders/approval_waiting_orders/' + 'order_' + id + '_order_ref_' + order_ref_id + '.csv';
    let approvedDestinationPath = '/orders/approved_orders/' + 'order_' + id + '_order_ref_' + order_ref_id + '.csv';
    let res: any = "";

    if (!USE_DATABASE) {
      try {
        res = await this.dropboxService.moveFile(sourcePath, approvedDestinationPath);
        console.log('Move file response:', res);
      } catch (e) {
        console.error('Dropbox move file failed:', e);
      }
    }

    if (USE_DATABASE) {
      this.graphqlService.updateOrderStatus(Number(id), 'Approved').subscribe(
        (dbRes: any) => {
          console.log('DB updateOrderStatus response:', dbRes);
          this.sendMessageToWebSocket('kitchen');
          setTimeout(() => {
            this.loadingOrderId = null;
            this.refreshOrder();
          }, 1000);
        },
        (error: any) => {
          console.error('Error updating status in DB:', error);
          this.sendMessageToWebSocket('kitchen');
          setTimeout(() => {
            this.loadingOrderId = null;
            this.refreshOrder();
          }, 1000);
        }
      );
    } else {
      this.sendMessageToWebSocket('kitchen');
      setTimeout(() => {
        this.loadingOrderId = null;
        this.refreshOrder();
      }, 1000);
    }
  }

  selectedTab: any = 'waiting_order';

  selectTab(tabName: string): void {

    this.selectedTab = tabName;

    if (tabName == 'waiting_order') {
      this.getUpdatedApprovalWaitingOrders();
    } else if (tabName == 'Accepted_order') {
      this.getUpdatedApprovedOrders();
    } else if (tabName == 'Accepted_order_db') {
      this.getUpdatedApprovedOrdersDb();
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
    this.loadingOrderId = id;
    this.showSpinner = true;
    const sourcePath = '/orders/approval_waiting_orders/' + 'order_' + id + '_order_ref_' + order_ref_id + '.csv';
    let kitchenDestinationPath = '/orders/decline_orders/' + 'order_' + id + '_order_ref_' + order_ref_id + '.csv';
    
    if (!USE_DATABASE) {
      try {
        await this.dropboxService.moveFile(sourcePath, kitchenDestinationPath);
      } catch (e) {
        console.error('Dropbox move file failed:', e);
      }
    }

    if (USE_DATABASE) {
      this.graphqlService.updateOrderStatus(Number(id), 'declined').subscribe(
        (dbRes: any) => {
          console.log('DB updateOrderStatus to declined response:', dbRes);
          setTimeout(() => {
            this.loadingOrderId = null;
            this.refreshOrder();
          }, 1000);
        },
        (error: any) => {
          console.error('Error updating status to declined in DB:', error);
          setTimeout(() => {
            this.loadingOrderId = null;
            this.refreshOrder();
          }, 1000);
        }
      );
    } else {
      setTimeout(() => {
        this.loadingOrderId = null;
        this.refreshOrder();
      }, 1000);
    }
  }


  approvedFiles: any[] = [];
  async getApprovedOrders() {
    if (USE_DATABASE) {
      this.getApprovedOrdersDb();
      return;
    }

    this.ApprovedOrderList = []
    this.approvedShowSpinner = true;
    const folderPath = '/orders/approved_orders/'; // Replace with the desired folder path
    this.approvedFiles = await this.dropboxService.getFilesInFolder(folderPath);
  //  this.approvedFiles.shift()
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
    if (USE_DATABASE) {
      this.getApprovedOrdersDb();
      return;
    }

    //this.ApprovalOrderList = []
    this.approvedShowSpinner = true;
    const folderPath = '/orders/approved_orders/'; // Replace with the desired folder path
    this.updatedApprovedOrderFiles = await this.dropboxService.getFilesInFolder(folderPath);
   // this.updatedApprovedOrderFiles.shift();
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
    this.getOrderItemStatus(this.ApprovedOrderList);
  }

  async getApprovedOrdersDb() {
    this.approvedShowSpinner = true;
    this.syncActiveOrdersDb(() => {
      this.approvedShowSpinner = false;
    });
  }

  async getUpdatedApprovedOrdersDb() {
    await this.getApprovedOrdersDb();
  }
  CombinedApprovedOrders: any[] = [];
  converteLIstTomap(ApprovedOrderList: any) {
    const yourMap: Map<string, SingleFileOrderDto[]> = (ApprovedOrderList || []).reduce((map: any, obj: SingleFileOrderDto) => {
      if (!obj || !obj.order) return map;
      let key = '';
      if (obj.order.table_place) {
        key = String(obj.order.table_place) + String(obj.order.table_no);
      } else {
        key = String(obj.order.table_no);
      }

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)?.push(obj);

      return map;
    }, new Map<string, SingleFileOrderDto[]>());

    this.ApprovedOrderListMap = yourMap;
    console.log(yourMap);

    // Build the combined orders array
    const combined: any[] = [];
    yourMap.forEach((orders, tableKey) => {
      if (!orders || orders.length === 0 || !orders[0].order) return;
      const firstOrder = orders[0].order;
      
      // Combine order IDs
      const rawOrderIds = orders.map(o => o?.order?.id ? '#' + o.order.id : '').filter(id => id !== '').reverse();
      const orderIds = rawOrderIds.join(', ');
      
      let displayedOrderIds = '';
      let hasMoreOrderIds = false;
      let remainingCount = 0;
      if (rawOrderIds.length > 2) {
        displayedOrderIds = rawOrderIds.slice(0, 2).join(', ');
        hasMoreOrderIds = true;
        remainingCount = rawOrderIds.length - 2;
      } else {
        displayedOrderIds = orderIds;
      }

      // Combine customer numbers (unique, non-empty)
      const customerNumbers = Array.from(new Set(
        orders.map(o => o?.order?.customer_number).filter(n => n && n.trim() !== '')
      )).join(', ');

      // Combine comments (non-empty)
      const commentsList = orders.map(o => o?.order?.comments).filter(c => c && c.trim() !== '');
      const combinedComments = commentsList.length > 0 ? commentsList.join('; ') : '';

      // Combine employees
      const employees = Array.from(new Set(
        orders.map(o => o?.order?.employee).filter(e => e && e.trim() !== '')
      )).join(', ');

      // Combine items (sum quantities for same item name)
      const itemMap = new Map<string, any>();
      orders.forEach(o => {
        if (o.orderItems) {
          o.orderItems.forEach((item: any) => {
            const name = item.item_name;
            if (itemMap.has(name)) {
              const existing = itemMap.get(name);
              existing.item_quantity += item.item_quantity;
            } else {
              itemMap.set(name, {
                item_name: name,
                item_cost: item.item_cost,
                item_quantity: item.item_quantity
              });
            }
          });
        }
      });
      const combinedItems = Array.from(itemMap.values());

      // Sum amounts
      const subtotal = orders.reduce((sum, o) => sum + (o.order?.order_summary_amount || 0), 0);
      const service_charge = orders.reduce((sum, o) => sum + (o.order?.order_additional_service_amount || 0), 0);
      const total_amount = orders.reduce((sum, o) => sum + (o.order?.order_total_amount || 0), 0);

      combined.push({
        tableKey: tableKey,
        table_place: firstOrder.table_place || '',
        table_no: firstOrder.table_no || '',
        orderIds: orderIds,
        displayedOrderIds: displayedOrderIds,
        hasMoreOrderIds: hasMoreOrderIds,
        remainingCount: remainingCount,
        latest_time: firstOrder.order_created_time || '',
        customer_number: customerNumbers,
        comments: combinedComments,
        employee: employees,
        combinedItems: combinedItems,
        subtotal: subtotal,
        service_charge: service_charge,
        total_amount: total_amount,
        rawOrders: orders
      });
    });

    this.CombinedApprovedOrders = combined;
  }
  refreshOrderStatus() {
    this.showSpinner = true
    this.getOrderItemStatus(this.ApprovedOrderList)

  }

  refreshApprovedOrder() {
    if (USE_DATABASE) {
      this.getUpdatedApprovedOrdersDb();
    } else {
      this.getUpdatedApprovedOrders();
    }
  }
  isSticky: boolean = false;
  @HostListener('window:scroll', ['$event'])
  checkScroll() {
    // Add the 'sticky' class to the tabs when scrolling down, and remove it when scrolling up
    this.isSticky = window.scrollY > 100;
  }

  loadingCheckoutTable: string = '';

  async moveOrderToCheckOut() {
    let data = this.entry;
    if (data && data.length > 0 && data[0] && data[0].order) {
      const firstOrder = data[0].order;
      if (firstOrder.table_place) {
        this.loadingCheckoutTable = String(firstOrder.table_place) + String(firstOrder.table_no);
      } else {
        this.loadingCheckoutTable = String(firstOrder.table_no);
      }
    }
    // Close the checkout modal popup immediately
    this.showCheckOutModal = false;

    const clearSpinnerAndClose = () => {
      this.loadingCheckoutTable = '';
      this.showCheckOutModal = false;
      this.refreshApprovedOrder();
    };

    if (this.USE_DATABASE) {
      try {
        if (!data || data.length === 0) {
          clearSpinnerAndClose();
          return;
        }

        const checkoutId = 'CHK_' + new Date().getTime().toString() + '_' + Math.floor(Math.random() * 1000).toString();
        let completed = 0;
        let hasError = false;

        data.forEach((field: any) => {
          if (field && field.order && field.order.id) {
            let id = field.order.id;
            this.graphqlService.updateOrderStatusWithCheckoutId(Number(id), 'checkout', checkoutId).subscribe(
              (dbRes: any) => {
                completed++;
                if (completed === data.length) {
                  clearSpinnerAndClose();
                  this.sendMessageToWebSocket('payment');
                }
              },
              (err: any) => {
                console.error('DB updateOrderStatus checkout error:', err);
                completed++;
                if (!hasError) {
                  hasError = true;
                  clearSpinnerAndClose();
                }
              }
            );
          } else {
            completed++;
            if (completed === data.length) {
              clearSpinnerAndClose();
            }
          }
        });
      } catch (e) {
        console.error("Exception in moveOrderToCheckOut DB path:", e);
        clearSpinnerAndClose();
      }
      return;
    }

    // Dropbox flow
    try {
      if (!data || data.length === 0) {
        clearSpinnerAndClose();
        return;
      }

      const currentDate = new Date();
      const formattedDate = this.datePipe.transform(currentDate, 'yyyyMMddHHmm');
      let orderData: any = [];
      let orderItem: any = [];
      let filepaths: any = [];
      let id = "";

      data.forEach((field: any) => {
        if (field && field.order) {
          let path = '/orders/approved_orders/' + 'order_' + field.order.id + '_order_ref_' + field.order.order_ref_id + '.csv';
          // Check if the path already exists in filepaths array
          if (!filepaths.includes(path)) {
            filepaths.push(path);
            orderData.push(field.order);
            if (orderData[0]) {
              orderData[0].billNo = formattedDate;
            }
            id = id + "_" + field.order.id;
            if (field.orderItems) {
              field.orderItems.forEach((item: any) => {
                orderItem.push(item);
              });
            }
          }
        }
      });

      const csvOrderTableDataCsv = this.objectsToCsv2(orderData);
      const orderItemTableDataListCsv = this.objectsToCsv2(orderItem);
      const orderTableCsvData = csvOrderTableDataCsv + "\n" + orderItemTableDataListCsv;
      const orderTableFilePath = '/orders/checkout_orders/' + 'order' + id + '.csv';

      try {
        await this.dropboxService.uploadFile(orderTableFilePath, orderTableCsvData);
        console.log('File uploaded successfully');
        try {
          await this.dropboxService.deleteFile(filepaths);
        } catch (delErr) {
          console.error('Error deleting approved order files:', delErr);
        }
        clearSpinnerAndClose();
        this.sendMessageToWebSocket('payment');
      } catch (uploadErr) {
        console.warn('Upload failed, trying updateFile:', uploadErr);
        try {
          await this.dropboxService.updateFile(orderTableFilePath, orderTableCsvData);
          console.log('File updated successfully');
          try {
            await this.dropboxService.deleteFile(filepaths);
          } catch (delErr) {
            console.error('Error deleting approved order files on update:', delErr);
          }
          clearSpinnerAndClose();
          this.sendMessageToWebSocket('payment');
        } catch (updateErr) {
          console.error('Error updating file on Dropbox:', updateErr);
          clearSpinnerAndClose();
        }
      }
    } catch (e) {
      console.error("Exception in moveOrderToCheckOut Dropbox path:", e);
      clearSpinnerAndClose();
    }
  }


  isTableNUmberUndefined(): boolean {
    return this.tableNumber == null;
  }
  isTableCustomerNameUndefined(): boolean {
    return this.tableCustomerName == null;
  }
  openOrderMenuModal() {
    sessionStorage.removeItem('table')
    sessionStorage.removeItem('tableSet')
    sessionStorage.removeItem('tablePlace')
    sessionStorage.removeItem('customer_number')
    this.showMenuOrderModal = true
  }
  tableNumber: any
  tableCustomerName:any

  closeOrderMenuModal() {
    this.showMenuOrderModal = false
  }

  openMenuPage() {
    sessionStorage.setItem('table', this.tableNumber);
    sessionStorage.setItem('tablePlace', this.tablePlace);
    sessionStorage.setItem('tableCustomerName', this.tableCustomerName);
    sessionStorage.setItem('tableSet', '1');
    sessionStorage.setItem('isCap', 'true');
    this.sharedService.setShowMenuFlag(1)
    this.sharedService.navigateToMenu('menu');
  }

  showMenuPopup: boolean = false;
  menuPopupTableInfo: string = '';
  orderProcessingStatus: string = '';
  response: any;
  isMenuPopupHidden: boolean = false;

  openExistingMenuPage(data:any) {
    sessionStorage.removeItem('table')
    sessionStorage.removeItem('tableSet')
    sessionStorage.removeItem('tablePlace')
    sessionStorage.removeItem('customer_number')
    
    sessionStorage.setItem('table', data[0].order.table_no);
    sessionStorage.setItem('tablePlace', data[0].order.table_place ?? '');
    const latestCustomerNumber = data.find((obj: any) => obj.order.customer_number !== "")?.order.customer_number || "";
    sessionStorage.setItem('customer_number', latestCustomerNumber);
    sessionStorage.setItem('tableSet', '1');
    sessionStorage.setItem('isCap', 'true');
    this.sharedService.setShowMenuFlag(1);

    this.sharedService.navigateToMenu('menu');
  }

  closeMenuPopup() {
    this.showMenuPopup = false;
    this.isMenuPopupHidden = false;
    this.menuPopupOrderStatus = '';
    document.body.style.overflow = 'auto';
  }

  menuPopupOrderStatus: string = '';

  onMenuPopupOrderStatus(status: string) {
    this.menuPopupOrderStatus = status;
    this.orderProcessingStatus = status;
    if (status === 'processing') {
      this.isMenuPopupHidden = true;
    }
    if (status === 'success') {
      // Send websocket message for approval
      this.sendMessageToWebSocket('approval');
      this.closeMenuPopup();
    }
  }

  onMenuPopupOrderResponse(response: any) {
    console.log('Menu popup order response:', response);
    this.response = response;
  }


  iskotPopupOpen = false;

  selectedOrder: any;
  openPopup(): void {
    this.iskotPopupOpen = true;
  }

  printValue: any
  showInvoice(invoiceData: any) {
    this.openPopup();
    this.printValue = invoiceData

  }

  closePopup(): void {
    this.iskotPopupOpen = false;
  }

  getOrderItemStatus(apporvedList: any) {
    if (apporvedList && apporvedList.length > 0) {
      this.orderItemsStatusList = apporvedList.map((item: any) => {
        if (!item || !item.order) return null;
        return {
          id: item.order.id,
          table_no: item.order.table_no,
          table_place: item.order.table_place,
          created_at: item.order.order_created_time,
          order_status: item.order.order_status,
          employee: item.order.employee,
          comments: item.order.comments,
          order_items: (item.orderItems || []).map((oi: any) => ({
            id: oi.id,
            item_name: oi.item_name,
            item_quantity: oi.item_quantity,
            status: oi.status,
            order_id: oi.order_id
          }))
        };
      }).filter((item: any) => item !== null);
    } else {
      this.orderItemsStatusList = [];
    }
  }

  updateOrderItem(orderItem: any, Status: any) {
    this.showSpinner = true;
    this.graphqlService.updateOrderItem(orderItem.id, Status).subscribe(
      (result: any) => {
        let orderItemResponse = result.data.update_kubera_order_item.returning[0];
        this.orderItemsStatusList.forEach((order: any) => {
          if (order.id == orderItemResponse.order_id) {
            order.order_items = order.order_items.map((item: any) => {
              if (item.id == orderItemResponse.id) {
                // Create a new object with updated properties
                return { ...item, status: orderItemResponse.status };
              }
              return item;
            });
            // Optionally, you might want to break out of the loop if the ID is unique
            return;
          }
        });
        this.showSpinner = false;
        console.log(result.data); // This will contain the data you queried
      },
      (error: any) => {
        this.showSpinner = false;
        console.error('Error fetching data:', error);
      }
    );
  }

  updateOrderStatuskot(orderId: any, Status: any) {
    this.showSpinner = true;
    this.graphqlService.updateOrderStatus(orderId, Status).subscribe(
      (result: any) => {
        let orderItemResponse = result.data.update_kubera_order.returning[0];
        this.orderItemsStatusList = this.orderItemsStatusList.map((order: any) => {
          if (order.id === orderItemResponse.id) {
            return { ...order, order_status: orderItemResponse.order_status };
          } else {
            return order;
          }
        });
        this.showSpinner = false;
        console.log(result.data); // This will contain the data you queried
      },
      (error: any) => {
        this.showSpinner = false;
        console.error('Error fetching data:', error);
      }
    );
  }

  pickupOrder(orderId: any, Status: any, table_no: any) {

    this.sendMessageToWebSocket("\n test");
  }


  getStatusClass(status: string): string {
    switch (status) {
      case 'Done':
        return 'status-done';
      case 'progress':
        return 'status-pending';
      case 'Cancel':
        return 'status-cancel';
      // Add more cases if needed
      default:
        return ''; // Default class when status doesn't match any case
    }
  }


  convertToIST(utcDate: string): string {
    const date = new Date(utcDate);
    let istDate = this.datePipe.transform(date, 'yyyy-MM-dd HH:mm:ss', 'IST');
    istDate = this.convertTo12HourFormat(istDate!);
    return istDate || '';
  }

  toggleModal(): void {
    console.log('toggleModal() triggered. Previous state of showOrderModal:', this.showOrderModal);
    this.showOrderModal = !this.showOrderModal;
    console.log('toggleModal() triggered. New state of showOrderModal:', this.showOrderModal);
    this.toggleBodyScroll(this.showOrderModal);
    this.cdr.detectChanges();
  }

  convertTo12HourFormat(time: string): string {
    const timeArray = time.split(' ');
    const [datePart, timePart] = timeArray;
    const [hours, minutes, seconds] = timePart.split(':');

    let period = 'AM';
    let hours12 = parseInt(hours, 10);

    if (hours12 >= 12) {
      period = 'PM';
      if (hours12 > 12) {
        hours12 -= 12;
      }
    }

    const twelveHourFormat = `${datePart} ${hours12}:${minutes}:${seconds} ${period}`;
    return twelveHourFormat;
  }

  @HostListener('window:keyup.esc')
  onEscKeyup() {
    if (this.showOrderModal) {
      this.toggleModal();
    }
  }

  private toggleBodyScroll(shouldEnable: boolean): void {
    const body = document.body;
    if (shouldEnable) {
      body.classList.add('right-modal-open');
    } else {
      body.classList.remove('right-modal-open');
    }
  }

  updateOrderStatus(event: any, object: any) {
    if (event == 'kot') {

      if (object.order_status == 'approval_waiting') {
        this.updateOrderStatuskot(object.id, "Done")
      } else if (object.order_status == 'Approved' || object.order_status == 'print') {
        this.updateOrderStatuskot(object.id, "print")
      }

    }
  }

  tablePlace: string = '';
  showDropdown: boolean = false;
  options: string[] = ['GR','GI', 'GO', 'FO', 'FI', 'PG', 'PF', 'C'];

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  selectOption(option: string) {
    this.tablePlace = option;
    this.showDropdown = false;
  }


  handleLoginStatus(status: boolean) {
    this.loggedIn = status;
  }
  loginCap() {
    let localStorageData = localStorage.getItem("cap_user");

    if (localStorageData) {
      let user_details = JSON.parse(atob(localStorage.getItem('cap_user')!));
      this.employee_name = user_details.user_name;
      let is_user_Session_Expired: any = this.validateUserSession(user_details);
      if (!is_user_Session_Expired) {
        this.loggedIn = !is_user_Session_Expired;
      } else {
        this.loggedIn = false
        localStorage.removeItem("cap_user");

      }
    } else {
      this.loggedIn = false
    }

  }


  validateUserSession(user_details: any) {

    const givenDateObj = new Date(user_details.renew_date);

    // Adjust for EST to IST time difference (9 hours and 30 minutes)
    givenDateObj.setTime(givenDateObj.getTime() + (9 * 60 + 30) * 60 * 1000);

    const currentDate = new Date();

    const timeDiff = currentDate.getTime() - givenDateObj.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    let is_Exceeeded = hoursDiff >= user_details.expire_in;
    return is_Exceeeded;
  }
  alertMessages: string[] = [];
  addNewAlert(newMessage: string) {
    // Add the new message to the beginning of the array
    this.alertMessages.unshift(newMessage);

    // Display the alert
    this.showBellmsgAlert = true;
  }

  entry:any;
  showCheckOutConfirmationModal(entry:any) {
  this.showCheckOutModal = true;
  this.entry = entry;
}
closeCheckOutModal(){
  this.showCheckOutModal = false;

}

  showBellMessage(msg:any) {
    this.showBellmsgAlert = true;
    this.bell_msg = msg;
    this.bellSound.play()
    navigator.vibrate([200, 100, 200]);  
    this.addNewAlert( this.bell_msg )
    // Hide the alert message after 10 minutes (600,000 ms)
    setTimeout(() => {
      if (this.alertMessages.length > 0) {
        // Remove the oldest message (the last in the array)
        this.alertMessages.pop();
        // Hide the alert if there are no more messages
        if (this.alertMessages.length === 0) {
          this.showBellmsgAlert = false;
        }
      }
    }, BELL_MSG_TIME_OUT); // 1 minute = 60000 ms
  }

  isMemberShipModalOpen: boolean = false;
  showUserNotFoundError: boolean = false;
  showUserFoundBanner: boolean = false;
  isProfileModalOpen: boolean = false;
  customerMobileNumber: string = '';
  GenerateMemberShip()
  {
this.isMemberShipModalOpen = true
  }

  closeMemberShipModal() {
    this.isMemberShipModalOpen = false;
  }

  checkProfile(){
    this.showSpinner = true
  
   this.customerService.getCustomerPointAndDetailsByNumber(this.customerMobileNumber).subscribe((response) => {

      if (response.data.kubera_profile_customer_points.length>0) {
        this.showUserNotFoundError = false
        this.showUserFoundBanner = true
    }else{
      this.showUserNotFoundError = true
      this.showUserFoundBanner = false
    }
    this.showSpinner = false
  })
  }


  // Card rotation
  mobile_number:any;
  getProfileDetails(){
    this.isProfileModalOpen = true;
  }

  closeProfileModalClose() { 
    this.isProfileModalOpen = false;
  }

  navigateToProfile(){
    const encodedData = btoa(this.mobile_number);
    let url = this.router.serializeUrl(
      this.router.createUrlTree(['/coffeeShop1/profile'], { queryParams: { data: encodedData } })
    );
    if (window.location.hostname === 'localhost') {
       url = this.router.serializeUrl(
        this.router.createUrlTree(['/profile'], { queryParams: { data: encodedData } })
      );
    }
    window.open(url, '_blank');
    this.closeProfileModalClose()
    }
  
}
