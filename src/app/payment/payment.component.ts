import { AfterViewInit, Component, HostListener } from '@angular/core';
import { WebSocketService } from '../service/WebSocket.service';
import { DatePipe } from '@angular/common';
import { DropboxService } from '../service/dropbox.service';
import { SharedService } from '../service/shared-service';
import { SingleFileOrderDto } from '../dtos/singleFileOrderDto';
import Papa from 'papaparse';
import { PaidFileOrderDto } from '../dtos/paidFileOrderDto';
import { DataService } from '../service/data.service';
import { BELL_MSG_TIME_OUT, KUBERA_PAYMENT_EDIT_LOGIN_PASSWORD } from '../common/constanst';
import { HasuraApiService } from '../service/hasura.api.service';
import { GraphqlService } from '../service/graphql.service';
import { CustomerService } from '../service/customer.service';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss']
})
export class PaymentComponent implements AfterViewInit {
  selectedTab: string = 'waiting_order';
  loggedIn: boolean = false;
  private sound: Howl;
  private bellSound: Howl;
  currentDateTimeInIST: any
  showSpinner: boolean = false;
  showPaidSpinner: boolean = false;
  printValue: any
  TotalPaidAmount: any = 0;
  TotalCashAmount: any = 0;
  TotalOnlineAMpunt: any = 0;
  TotalActualAmount: any = 0;
  showBellmsgAlert = false;
  isConnected = false;
  selectedDiscount: number = 0; // Default discount is 0

  bell_msg = "";
  constructor(private webSocketService: WebSocketService, private datePipe: DatePipe, private dropboxService: DropboxService,
    private sharedService: SharedService, private dataService: DataService, private hasuraDataService: HasuraApiService,
     private graphqlService: GraphqlService, private customerService: CustomerService) {
    this.initializePushNotifications();
    this.sound = new Howl({
      src: ['assets/audio/order_waiting.mp3'],
    });
    this.bellSound = new Howl({
      src: ['assets/audio/bell.mp3'],
    });
  }
  ngAfterViewInit(): void {

  }



