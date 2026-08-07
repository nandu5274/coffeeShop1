import { Component, EventEmitter, OnInit, Output, OnDestroy } from '@angular/core';
import { SharedService } from '../service/shared-service';
import { CartItemDto } from '../dtos/CartItemDto';
import { Router } from '@angular/router';
import { GraphqlService } from '../service/graphql.service';
import { ResponseDto } from '../dtos/responseDto';
import { DropboxService } from '../service/dropbox.service';
import * as Papa from 'papaparse';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CustomerService } from '../service/customer.service';
import { Subscription } from 'rxjs';
import {
  DELIVERY_FEE,
  DELIVERY_RADIUS_KM,
  DELIVERY_TABLE_PLACE,
  RESTAURANT_LAT,
  RESTAURANT_LNG,
  deliveryDisplayTableNo,
  deliveryOrderTableNoInt
} from '../common/constanst';
import { DeliveryHistoryService } from '../service/delivery-history.service';
import { WhatsappNotifyService } from '../service/whatsapp-notify.service';
import { WebSocketService } from '../service/WebSocket.service';
@Component({
  selector: 'app-items-cart',
  templateUrl: './items-cart.component.html',
  styleUrls: ['./items-cart.component.scss']
})
export class ItemsCartComponent implements OnInit, OnDestroy {
  sharedData: CartItemDto | undefined;
  orderAmount: number = 0
  additionAmount: number = 0
  totalAmount: number = 0;
  orderSuccessItem:any;
  orderButtonDisabled: Boolean = true
  cartDataList: CartItemDto[] = [];
  responseDto!: ResponseDto; 
  @Output() cartDataListCount: EventEmitter<any> = new EventEmitter();
  @Output() closeCartModal: EventEmitter<any> = new EventEmitter();
  @Output() orderProcessingStatus: EventEmitter<any> = new EventEmitter();
  @Output() orderingResponse: EventEmitter<any> = new EventEmitter();
  quantityUpdated: boolean = false;
  private cartDataSubscription!: Subscription;
  private orderResponseSubscription?: Subscription;
  constructor(private sharedService: SharedService, private router: Router, private graphqlService: GraphqlService,
    private dropboxService: DropboxService, private datePipe: DatePipe, private http: HttpClient, private customerService: CustomerService,
    private deliveryHistoryService: DeliveryHistoryService,
    private whatsappNotifyService: WhatsappNotifyService,
    private webSocketService: WebSocketService) { }

  ngOnInit() {
    this.UserMobileNumber =  sessionStorage.getItem('customer_number' )??''; 
   let sessionCartDataList = sessionStorage.getItem('cartDataList');
    this.commentText = '';
    if (sessionCartDataList) {
      this.cartDataList = JSON.parse(atob(sessionStorage.getItem('cartDataList')!));
      this.orderSummery(this.cartDataList);
    }
    this.publishCartCount();

    this.cartDataSubscription = this.sharedService.getItemToCartDataObservable().subscribe((data) => {
      this.UserMobileNumber =  sessionStorage.getItem('customer_number' )??''; 

      sessionCartDataList = sessionStorage.getItem('cartDataList');

      if (sessionCartDataList) {
        this.cartDataList = JSON.parse( atob(sessionStorage.getItem('cartDataList')!));
      }

      if (data && (data as any).isProcessedInCart) {
        this.orderSummery(this.cartDataList);
        this.publishCartCount();
        return;
      }
      if (data) {
        (data as any).isProcessedInCart = true;
      }

      this.quantityUpdated = false
      this.sharedData = data;
      if (this.cartDataList.length > 0) {

        this.cartDataList.forEach((item: CartItemDto) => {
          if (item.id == data.id) {
            if (data.quantity == 0) {
              this.cartDataList.splice(this.cartDataList.indexOf(item), 1);
              this.quantityUpdated = true;
            }
            else {
              item.quantity = Number(item.quantity) + Number(data.quantity);
              item.totalCartCost = item.quantity * item.cost
              this.quantityUpdated = true;
            }

          }

        })
      }
      if (!this.quantityUpdated) {
        this.sharedData.totalCartCost = this.sharedData.quantity * this.sharedData.cost
        this.cartDataList.push(this.sharedData)
      }
      sessionStorage.removeItem("cartDataList");
      sessionStorage.setItem("cartDataList", btoa(JSON.stringify(this.cartDataList)));
      this.orderSummery(this.cartDataList);
      this.publishCartCount();
    });
   

  }
  updatedCartItemDto: CartItemDto = new CartItemDto;
  increment(cartItem: any) {
    const delta = Object.assign(new CartItemDto(), cartItem, { quantity: 1 });
    this.sharedService.setItemToCartData(delta);
  }