  ngOnInit() {

    this.webSocketService.getConnectionStatus().subscribe((status: boolean) => {
      this.isConnected = status;
      console.log('WebSocket connection status:', status ? 'Connected' : 'Disconnected');
    });

    this.webSocketService.getMessageSubject().subscribe((event) => {
      // Handle incoming WebSocket messages here
      const message = event.data;
      this.triggerPopupMessage(message)
      console.log("message", message)

    });

    this.getCheckOutOrders();
    //this.getPaidOrders();

    console.log("caption")

    this.revokeEditAccess()
  }
  removeSubstring(str: string, substring: string): string {
    return str.replace(substring, '');
  }
  triggerPopupMessage(mesg: any) {
    const trimmedMessage = String(mesg).trim();
    let originalString = this.removeSubstring(trimmedMessage, "broad cast");
 
    if (trimmedMessage.includes("editApprove")) {
      this.showAlert = false;
      this.alertMessage = 'Broadcast Edit Approved!';
      this.showEditApprovalAlertMessage();
    }
    else if (trimmedMessage.includes("editRevoke")) {
      this.showEditRevokeAlert = false;
      this.alertMessage = 'Broadcast Edit Approved!';
      this.showEditRevokeAlertMessage();
    } else if (trimmedMessage.includes("call from")) {
      this.showBellmsgAlert = false;
      this.showBellMessage(originalString);
    }

     else {
      this.schedulePushNotification(mesg)
      this.approveOrderBYpopup(mesg)
    }



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
    // this.files.shift() 
    for (const file of this.files) {
      file.data = await this.dropboxService.getFileData(file.path_display);
      const respo = this.sharedService.parseNestedCsvToObjectDynamicHeader(file.data.fileBlob)
      let order: SingleFileOrderDto = new SingleFileOrderDto();
      order.filePath = file.name
      order.order = (await respo).headers1
      order.orderItems = (await respo).headers2
      //order.orderItems =     order.orderItems.filter((item: any) => item.item_quantity !== "0");
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
  saleDate: any
  async getPaidOrders() {
    this.paidOrderList = []
    this.showPaidSpinner = true;
    const folderPath = '/orders/paid_orders/'; // Replace with the desired folder path
    this.paidFiles = await this.dropboxService.getFilesInFolder(folderPath);
    //  this.paidFiles.shift() 
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
      this.TotalPaidAmount = this.TotalPaidAmount + parseFloat(order.paidDetails[0].paid_amount);
      this.TotalActualAmount = this.TotalActualAmount + parseFloat(order.paidDetails[0].actual_amount);

      if (order.paidDetails[0].mode == "cash") {
        this.TotalCashAmount = this.TotalCashAmount + parseFloat(order.paidDetails[0].paid_amount);
      } else {
        this.TotalOnlineAMpunt = this.TotalOnlineAMpunt + parseFloat(order.paidDetails[0].paid_amount);
      }
    }
    this.paidOrderList.sort((a, b) => a.order.id - b.order.id);
    this.paidOrderList.reverse()
    this.showPaidSpinner = false;
    if (this.paidOrderList.length > 0) {
      this.saleDate = this.sharedService.convertDateTimeToDateString(this.paidOrderList[0].paidDetails[0].period);
    }

  }

   showInvoice(invoiceData: any) {
    let customer_detail:any ={}
    this.printValue = invoiceData
    if(invoiceData.order[0].customer_number != ""){
   this.getMemberShipDetails(invoiceData.order[0].customer_number);
    }
    else{
      this.openPopup();
    }
   
  }

  getMemberShipDetails(customerNumber: any) {
    this.showSpinner = true;
    this.customerService.getCustomerDetailsWithPointsAndMemberShipByNumber(customerNumber).subscribe((response:any) => {
      if (response.data.kubera_profile_customer_details.length > 0) {  
        this.printValue.customer_detail = response.data.kubera_profile_customer_details[0]  
        this.printValue.isDiscount = true 
      }
      this.showSpinner = false;
      this.openPopup();

    })
  }

  updatedPaidFiles: any[] = [];
  async getUpdatedPaidOrders() {
    //this.ApprovalOrderList = []
    this.showPaidSpinner = true;
    const folderPath = '/orders/paid_orders/'; // Replace with the desired folder path
    this.updatedPaidFiles = await this.dropboxService.getFilesInFolder(folderPath);
    // this.updatedPaidFiles.shift() 
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
      this.TotalPaidAmount = this.TotalPaidAmount + parseFloat(order.paidDetails[0].paid_amount);
      this.TotalActualAmount = this.TotalActualAmount + parseFloat(order.paidDetails[0].actual_amount);
      if (order.paidDetails[0].mode == "cash") {
        this.TotalCashAmount = this.TotalCashAmount + parseFloat(order.paidDetails[0].paid_amount);
      } else {
        this.TotalOnlineAMpunt = this.TotalOnlineAMpunt + parseFloat(order.paidDetails[0].paid_amount);
      }
    }
    addedNewFiles.forEach(value => this.paidFiles.push(value))
    removeOldFiles.forEach(value => this.removePaidItem(value))
    this.paidOrderList.sort((a, b) => a.order.id - b.order.id);
    this.paidOrderList.reverse()
    this.paidOrderList.forEach(order => {
      let conItems = this.combineOrderItemsQuantities(order.orderItems)
      order.orderItems = conItems
    })
    if (this.paidOrderList.length > 0) {
      this.saleDate = this.sharedService.convertDateTimeToDateString(this.paidOrderList[0].paidDetails[0].period);
    }

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

  formatStringWithTwoDecimalPlaces(value: any): string {
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
    // this.updatedFiles.shift()
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
      //order.orderItems =     order.orderItems.filter((item: any) => item.item_quantity !== "0");
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
  selectedOrder: any;
  selected_customer_number:any
  new_loyalty_points:any = 0
  trigger_loyalty_Call: boolean = false;
  openPopup(): void {
    this.isPopupOpen = true;
  }

  closePopup(): void {
    this.isPopupOpen = false;
  }
  customer_Details:any={}
  customerName:any='loading..'
  existing_loyalty_points:any='loading..'
  membership_Status:any='';

clearAllFields()  {
this.customer_Details = {};
this.customerName = 'loading..';
this.existing_loyalty_points = 'loading..';
}
  paymentDone(order: any) {
    this.clearAllFields()
    this.selected_customer_number = order.order.find((obj: any) => obj.customer_number !== "")?.customer_number || "";
    this.isPaymentTypePopupOpen = true;
    this.selectedOrder = order;
    if( this.selected_customer_number != "")
    {
      if(order.customer_detail!=null)
      {
        this.trigger_loyalty_Call = true
        // this.getCustomerDetailsByNumber(this.selected_customer_number)
        this.customer_Details = order.customer_detail
       this.customerName =  this.customer_Details.name 
       this.existing_loyalty_points =  this.customer_Details.customer_points[0].available_points
       if( this.customer_Details.customer_member_ship!=null)
       {
        this.membership_Status = this.isMemberShipStatus( this.customer_Details.customer_member_ship)
       }else{
        this.membership_Status = "No Membership"
       }
      
      }else
      {
        
        this.getCustomerDetailsByNumber(this.selected_customer_number, order)
      }



    }else
    {
      this.trigger_loyalty_Call = false
    }
    
  }


  isMemberShipStatus(memberShip:any){
    let expiryDateParts = memberShip.expiry_date.split("-");
let expiryDate = new Date(expiryDateParts[0], expiryDateParts[1] - 1, expiryDateParts[2]);
    let today = new Date();
    today.setHours(0, 0, 0, 0); // set time to midnight
    expiryDate.setHours(0, 0, 0, 0); // set time to midnight
    
    if (expiryDate >= today) {
      return "Active";
    } else {
      return "Expired";
    }
  }
  

  getCustomerDetailsByNumber(customer_number: any, order:any) {
    this.showSpinner = true;
    this.customerService.getCustomerDetailsWithPointsAndMemberShipByNumber( this.selected_customer_number).subscribe((response) => {
      if (response.data.kubera_profile_customer_details.length > 0) {

      this.customer_Details = response.data.kubera_profile_customer_details[0]  
      this.customerName =  this.customer_Details.name 
      this.existing_loyalty_points =  this.customer_Details.customer_points[0].available_points
      this.trigger_loyalty_Call = true
      if( this.customer_Details.customer_member_ship!=null)
        {
         this. membership_Status = this.isMemberShipStatus( this.customer_Details.customer_member_ship)
         order.customer_detail = response.data.kubera_profile_customer_details[0]  
         order.isDiscount = true 
        }else{
         this. membership_Status = "No Membership"
        }
      }
      else
      {
        this.trigger_loyalty_Call = false
        this.customerName = "user not found"
      }
      this.showSpinner = false;
    })
  }
  generateLoyaltyPoints(amount: number) {
    this.new_loyalty_points = Math.floor(amount / 50) * 2;
  }

  isOwnerPopupOpen: any = false;
  paymentDoneOwner(order: any) {
    this.isOwnerPopupOpen = true;
    this.selectedOrder = order;
  }

  makeOwnerPaymentCompleted() {
    this.moveOrderToOwnerPaid(this.selectedOrder);
  }
  closeOwnerPasswordPopup() {
    this.isOwnerPopupOpen = false;
  }
  makePaymentCompleted() {
    //convert the object tpo csv and save to the paidorder folder 
    this.moveOrderToPaid(this.selectedOrder);

  }

  async sendMailPaymentOrder(data: any) {

    const value = this.objectsToCsv2(data);

    let paymentType: any = {};
    let request: any = {};
    let attachment: any = {};
    let fileName: any = data.filePath
    paymentType.paid_amount = this.amount;
    paymentType.actual_amount = this.formatStringWithTwoDecimalPlaces(this.getActualAmount(data.orderItems));
    paymentType.mode = this.paymentMode
    paymentType.period = this.sharedService.updateCurrentDateTimeInIST();
    if(data.customer_detail != null){
      this.addDiscountToActualAmount(data, paymentType )
    }
    const csvOrderTableDataCsv = this.objectsToCsv2(data.order);
    const orderItemTableDataListCsv = this.objectsToCsv2(data.orderItems);
    const paymentTypeListCsv = this.objectsToCsv2([paymentType]);
    const orderTableCsvData = paymentTypeListCsv + "\n" + csvOrderTableDataCsv + "\n" + orderItemTableDataListCsv
    const orderTableFilePath = '/orders/paid_orders/' + fileName;
    let order_ids =  data.order.map((obj: any) => obj.id).join(',')
    attachment.content = orderTableCsvData
    attachment.fileName = fileName
    request.recipient = "cafekubera2223@gmail.com";
    request.msgBody = "Hey! In\nThis is a message from the cafe kubera order payment completed \n\nThanks";
    request.subject = "details for the orders - " + order_ids + " for  the table " + data.order[0].table_no + " on " + paymentType.period;
    request.attachment = attachment;
    this.dataService.postData(request).subscribe();
    let kubera_payment_details_insert_input: any = {};
    //added code for updating payment details in database
    kubera_payment_details_insert_input.order_id = order_ids
    kubera_payment_details_insert_input.payment_mode = paymentType.mode
    kubera_payment_details_insert_input.paid_amount = parseFloat(paymentType.paid_amount)
    kubera_payment_details_insert_input.actual_amount = parseFloat(paymentType.actual_amount)
    kubera_payment_details_insert_input.created_at = this.sharedService.updateCurrentDateInIST()
    kubera_payment_details_insert_input.created_time =  paymentType.period 
    kubera_payment_details_insert_input.bill_no =  data.order[0].billNo
    this.graphqlService.insertPaymentDetails(kubera_payment_details_insert_input).subscribe();
    //need add the points to the profile and sen mail to the customer
    if(this.trigger_loyalty_Call)
    {
      this.createLoyaltyPoints(data, this.amount, data.order[0].billNo);
    }
  
  }
  createLoyaltyPoints(value:any, paid_amount:any, bill_no:any)
  {
    this.showSpinner = true;
    let customer_payment_details: any = {};
    let customerPointHistory: any = {};
    let new_redeem_points =  this.customer_Details.customer_points[0].available_points + this.new_loyalty_points
    let new_total_points = this.customer_Details.customer_points[0].total_points + this.new_loyalty_points
    customerPointHistory.new_redeem_points = new_redeem_points
    customerPointHistory.old_redeem_points = this.customer_Details.customer_points[0].available_points
    customerPointHistory.point_status = 'added'
    customerPointHistory.redeem_points = this.new_loyalty_points
    customerPointHistory.redeem_waiter = 'admin',
    customerPointHistory.redeem_date=  this.sharedService.formatDateAsString( new Date()) 
    customerPointHistory.customer_details_id = this.customer_Details.id
    let data = {
      data: customerPointHistory
    }
    customer_payment_details.bill_no = bill_no
    customer_payment_details.paid_amount = paid_amount
    customer_payment_details.points = this.new_loyalty_points
    customer_payment_details.customer_point_history = data
    customer_payment_details.customer_details_id = this.customer_Details.id
    this.customerService.createCustomerPaymentDetailsAndHistory(customer_payment_details).subscribe();
    this.customerService.updateCustomerPointsAndDetails(this.customer_Details.id, new_redeem_points,new_total_points).subscribe();
    this.sendMailToCustomerForLoyaltyPoints(this.customer_Details, new_redeem_points, this.new_loyalty_points)
   
  }
  async sendMailToCustomerForLoyaltyPoints(customer_detail: any, new_redeem_points: any, new_loyalty_points: any) {

    let request: any = {};
    request.recipient = customer_detail.email_id;
    request.msgBody = "Hey! " + customer_detail.name +"," + "\n Thank you for visiting Cafe Kubera. We added " 
    + new_loyalty_points + " loyalty points to your account. Currently you have Total of " + new_redeem_points + " points in you account."
      + " \n\nThanks and Regards,\nCAFE KUBERA,\n3rd line, near Guru Nanak Colony,\nKanaka Durga Gazetted Officers Colony, \nGuru Nanak Colony, Vijayawada, Andhra Pradesh 520007.\ncontact: 9652544239";
    request.subject = "Thank you for visiting Cafe Kubera"
    this.dataService.SendSimpleMail(request).subscribe();
    

  }
  async sendMailAdminPaymentOrder(data: any) {

    const value = this.objectsToCsv2(data);

    let paymentType: any = {};
    let request: any = {};
    let attachment: any = {};
    let fileName: any = data.filePath
    paymentType.paid_amount = this.amount;
    paymentType.actual_amount = this.formatStringWithTwoDecimalPlaces(this.getActualAmount(data.orderItems));
    paymentType.mode = this.paymentMode
    paymentType.period = this.sharedService.updateCurrentDateTimeInIST();

    const csvOrderTableDataCsv = this.objectsToCsv2(data.order);
    const orderItemTableDataListCsv = this.objectsToCsv2(data.orderItems);
    const paymentTypeListCsv = this.objectsToCsv2([paymentType]);
    const orderTableCsvData = paymentTypeListCsv + "\n" + csvOrderTableDataCsv + "\n" + orderItemTableDataListCsv
    const orderTableFilePath = '/orders/admin_orders/' + fileName;
    attachment.content = orderTableCsvData
    attachment.fileName = fileName
    request.recipient = "cafekubera2223@gmail.com";
    request.msgBody = "Hey! In\nThis is a message from the cafe kubera , Admin order payment completed \n\nThanks";
    request.subject = "!!! ADMIN ORDER - details for the orders - " + data.order.map((obj: any) => obj.id).join(',') + " for  the table " + data.order[0].table_no + " on " + paymentType.period;
    request.attachment = attachment;
    this.dataService.postData(request).subscribe();
  }


  isMemberShipValid(memberShip:any){
    let expiryDateParts = memberShip.expiry_date.split("-");
let expiryDate = new Date(expiryDateParts[0], expiryDateParts[1] - 1, expiryDateParts[2]);
    let today = new Date();
    today.setHours(0, 0, 0, 0); // set time to midnight
    expiryDate.setHours(0, 0, 0, 0); // set time to midnight
    
    if (expiryDate >= today) {
      return true;
    } else {
      return false;
    }
  }
  

  addDiscountToActualAmount(data:any, paymentType:any)
  {
  let customer_details = data.customer_detail
  if(customer_details.customer_member_ship != null && this.isMemberShipValid(customer_details.customer_member_ship))
  {
    let discountPercentage = 10
    paymentType.un_discount_actualAmount =  paymentType.actual_amount;
    paymentType.actual_amount =paymentType.actual_amount - (paymentType.actual_amount * 0.10);
    paymentType.discountPercentage =  discountPercentage
  }

  }

  async moveOrderToPaid(data: any) {
    this.showSpinner = true;

    const value = this.objectsToCsv2(data);

    let paymentType: any = {};
    let fileName: any = data.filePath
    paymentType.paid_amount = this.amount;
    paymentType.actual_amount = this.formatStringWithTwoDecimalPlaces(this.getActualAmount(data.orderItems));
    paymentType.mode = this.paymentMode
    paymentType.period = this.sharedService.updateCurrentDateTimeInIST();
    if(data.customer_detail != null){
      this.addDiscountToActualAmount(data, paymentType )
    }
    delete data.order[0].table_place;
    delete data.order[0].customer_number;
    const csvOrderTableDataCsv = this.objectsToCsv2(data.order);
    const orderItemTableDataListCsv = this.objectsToCsv2(data.orderItems);
    const paymentTypeListCsv = this.objectsToCsv2([paymentType]);
    const orderTableCsvData = paymentTypeListCsv + "\n" + csvOrderTableDataCsv + "\n" + orderItemTableDataListCsv
    const orderTableFilePath = '/orders/paid_orders/' + fileName;
    await this.dropboxService.uploadFile(orderTableFilePath, orderTableCsvData).then(async (response: any) => {
      console.log('File uploaded:', response);
      let checkOutOrder = "/orders/checkout_orders/" + fileName
      let resw = await this.dropboxService.deleteFile([checkOutOrder]);
      this.sendMailPaymentOrder(data);
      console.log(resw);
      setTimeout(() => { this.closePaymentTypePopup(); this.refreshOrder(); }, 3000);

      //delete the approved orders

    }).catch((error) => {
      this.dropboxService.updateFile(orderTableFilePath, orderTableCsvData).then((response: any) => {
        console.log('File updated:', response);
        this.dropboxService.deleteFile(["/orders/paid_orders/" + fileName]);
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


  async moveOrderToOwnerPaid(data: any) {
    this.showSpinner = true;

    const value = this.objectsToCsv2(data);

    let paymentType: any = {};
    let fileName: any = data.filePath
    paymentType.paid_amount = "0";
    paymentType.actual_amount = this.formatStringWithTwoDecimalPlaces(this.getActualAmount(data.orderItems));
    paymentType.mode = "online"
    paymentType.period = this.sharedService.updateCurrentDateTimeInIST();
    delete data.order[0].table_place;
    const csvOrderTableDataCsv = this.objectsToCsv2(data.order);
    const orderItemTableDataListCsv = this.objectsToCsv2(data.orderItems);
    const paymentTypeListCsv = this.objectsToCsv2([paymentType]);
    const orderTableCsvData = paymentTypeListCsv + "\n" + csvOrderTableDataCsv + "\n" + orderItemTableDataListCsv
    const orderTableFilePath = '/orders/admin_orders/' + fileName;
    await this.dropboxService.uploadFile(orderTableFilePath, orderTableCsvData).then(async (response: any) => {
      console.log('File uploaded:', response);
      let checkOutOrder = "/orders/checkout_orders/" + fileName
      let resw = await this.dropboxService.deleteFile([checkOutOrder]);
      this.sendMailAdminPaymentOrder(data);
      console.log(resw);
      setTimeout(() => { this.closeOwnerPasswordPopup(); this.refreshOrder(); }, 3000);

      //delete the approved orders

    }).catch((error) => {
      this.dropboxService.updateFile(orderTableFilePath, orderTableCsvData).then((response: any) => {
        console.log('File updated:', response);
        this.dropboxService.deleteFile(["/orders/admin_orders/" + fileName]);
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
    return orderCost + (orderCost * 5) / 100;
  }

  closePaymentTypePopup() {
    this.isPaymentTypePopupOpen = false;
  }

  isNewProfile: boolean = false;
  paymentMode: any = "cash"
  amount: any;
  paymentMde(mode: any) {
    if (mode) {
      this.paymentMode = "online";
    } else if (!mode) {
      this.paymentMode = "cash";
    }
  }
  isAmountUndefined(): boolean {
    this.generateLoyaltyPoints(this.amount)
    return this.amount == null;
  }




  isPasswordPopupOpen: any = false
  username: any
  editOrder: any
  editableOrder: any
  originalEditOrder:any;
  openEditOrderPasswordPopup(order: any) {
    if (!this.apiEditStatus) {
      this.username = "";
      this.isPasswordPopupOpen = true
      this.editOrder = order;
    } else {
      this.openEditOrderPopup()
    }


  }

  closePasswordPopup() {
    this.isPasswordPopupOpen = false
    this.editOrder = undefined;
  }
  checkAdminLogin() {

    if (this.username == KUBERA_PAYMENT_EDIT_LOGIN_PASSWORD) {
      console.log("sucess")
      this.openEditOrderPopup()
    }
    else {
      console.log("error")
    }
  }
  apiEditStatus: any = false
  editApproval() {

    if (!this.apiEditStatus) {
      this.showSpinner = true;
      this.hasuraDataService.getConfigDetailsByType("edit").subscribe((response) => {
        // Handle the response here
        const editStatus = response.kubera_Account_kuber_config[0].status;
        this.apiEditStatus = editStatus.toLowerCase() === 'true'
        if (editStatus == "true") {
          this.showSpinner = false;
          this.openEditOrderPopup()
          console.log("trying to the edit access");
          setTimeout(() => {
            console.log("removing the edit access");
            this.revokeEditAccess();
          }, 60000); // 300000 ms = 5 minutes

        } else {
          this.showSpinner = false;
        }

      },
        (error) => {
          // Handle errors here
          console.error(error);
        });
    } else {
      this.showSpinner = false;
      this.openEditOrderPopup()
    }

  }
  revokeEditAccess() {
    this.apiEditStatus = false;
    this.webSocketService.sendMessage("editRevoke");
    this.hasuraDataService.updateConfigByType("edit", "false").subscribe();
  }

  isEditOrderPopUpOpen: any = false
  editMode: boolean[] = [];
  openEditOrderPopup() {

    this.downloadCheckOutFileByFileName(this.editOrder.filePath);



  }

  closePEditOrderPopUp() {
    this.isEditOrderPopUpOpen = false
  }

  async downloadCheckOutFileByFileName(path: any) {
    this.showSpinner = true;
    let file: any;
    file = await this.dropboxService.getFileData("/orders/checkout_orders/" + path);
    const respo = this.sharedService.parseNestedCsvToObjectDynamicHeader(file.fileBlob)
    let order: SingleFileOrderDto = new SingleFileOrderDto();
    order.filePath = file.name
    order.order = (await respo).headers1
    order.orderItems = (await respo).headers2
    this.editableOrder = order
    this.originalEditOrder = {
      filePath: file.name,
      order: JSON.parse(JSON.stringify( (await respo).headers1)),
      orderItems: JSON.parse(JSON.stringify((await respo).headers2))
    };
    this.editMode = new Array(this.editableOrder.orderItems.length).fill(false);
    this.showSpinner = false;
    this.isPasswordPopupOpen = false
    this.isEditOrderPopUpOpen = true
  }


  toggleEditMode(index: number): void {
    this.editMode[index] = !this.editMode[index];

  }

  objectsToCsv2(objects: any[]): string {
    const csv = Papa.unparse(objects, {
      header: true
    });
    return csv;
  }
  objectsToCsv(objects: any[]): string {
    const csv = Papa.unparse(objects);
    return csv;
  }
  async updateEditOrder() {
    this.showSpinner = true;
    const csvOrderTableDataCsv = this.objectsToCsv2(this.editableOrder.order);
    const orderItemTableDataListCsv = this.objectsToCsv2(this.editableOrder.orderItems);
    const orderTableCsvData = csvOrderTableDataCsv + "\n" + orderItemTableDataListCsv
    const orderTableFilePath = '/orders/checkout_orders/' + this.editOrder.filePath;
    await this.dropboxService.updateFile(orderTableFilePath, orderTableCsvData).then(async (response: any) => {
      console.log('File uploaded:', response);
      //delete the approved orders
      this.showSpinner = false;
      this.fetchNewOrder(this.editOrder.filePath);
      this.sendMailForEditOrder();
    }).catch((error) => {
      this.dropboxService.updateFile(orderTableFilePath, orderTableCsvData).then((response: any) => {
        console.log('File updated:', response);
        this.showSpinner = false;
      }).catch((error) => {
        this.showSpinner = false;
        console.error('Error uploading file:', error);
      });
      this.showSpinner = false;
      console.error('Error uploading file:', error);
    });

  }
   isDST(date: Date): boolean {
    // DST in India is typically from the last Sunday of March to the last Sunday of October.
    // However, these dates can vary slightly from year to year.
  
    // Get the year and month of the given date
    const year = date.getFullYear();
    const month = date.getMonth();
  
    // Determine the last Sunday of March and October
    const lastSundayOfMarch = new Date(year, 2, 31 - (date.getDate() - 1) % 7);
    const lastSundayOfOctober = new Date(year, 9, 31 - (date.getDate() - 1) % 7);
  
    // Check if the given date falls within the DST period
    return date >= lastSundayOfMarch && date < lastSundayOfOctober;
  }

  sendMailForEditOrder()
  {
    const currentDate = new Date();

    // Detect the user's local timezone
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Format the time based on the detected timezone
    let currentISTTime = currentDate.toLocaleString('en-US', { timeZone: userTimeZone });
    let paymentType: any = {};
    let request: any = {};
    let attachment: any = {};
    this.originalEditOrder
    let items = this.editableOrder.orderItems
    let originalItems = this.originalEditOrder.orderItems
     let items_message = "\n\n\n\n"
    for (let i = 0; i < items.length; i++) {
      if (originalItems[i].item_quantity !== items[i].item_quantity) {
      items_message = items_message + " "+ items[i].item_name +" |  old quantity - " + originalItems[i].item_quantity + " | new quantity - " + items[i].item_quantity + "\n\n"
      }
    }


    request.recipient = "cafekubera2223@gmail.com";
    request.msgBody = "Hey! \nbelow details are for the edited orders " + items_message;

    request.subject = "Detail of the EDITED orders - " + this.editableOrder.order.map((obj: any) => obj.id).join(',') + " for  the table " + this.editableOrder.order[0].table_no + " on " + currentISTTime;
    this.dataService.SendSimpleMail(request).subscribe();
  }

  fetchNewOrder(filePath: any) {
    const fileIndex = this.files.findIndex(order => order.name === filePath);
    if (fileIndex !== -1) {
      this.files.splice(fileIndex, 1);
    }
    const index = this.checkOutOrderList.findIndex(order => order.filePath === filePath);
    if (index !== -1) {
      this.checkOutOrderList.splice(index, 1);
    }
    this.isEditOrderPopUpOpen = false;
    this.refreshOrder();
  }

  showAlert = false;
  showEditRevokeAlert = false;
  alertMessage = '';

  countdown: number = 600; // 600 seconds = 10 minutes
  countdownInterval: any;

  // Function to display the alert message and hide after 10 minutes
  showEditApprovalAlertMessage() {
    this.showAlert = true;


    this.countdown = 60; // Reset countdown to 10 minutes

    // Clear any existing interval if already running
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    // Start the countdown interval to update every second
    this.countdownInterval = setInterval(() => {
      this.countdown--;

      // Hide alert when countdown reaches 0
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        this.showAlert = false;
      }
    }, 1000); // 1000 ms = 1 second

    // Hide the alert message after 10 minutes (600,000 ms)
    setTimeout(() => {
      this.revokeEditAccess();
      this.showAlert = false;
    }, 60000); // 10 minutes = 600000 ms
  }


  showEditRevokeAlertMessage() {
    this.showEditRevokeAlert = true;
    // Hide the alert message after 10 minutes (600,000 ms)
    setTimeout(() => {
     
      this.showEditRevokeAlert = false;
    }, 5000); // 10 minutes = 600000 ms
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
  alertMessages: string[] = [];
  addNewAlert(newMessage: string) {
    // Add the new message to the beginning of the array
    this.alertMessages.unshift(newMessage);

    // Display the alert
    this.showBellmsgAlert = true;
  }

  applyDiscount()
  {
    //update the paid order value
    this.editableOrder.orderItems
  }
}