  decrement(cartItem: any) {
    if (cartItem.quantity > 1) {
      const delta = Object.assign(new CartItemDto(), cartItem, { quantity: -1 });
      this.sharedService.setItemToCartData(delta);
    } else {
      this.removeItem(cartItem);
    }
  }

  clearCart(): void {
    this.cartDataList = [];
    sessionStorage.removeItem('cartDataList');
    this.orderSummery(this.cartDataList);
    this.publishCartCount();
  }

  private publishCartCount(): void {
    const qty = this.cartDataList.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    this.cartDataListCount.emit(qty);
    this.sharedService.setCartCount(qty);
  }

  get deliveryAddressShort(): string {
    const text = sessionStorage.getItem('delivery_address_text') || '';
    if (!text) {
      return 'Select address';
    }
    const first = text.split(',')[0]?.trim() || text;
    return first.length > 28 ? `${first.slice(0, 26)}…` : first;
  }

  goSelectAddress(): void {
    this.closeCartModal.emit(this.cartDataList.length);
    this.router.navigate(['/delivery/addresses']);
  }

  addMoreItems(): void {
    this.closeCartModal.emit(this.cartDataList.length);
    this.sharedService.setShowMenuFlag(true);
    this.router.navigate(['/menu'], { fragment: 'menu' });
  }

  orderSummery(cartItem: any) {
    this.orderAmount = 0;

    cartItem.forEach((item: CartItemDto) => {
      this.orderAmount = this.orderAmount + item.totalCartCost
    })
    const isDelivery = sessionStorage.getItem('order_mode') === 'delivery';
    if (isDelivery) {
      this.additionAmount = Number(DELIVERY_FEE) || 0;
    } else {
      this.additionAmount = (this.orderAmount * 5) / 100;
    }
    this.totalAmount = this.orderAmount + this.additionAmount
    if (this.totalAmount > 0) {
      this.orderButtonDisabled = false;
    } else {
      this.orderButtonDisabled = true;
    }
  }
  removeItem(cartItem: any) {
    const delta = Object.assign(new CartItemDto(), cartItem, { quantity: 0 });
    this.sharedService.setItemToCartData(delta);
  }
  previousUrl: any;
  navigateToMenu(nav: any) {

    if (nav == 'menu') {

      this.router.navigate(['/' + nav], { fragment: nav });
      const elements = document.querySelectorAll(`[href="#hero"], [href="#about"], [href="#specials"], [href="#events"], [href="#chefs"], [href="#gallery"]`);
      elements.forEach((element) => {
        element.classList.remove('active');
      });
      this.previousUrl = sessionStorage.getItem("previousUrl");
      sessionStorage.setItem("previousUrl", nav);
    }
    else if (sessionStorage.getItem("previousUrl") == 'menu') {

      this.router.navigate(['/'], { fragment: nav }).then(() => {
        window.location.reload();
      });
      this.previousUrl = sessionStorage.getItem("previousUrl");

      sessionStorage.setItem("previousUrl", nav);
    } else {

      this.router.navigate(['/'], { fragment: nav })
      this.previousUrl = sessionStorage.getItem("previousUrl");

      sessionStorage.setItem("previousUrl", nav);
    }
    this.closeCartModal.emit(this.cartDataList.length);
  }

  getEmployeeName()
  {
    let capUser = localStorage.getItem('cap_user');
    if (!capUser) {
      return '';
    }
    try {
      let user_details = JSON.parse(atob(capUser));
      return (user_details.user_name || user_details.username || '').trim();
    } catch (e) {
      return '';
    }
  }

  get isDeliveryMode(): boolean {
    return sessionStorage.getItem('order_mode') === 'delivery';
  }

  onOrderClick() {
    if (this.isDeliveryMode) {
      if (sessionStorage.getItem('is_login') !== 'true') {
        alert('Please login to place a delivery order.');
        return;
      }
      if (!sessionStorage.getItem('delivery_address_id')) {
        alert('Please select a delivery address first.');
        this.router.navigate(['/delivery/addresses']);
        this.closeCartModal.emit(this.cartDataList.length);
        return;
      }
      this.closeCartModal.emit(this.cartDataList.length);
      this.router.navigate(['/delivery/checkout']);
      return;
    }
    this.sentOrder();
  }

  sentOrder() {
    const isDelivery = sessionStorage.getItem('order_mode') === 'delivery';
    let employee_Name = isDelivery ? 'ONLINE' : this.getEmployeeName();

    if (!isDelivery && !employee_Name) {
      alert('Please login as captain/waiter before placing an order. Waiter name is required.');
      this.orderProcessingStatus.emit('error');
      return;
    }

    if (isDelivery) {
      if (sessionStorage.getItem('is_login') !== 'true') {
        alert('Please login to place a delivery order.');
        this.orderProcessingStatus.emit('error');
        return;
      }
      if (!sessionStorage.getItem('delivery_address_id') || !sessionStorage.getItem('delivery_address_text')) {
        alert('Please select a delivery address first (Online Delivery → Addresses).');
        this.orderProcessingStatus.emit('error');
        this.router.navigate(['/delivery/addresses']);
        return;
      }
      const dist = parseFloat(sessionStorage.getItem('delivery_distance_km') || '');
      if (!isNaN(dist) && dist > DELIVERY_RADIUS_KM) {
        alert(`We only deliver within ${DELIVERY_RADIUS_KM} km.`);
        this.orderProcessingStatus.emit('error');
        return;
      }
      const lat = parseFloat(sessionStorage.getItem('delivery_lat') || '');
      const lng = parseFloat(sessionStorage.getItem('delivery_lng') || '');
      if (!isNaN(lat) && !isNaN(lng)) {
        const km = this.sharedService.distanceKm(RESTAURANT_LAT, RESTAURANT_LNG, lat, lng);
        if (km > DELIVERY_RADIUS_KM) {
          alert(`We only deliver within ${DELIVERY_RADIUS_KM} km.`);
          this.orderProcessingStatus.emit('error');
          return;
        }
        sessionStorage.setItem('delivery_distance_km', km.toFixed(3));
      }
      this.UserMobileNumber = sessionStorage.getItem('customer_number') || this.UserMobileNumber || '';
      if (!this.UserMobileNumber) {
        alert('Customer mobile number missing. Please login again.');
        this.orderProcessingStatus.emit('error');
        return;
      }
    }

    let dataList:any = [];
    let rdm_order_ref_id = this.sharedService.generateRandomNumberWithDateTime();
    // Café DB table_no is INTEGER; D-… label is only for delivery map / customer display
    const deliveryTableNoDisplay = isDelivery ? deliveryDisplayTableNo(rdm_order_ref_id) : null;
    const deliveryTableNo = isDelivery
      ? deliveryOrderTableNoInt(rdm_order_ref_id)
      : sessionStorage.getItem('table');

    let orderTableData = {
      order_status: 'approval_waiting',
      table_no: deliveryTableNo,
      table_place: isDelivery ? DELIVERY_TABLE_PLACE : sessionStorage.getItem('tablePlace'),
      order_ref_id: rdm_order_ref_id,
      order_summary_amount: this.orderAmount,
      order_additional_service_amount: this.additionAmount,
      order_total_amount: this.totalAmount,
      order_items: { data: dataList },
      employee: employee_Name,
      comments: isDelivery
        ? `${this.commentText || ''}\n[DELIVERY] ${deliveryTableNoDisplay}\n${sessionStorage.getItem('delivery_address_text') || ''}`.trim()
        : this.commentText,
      customer_number: this.UserMobileNumber
    }

    let csvOrderTableData = {
      order_ref_id: rdm_order_ref_id,
      table_no: isDelivery ? deliveryTableNoDisplay : deliveryTableNo,
      order_summary_amount: this.orderAmount,
      order_additional_service_amount: this.additionAmount,
      order_total_amount: this.totalAmount,
      table_place: isDelivery ? DELIVERY_TABLE_PLACE : sessionStorage.getItem('tablePlace'),
      customer_number: this.UserMobileNumber
    }

   let csvOrderItemsTableData = dataList;
  
    this.cartDataList.forEach((item: CartItemDto) => {
      let orderItemTableData = {
        order_ref_id: rdm_order_ref_id,
        item_name: item.name,
        item_description: item.description,
        item_quantity: item.quantity,
        item_cost: item.cost,
        status: 'progress'
      }
      dataList.push(orderItemTableData);
    })

   console.log("orderTableData", JSON.stringify(orderTableData))
   this.orderProcessingStatus.emit('processing')
  this.graphqlService.saveDataAndLink(orderTableData);
  if (this.orderResponseSubscription) {
    this.orderResponseSubscription.unsubscribe();
  }
  this.orderResponseSubscription = this.sharedService.getOrderProcessingResponseObservable().subscribe((data) => {
    this.responseDto = data;
    this.sentOrderStatus(csvOrderTableData, csvOrderItemsTableData, isDelivery);
  });
  
  //this.generateAndUploadCSV(csvOrderTableData, csvOrderItemsTableData)
  }

  sentOrderStatus(csvOrderTableData: any, csvOrderItemsTableData:any, isDelivery = false) {
    if(this.responseDto.status == "success")
    {
      this.orderProcessingStatus.emit('success')
      sessionStorage.setItem("orderSuccessItem",  btoa(JSON.stringify(this.responseDto)))
      this.orderingResponse.emit(this.responseDto);
      sessionStorage.removeItem("cartDataList");
      this.responseDto.message = "approval"
      console.log("data 2 - ", JSON.stringify(this.responseDto))
      const inserted = this.responseDto?.data?.data?.insert_kubera_order_one;
      if (inserted) {
        this.generateAndUploadToApprovalWaiting(
          csvOrderTableData,
          csvOrderItemsTableData,
          inserted.id,
          inserted.order_ref_id
        );
      }
      try {
        this.webSocketService.send('approval');
      } catch (e) {
        console.warn('WS approval notify failed', e);
      }
      if (isDelivery && inserted) {
        this.afterDeliveryOrderPlaced(inserted, csvOrderTableData, csvOrderItemsTableData);
      }
  
    }else if(this.responseDto.status == "error")
    {
      this.orderProcessingStatus.emit('error')
    }
  }

  private afterDeliveryOrderPlaced(inserted: any, csvOrder: any, items: any[]): void {
    let customerDetailsId = 0;
    let customerName = '';
    try {
      const raw = sessionStorage.getItem('customer_Details');
      if (raw) {
        const d = JSON.parse(raw);
        customerDetailsId = d?.customer_detail?.id || 0;
        customerName = d?.customer_detail?.name || '';
      }
    } catch { /* ignore */ }

    const addressText = sessionStorage.getItem('delivery_address_text') || '';
    const mapObj: Record<string, unknown> = {
      customer_details_id: customerDetailsId,
      customer_number: String(csvOrder.customer_number || ''),
      order_id: inserted.id,
      order_ref_id: String(inserted.order_ref_id),
      table_no: String(csvOrder.table_no),
      table_place: DELIVERY_TABLE_PLACE,
      order_status: 'approval_waiting',
      order_summary_amount: csvOrder.order_summary_amount,
      order_additional_service_amount: csvOrder.order_additional_service_amount,
      order_total_amount: csvOrder.order_total_amount,
      delivery_fee: csvOrder.order_additional_service_amount,
      delivery_distance_km: parseFloat(sessionStorage.getItem('delivery_distance_km') || '0') || null,
      delivery_address_id: parseInt(sessionStorage.getItem('delivery_address_id') || '', 10) || null,
      delivery_address_text: addressText,
      delivery_lat: parseFloat(sessionStorage.getItem('delivery_lat') || '') || null,
      delivery_lng: parseFloat(sessionStorage.getItem('delivery_lng') || '') || null,
      comments: inserted.comments || null,
      items_summary: (items || []).map((i: any) => ({
        name: i.item_name,
        qty: i.item_quantity,
        cost: i.item_cost
      }))
    };

    this.deliveryHistoryService.insertOrderMap(mapObj).subscribe({
      next: (res) => {
        const mapId = res?.data?.insert_kubera_delivery_kubera_customer_order_map_one?.id;
        if (mapId) {
          this.deliveryHistoryService.insertStatusEvent({
            order_map_id: mapId,
            order_id: inserted.id,
            order_ref_id: String(inserted.order_ref_id),
            status: 'approval_waiting',
            message: 'Order placed — waiting for restaurant'
          }).subscribe({ error: (e) => console.warn('status event failed', e) });
        }
      },
      error: (e) => console.warn('delivery order map insert failed', e)
    });

    this.whatsappNotifyService.sendDeliveryOrderAlert({
      tableNo: String(csvOrder.table_no),
      orderRefId: String(inserted.order_ref_id),
      customerNumber: String(csvOrder.customer_number || ''),
      customerName,
      addressText,
      totalAmount: Number(csvOrder.order_total_amount) || 0,
      items: (items || []).map((i: any) => ({
        name: i.item_name,
        quantity: i.item_quantity,
        cost: i.item_cost
      }))
    }).subscribe((r) => {
      if (!r.sent) {
        console.warn('WhatsApp not sent:', r.reason);
      }
    });
  }
  objectsToCsv(objects: any[]): string {
    const csv = Papa.unparse(objects);
    return csv;
  }
  generateAndUploadCSV(csvOrderTableData: any, csvOrderItemsTableData:any) {
    const currentDate = new Date();  
    const formattedDate = this.datePipe.transform(currentDate, 'yyyy_MM_dd_HH_mm_ss');
    const DateFolder = this.datePipe.transform(currentDate, 'yyyy_MM_dd');
    console.log("formattedDate", formattedDate);
    const orderTableCsvData = this.objectsToCsv([csvOrderTableData]);
    const orderTableFilePath = '/orders/current_orders/orders/'+'order_'+formattedDate+'.csv'; // Replace with your desired Dropbox path


    const orderItemTableCsvData = this.objectsToCsv(csvOrderItemsTableData);
    const orderItemTableFilePath = '/orders/current_orders/order_items/'+'order_items_'+formattedDate+'.csv'; // Replace with your desired Dropbox path
 

    this.dropboxService.uploadFile(orderTableFilePath, orderTableCsvData).then((response) => {
      console.log('File uploaded:', response);
    }).catch((error) => {
      console.error('Error uploading file:', error);
    });

    this.dropboxService.uploadFile(orderItemTableFilePath, orderItemTableCsvData).then((response) => {
      console.log('File uploaded:', response);
    }).catch((error) => {
      console.error('Error uploading file:', error);
    });
  }


  generateAndUploadToApprovalWaiting(csvOrderTableData:any, orderItemTableDataList:any, id:any, order_ref_id:any){
    const orderTableFilePath = '/orders/approval_waiting_orders/'+'order_'+id+'_order_ref_'+order_ref_id+'.csv';
    csvOrderTableData.id = id;
    csvOrderTableData.order_created_time=this.sharedService.updateCurrentDateTimeInIST()
    const csvOrderTableDataCsv = this.objectsToCsv2([csvOrderTableData]);
    const orderItemTableDataListCsv = this.objectsToCsv2(orderItemTableDataList);
    const orderTableCsvData  = csvOrderTableDataCsv +"\n" +orderItemTableDataListCsv


    this.dropboxService.uploadFile(orderTableFilePath, orderTableCsvData).then((response:any) => {

      console.log('File uploaded:', response);
      this.sendOrderForApproval(JSON.stringify(this.responseDto))

    }).catch((error) => {
      this.dropboxService.updateFile(orderTableFilePath, orderTableCsvData).then((response:any) => {
        this.sendOrderForApproval(JSON.stringify(this.responseDto));
        console.log('File updated:', response);
      }).catch((error) => {
        
        console.error('Error uploading file:', error);
      });
      
      console.error('Error uploading file:', error);
    });

  
  }

  sendOrderForApproval(id:any){
    this.http.get('https://kuber-backup.onrender.com/dropbox/broadcast?message=approval')
    .subscribe((response) => {
      // Handle the response data here
      console.log(response);
    },
    (error) => {
      // Handle any errors that occurred during the request
      console.error(error);
    });
  }
  objectsToCsv2(objects: any[]): string {
    const csv = Papa.unparse(objects, {
      header: true
    });
    return csv;
  }
  isCommentModalOpen: boolean = false;  // To toggle modal visibility
  commentText: string = '';  
  
  isUserMobileModalOpen: boolean = false;  // To toggle modal visibility
  UserMobileNumber: string = '';  // Holds the comment input
  showUserNotFoundError: boolean = false;
  showUserFoundBanner: boolean = false
  showSpinner: boolean = false;
  tempUserMobileNumber: string = ''
  openUserMobileModal()
  {
    this.showUserFoundBanner=false;
    this.tempUserMobileNumber = this.UserMobileNumber
    this.isUserMobileModalOpen = true
  }
  closeMobileNumberModal()
  {
    this.UserMobileNumber =  this.tempUserMobileNumber;
    this.isUserMobileModalOpen = false
  }

  saveMobileNumberModal()
  {
    this.isUserMobileModalOpen = false
  }
  clearBanner(){
    this.showUserNotFoundError = false
    this.showUserFoundBanner = false
  }
  // Open the modal
  openCommentModal() {
    this.isCommentModalOpen = true;
  }
  checkProfile(){
    this.showSpinner = true
   this.clearBanner();
   this.customerService.getCustomerPointAndDetailsByNumber(this.UserMobileNumber).subscribe((response) => {

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

  // Save the comment and close the modal
  saveComment() {
    console.log('Comment saved:', this.commentText);  // Replace this with your save logic
  
    this.isCommentModalOpen = false;  // Close modal
  }

  // Close the modal without saving
  closeCommentModal() {
    this.isCommentModalOpen = false;
  }

  predefinedComments: string[] = [
    'Need more spicy',
    'add more cheese',
    'add more veggies',
    'avoid vegetable',
    'jain food',
    'pure veg order'

  ];


  addMessage(event: Event) {
    const selectedMessage = (event.target as HTMLSelectElement).value;
    if (selectedMessage) {
      this.commentText = this.commentText 
        ? `${this.commentText}, ${selectedMessage}` 
        : selectedMessage;
    }
  }

  ngOnDestroy() {
    if (this.cartDataSubscription) {
      this.cartDataSubscription.unsubscribe();
    }
    if (this.orderResponseSubscription) {
      this.orderResponseSubscription.unsubscribe();
    }
  }

}
