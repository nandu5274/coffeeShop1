import { AfterViewInit, Component, HostListener, OnDestroy } from '@angular/core';
import { Howl } from 'howler';
import { WebSocketService } from '../service/WebSocket.service';
import { DatePipe } from '@angular/common';
import { DropboxService } from '../service/dropbox.service';
import { SharedService } from '../service/shared-service';
import { SingleFileOrderDto } from '../dtos/singleFileOrderDto';
import Papa from 'papaparse';
import { PaidFileOrderDto } from '../dtos/paidFileOrderDto';
import { DataService } from '../service/data.service';
import {
  BELL_MSG_TIME_OUT,
  DELIVERY_TABLE_PLACE,
  KUBERA_PAYMENT_EDIT_LOGIN_PASSWORD,
  USE_DATABASE,
  deliveryDisplayTableNo
} from '../common/constanst';
import { HasuraApiService } from '../service/hasura.api.service';
import { GraphqlService } from '../service/graphql.service';
import { CustomerService } from '../service/customer.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MailService } from '../service/mail.service';
@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss']
})
export class PaymentComponent implements AfterViewInit, OnDestroy {
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
  TotalDeliveryAmount: any = 0;
  TotalDeliveryOrders: number = 0;
  TotalActualAmount: any = 0;
  showBellmsgAlert = false;
  isConnected = false;
  selectedDiscount: number = 0; // Default discount is 0
  selectedDateFilter: string = '';
  lastFetchedDate: string = '';
  useDatabase: boolean = USE_DATABASE;
  showItemsSummaryPopup: boolean = false;
  aggregatedItemsList: any[] = [];
  filteredAggregatedItemsList: any[] = [];
  searchItemQuery: string = '';
  isSyncingPaid: boolean = false;

  bell_msg = "";
  isMergePopupOpen: boolean = false;
  selectedOrderToMerge: any = null;
  orderIdsToMergeInput: string = '';
  constructor(private webSocketService: WebSocketService, private datePipe: DatePipe, private dropboxService: DropboxService,
    private sharedService: SharedService, private dataService: DataService, private hasuraDataService: HasuraApiService,
     private graphqlService: GraphqlService, private customerService: CustomerService,private mailService: MailService) {
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
    this.checkReportButtonTime();

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

    this.selectedDateFilter = this.getTodayDateString();
    this.getCheckOutOrders();
    //this.getPaidOrders();

    console.log("caption")

    this.revokeEditAccess()
  }
  ngOnDestroy() {
    this.stopRealTimeSummaryPolling();
  }
  getTodayDateString(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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





  updateOrderTotalAmountBasedOnItems(order: any) {
    if (!order || !order.orderItems || !order.order || !order.order[0]) return;
    
    let actualAmount = 0;
    order.orderItems.forEach((item: any) => {
      let gstCost = Math.ceil(parseFloat(item.item_cost) || 0);
      actualAmount += (item.item_quantity || 0) * gstCost;
    });
    
    let sgst = parseFloat(((actualAmount * 2.5) / 100).toFixed(2));
    let cgst = parseFloat(((actualAmount * 2.5) / 100).toFixed(2));
    let grandTotal = parseFloat(actualAmount.toFixed(2)) + sgst + cgst;
    
    order.order[0].order_total_amount = parseFloat(grandTotal.toFixed(2));
  }

  files: any[] = [];
  checkOutOrderList: SingleFileOrderDto[] = [];
  isSyncingCheckout = false;
  async getCheckOutOrders(force: boolean = false) {
    if (USE_DATABASE && this.isSyncingCheckout && !force) return;

    this.showSpinner = true;

    if (USE_DATABASE) {
      this.isSyncingCheckout = true;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = today.toISOString();

      this.graphqlService.getActiveOrdersBasic('checkout', startDate).subscribe(
        (result: any) => {
          const activeOrders = result.data.kubera_order || [];
          
          // Get all IDs with "checkout" status
          const checkoutIds = activeOrders.map((o: any) => Number(o.id));

          // Get local IDs
          const locallyLoadedIds = new Set<number>();
          this.checkOutOrderList.forEach(item => {
            const ids = item.order[0].id.toString().split(',').map((idStr: string) => parseInt(idStr.trim())).filter((id: number) => !isNaN(id));
            ids.forEach((id: number) => locallyLoadedIds.add(id));
          });

          // Check if checkoutIds is identical to locallyLoadedIds
          let isIdentical = checkoutIds.length === locallyLoadedIds.size;
          if (isIdentical) {
            for (let id of checkoutIds) {
              if (!locallyLoadedIds.has(id)) {
                isIdentical = false;
                break;
              }
            }
          }

          if (isIdentical && !force) {
            // Nothing changed! Just stop spinner and return
            this.showSpinner = false;
            this.isSyncingCheckout = false;
            return;
          }

          if (checkoutIds.length === 0) {
            this.checkOutOrderList = [];
            this.showSpinner = false;
            this.isSyncingCheckout = false;
            return;
          }

          // Query details only for active checkout IDs
          this.graphqlService.getPaidOrdersByIds(checkoutIds).subscribe(
            (detailsResult: any) => {
              const rawOrders = detailsResult.data.kubera_order || [];
              
              // Group by check_out_id
              const groupedOrdersMap = new Map<string, any>();
              rawOrders.forEach((dbOrder: any) => {
                const groupId = dbOrder.check_out_id || dbOrder.id.toString();
                if (!groupedOrdersMap.has(groupId)) {
                  groupedOrdersMap.set(groupId, {
                    orders: [],
                    items: [],
                    check_out_id: groupId
                  });
                }
                groupedOrdersMap.get(groupId).orders.push(dbOrder);
                groupedOrdersMap.get(groupId).items.push(...(dbOrder.order_items || []));
              });

              this.checkOutOrderList = Array.from(groupedOrdersMap.values()).map((group: any) => {
                let order: SingleFileOrderDto = new SingleFileOrderDto();
                let primaryOrder = group.orders[0];
                let combinedIds = group.orders.map((o: any) => o.id).join(', ');

                let billNo = '';
                if (group.check_out_id && group.check_out_id.startsWith('CHK_')) {
                  let timestampStr = group.check_out_id.replace('CHK_', '').split('_')[0];
                  let timestamp = parseInt(timestampStr);
                  if (!isNaN(timestamp)) {
                    let billDate = new Date(timestamp);
                    billNo = this.datePipe.transform(billDate, 'yyyyMMddHHmm') || '';
                  }
                }
                if (!billNo) {
                  let createdDate = new Date(primaryOrder.created_at);
                  billNo = this.datePipe.transform(createdDate, 'yyyyMMddHHmm') || '';
                }

                order.order = group.orders.map((o: any) => ({
                  id: combinedIds as any,
                  original_id: o.id,
                  order_ref_id: o.order_ref_id,
                  table_no: o.table_no,
                  table_place: o.table_place,
                  order_summary_amount: o.order_summary_amount,
                  order_additional_service_amount: o.order_additional_service_amount,
                  order_total_amount: o.order_total_amount,
                  order_status: o.order_status,
                  employee: o.employee,
                  comments: o.comments,
                  customer_number: o.customer_number,
                  order_created_time: this.sharedService.convertDateTimeToDateString(o.created_at),
                  created_at: o.created_at,
                  check_out_id: group.check_out_id,
                  billNo: billNo
                }));

                order.orderItems = group.items.map((dbItem: any) => ({
                  id: dbItem.id,
                  item_name: dbItem.item_name,
                  item_quantity: dbItem.item_quantity,
                  item_cost: dbItem.item_cost,
                  status: dbItem.status,
                  item_description: dbItem.item_description,
                  order_id: dbItem.order_id,
                  created_at: dbItem.created_at
                }));
                
                order.orderItems = this.combineOrderItemsQuantities(order.orderItems);
                return order;
              });

              this.checkOutOrderList.forEach(order => {
                this.updateOrderTotalAmountBasedOnItems(order);
              });

              this.checkOutOrderList.sort((a, b) => {
                const dateA = a.order && a.order[0] && a.order[0].created_at ? new Date(a.order[0].created_at).getTime() : 0;
                const dateB = b.order && b.order[0] && b.order[0].created_at ? new Date(b.order[0].created_at).getTime() : 0;
                return dateB - dateA;
              });

              this.showSpinner = false;
              this.isSyncingCheckout = false;
            },
            (err: any) => {
              console.error("Error fetching checkout details", err);
              this.showSpinner = false;
              this.isSyncingCheckout = false;
            }
          );
        },
        (error: any) => {
          console.error("Error fetching checkout orders", error);
          this.showSpinner = false;
          this.isSyncingCheckout = false;
        }
      );
      return;
    }

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
      this.updateOrderTotalAmountBasedOnItems(order);
    })
    this.showSpinner = false;
  }



  paidFiles: any[] = [];
  paidOrderList: PaidFileOrderDto[] = [];
  saleDate: any
  async getPaidOrders() {
    if (this.isSyncingPaid) return;
    this.isSyncingPaid = true;
    this.showPaidSpinner = true;

    if (this.lastFetchedDate !== this.selectedDateFilter) {
      this.paidOrderList = [];
      this.resetSaleTotals();
      this.lastFetchedDate = this.selectedDateFilter;
    }

    if (USE_DATABASE) {
      if (!this.paidOrderList) {
        this.paidOrderList = [];
      }

      const existingOrderIds = new Set<number>();
      this.paidOrderList.forEach((dto: any) => {
        if (dto.order && dto.order[0] && dto.order[0].id) {
          const idsStr = dto.order[0].id.toString();
          idsStr.split(',').forEach((idStr: string) => {
            const id = parseInt(idStr.trim(), 10);
            if (!isNaN(id)) {
              existingOrderIds.add(id);
            }
          });
        }
      });

      if (existingOrderIds.size === 0) {
        this.resetSaleTotals();
      }

      let formattedDate = '';
      let displayDate = '';
      if (this.selectedDateFilter) {
        const parts = this.selectedDateFilter.split('-'); // YYYY-MM-DD
        formattedDate = `${parts[1]}-${parts[2]}-${parts[0]}`;
        displayDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else {
        formattedDate = this.sharedService.updateCurrentDateInIST(); // MM-DD-YYYY in IST
        const parts = formattedDate.split('-');
        displayDate = `${parts[1]}-${parts[0]}-${parts[2]}`; // DD-MM-YYYY
      }

      this.graphqlService.getPaymentsByDate(formattedDate).subscribe((paymentRes: any) => {
        const payments = paymentRes.data.kubera_payment_details;
        if (!payments || payments.length === 0) {
          this.showPaidSpinner = false;
          this.saleDate = displayDate;
          this.isSyncingPaid = false;
          return;
        }

        // Only fetch payments that we don't have yet
        const newPayments = payments.filter((p: any) => {
          if (!p.order_id) return false;
          const ids = p.order_id.toString().split(',').map((idStr: string) => parseInt(idStr.trim(), 10)).filter((id: number) => !isNaN(id));
          return ids.some((id: number) => !existingOrderIds.has(id));
        });

        if (newPayments.length === 0) {
          this.showPaidSpinner = false;
          this.isSyncingPaid = false;
          return;
        }

        const orderIds: number[] = [];
        newPayments.forEach((p: any) => {
          if (p.order_id) {
            const ids = p.order_id.toString().split(',').map((idStr: string) => parseInt(idStr.trim(), 10)).filter((id: number) => !isNaN(id));
            orderIds.push(...ids);
          }
        });
        const uniqueOrderIds = [...new Set(orderIds)];

        // Fetch primary orders to resolve their check_out_ids
        this.graphqlService.getPaidOrdersByIds(uniqueOrderIds as number[]).subscribe((orderRes: any) => {
          const primaryOrders = orderRes.data.kubera_order || [];
          const checkoutIds = primaryOrders.map((o: any) => o.check_out_id).filter((id: string) => !!id);
          const uniqueCheckoutIds = [...new Set(checkoutIds)];

          const handleOrders = (rawOrders: any[]) => {
            const newPaidOrders = newPayments.map((p: any) => {
              const payIds = p.order_id ? p.order_id.toString().split(',').map((idStr: string) => parseInt(idStr.trim(), 10)).filter((id: number) => !isNaN(id)) : [];
              
              // Find all orders in rawOrders that belong to this payment
              const paymentOrders = rawOrders.filter((o: any) => payIds.includes(o.id));
              if (paymentOrders.length === 0) return null;
              
              let orderDto = new PaidFileOrderDto();
              let primaryOrder = paymentOrders[0];
              let combinedIds = paymentOrders.map((o: any) => o.id).join(', ');

              orderDto.filePath = `Order_${primaryOrder.order_ref_id}`;
              orderDto.order = [{
                id: combinedIds as any,
                order_ref_id: primaryOrder.order_ref_id,
                table_no: primaryOrder.table_no,
                table_place: primaryOrder.table_place,
                order_summary_amount: primaryOrder.order_summary_amount,
                order_additional_service_amount: primaryOrder.order_additional_service_amount,
                order_total_amount: primaryOrder.order_total_amount,
                order_status: primaryOrder.order_status,
                employee: primaryOrder.employee,
                comments: primaryOrder.comments,
                customer_number: primaryOrder.customer_number,
                order_created_time: this.sharedService.convertDateTimeToDateString(primaryOrder.created_at),
                created_at: primaryOrder.created_at,
                check_out_id: primaryOrder.check_out_id
              }];

              // Gather all order items from these orders
              const allItems: any[] = [];
              paymentOrders.forEach((o: any) => {
                if (o.order_items) {
                  allItems.push(...o.order_items);
                }
              });

              orderDto.orderItems = allItems.map((dbItem: any) => ({
                id: dbItem.id,
                item_name: dbItem.item_name,
                item_quantity: dbItem.item_quantity,
                item_cost: dbItem.item_cost,
                status: dbItem.status,
                item_description: dbItem.item_description
              }));
              orderDto.orderItems = this.combineOrderItemsQuantities(orderDto.orderItems);
              this.updateOrderTotalAmountBasedOnItems(orderDto);

              orderDto.paidDetails = [{
                actual_amount: p.actual_amount,
                paid_amount: p.paid_amount,
                mode: p.payment_mode,
                period: p.created_time
              }];

              return orderDto;
            }).filter((dto: any) => dto !== null) as PaidFileOrderDto[];

            // Compute overall totals from the complete payments list for the day
            this.resetSaleTotals();
            payments.forEach((pay: any) => {
              this.TotalPaidAmount += parseFloat(pay.paid_amount || '0');
              this.TotalActualAmount += parseFloat(pay.actual_amount || '0');
              this.addSaleByMode(pay.payment_mode, pay.paid_amount);
            });

            const uniquePaidOrdersMap = new Map<string, PaidFileOrderDto>();
            const noIdOrders: PaidFileOrderDto[] = [];
            
            this.paidOrderList.concat(newPaidOrders).forEach((item: PaidFileOrderDto) => {
              if (item.order && item.order[0] && item.order[0].id) {
                const key = item.order[0].id.toString();
                if (uniquePaidOrdersMap.has(key)) {
                  const existing = uniquePaidOrdersMap.get(key);
                  const existingTime = existing?.paidDetails?.[0]?.period || '';
                  const newTime = item.paidDetails?.[0]?.period || '';
                  if (newTime > existingTime) {
                    uniquePaidOrdersMap.set(key, item);
                  }
                } else {
                  uniquePaidOrdersMap.set(key, item);
                }
              } else {
                noIdOrders.push(item);
              }
            });
            
            this.paidOrderList = [...Array.from(uniquePaidOrdersMap.values()), ...noIdOrders];
            this.paidOrderList.sort((a, b) => {
              const dateA = a.order && a.order[0] && a.order[0].created_at ? new Date(a.order[0].created_at).getTime() : 0;
              const dateB = b.order && b.order[0] && b.order[0].created_at ? new Date(b.order[0].created_at).getTime() : 0;
              return dateB - dateA;
            });
            // Prefer order.table_place when splitting cash / online / delivery
            this.recomputeDeliveryTotalsFromPaidList();
            this.showPaidSpinner = false;
            if (USE_DATABASE) {
              this.saleDate = displayDate;
            } else if (this.paidOrderList.length > 0) {
              this.saleDate = this.sharedService.convertDateTimeToDateString(this.paidOrderList[0].paidDetails[0].period);
            }
            if (this.showItemsSummaryPopup) {
              this.calculateAggregatedItems();
            }
            this.isSyncingPaid = false;
          };

          if (uniqueCheckoutIds.length > 0) {
            // Now fetch both primary and secondary orders (grouped by check_out_id)
            this.graphqlService.getPaidOrdersByIdsAndCheckoutIds(uniqueOrderIds as number[], uniqueCheckoutIds as string[]).subscribe((groupedRes: any) => {
              const rawOrders = groupedRes.data.kubera_order || [];
              handleOrders(rawOrders);
            }, (err: any) => {
              console.error("Error fetching grouped paid orders:", err);
              this.showPaidSpinner = false;
              this.isSyncingPaid = false;
            });
          } else {
            handleOrders(primaryOrders);
          }

        }, (err: any) => {
          console.error("Error fetching paid orders by ID:", err);
          this.showPaidSpinner = false;
          this.isSyncingPaid = false;
        });

      }, (err: any) => {
        console.error("Error fetching payments by date:", err);
        this.showPaidSpinner = false;
        this.isSyncingPaid = false;
      });

    } else {
      try {
        this.paidOrderList = [];
        this.resetSaleTotals();

        const folderPath = '/orders/paid_orders/';
        this.paidFiles = await this.dropboxService.getFilesInFolder(folderPath);
        for (const file of this.paidFiles) {
          file.data = await this.dropboxService.getFileData(file.path_display);
          const respo = this.sharedService.parseNestedCsvToObjectDynamic3THeader(file.data.fileBlob)
          let order: PaidFileOrderDto = new PaidFileOrderDto();
          order.filePath = file.name
          order.order = (await respo).headers1
          order.orderItems = (await respo).headers2
          order.paidDetails = (await respo).headers3
          
          this.updateOrderTotalAmountBasedOnItems(order);
          this.paidOrderList.push(order);
          console.log("respo - ", (await respo).headers1)
          this.TotalPaidAmount = this.TotalPaidAmount + parseFloat(order.paidDetails[0].paid_amount);
          this.TotalActualAmount = this.TotalActualAmount + parseFloat(order.paidDetails[0].actual_amount);
          this.addSaleByMode(
            order.paidDetails[0].mode,
            order.paidDetails[0].paid_amount,
            this.isDeliveryPaidCard(order)
          );
        }
        this.paidOrderList.sort((a, b) => a.order.id - b.order.id);
        this.paidOrderList.reverse()
        this.showPaidSpinner = false;
        if (this.paidOrderList.length > 0) {
          this.saleDate = this.sharedService.convertDateTimeToDateString(this.paidOrderList[0].paidDetails[0].period);
        }
        if (this.showItemsSummaryPopup) {
          this.calculateAggregatedItems();
        }
      } catch (err) {
        console.error("Error fetching paid orders in Dropbox:", err);
        this.showPaidSpinner = false;
      } finally {
        this.isSyncingPaid = false;
      }
    }
  }

  onDateChange(event: any) {
    this.getPaidOrders();
  }

  pollingIntervalId: any;

  calculateAggregatedItems() {
    const itemMap = new Map<string, number>();
    
    this.paidOrderList.forEach(dto => {
      if (dto.orderItems) {
        dto.orderItems.forEach((item: any) => {
          const name = item.item_name;
          const qty = parseInt(item.item_quantity, 10);
          if (name && !isNaN(qty)) {
            itemMap.set(name, (itemMap.get(name) || 0) + qty);
          }
        });
      }
    });

    this.aggregatedItemsList = Array.from(itemMap.entries()).map(([name, quantity]) => ({
      name,
      quantity
    }));

    this.aggregatedItemsList.sort((a, b) => b.quantity - a.quantity);
    this.filterSummaryItems();
  }

  openItemsSummaryPopup() {
    this.calculateAggregatedItems();
    this.showItemsSummaryPopup = true;
    this.startRealTimeSummaryPolling();
  }

  closeItemsSummaryPopup() {
    this.showItemsSummaryPopup = false;
    this.stopRealTimeSummaryPolling();
  }

  filterSummaryItems() {
    if (!this.searchItemQuery) {
      this.filteredAggregatedItemsList = [...this.aggregatedItemsList];
    } else {
      const query = this.searchItemQuery.toLowerCase();
      this.filteredAggregatedItemsList = this.aggregatedItemsList.filter(item =>
        item.name.toLowerCase().includes(query)
      );
    }
  }

  startRealTimeSummaryPolling() {
    this.stopRealTimeSummaryPolling();
    this.pollingIntervalId = setInterval(() => {
      if (this.showItemsSummaryPopup) {
        this.refreshPaidOrder();
      } else {
        this.stopRealTimeSummaryPolling();
      }
    }, 5000);
  }

  stopRealTimeSummaryPolling() {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
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
    if (USE_DATABASE) {
      this.getPaidOrders();
      return;
    }

    if (this.isSyncingPaid) {
      return;
    }
    this.isSyncingPaid = true;
    
    try {
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
        this.addSaleByMode(
          order.paidDetails[0].mode,
          order.paidDetails[0].paid_amount,
          this.isDeliveryPaidCard(order)
        );
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
      if (this.showItemsSummaryPopup) {
        this.calculateAggregatedItems();
      }
      this.showPaidSpinner = false;
    } catch (err) {
      console.error("Error in getUpdatedPaidOrders:", err);
      this.showPaidSpinner = false;
    } finally {
      this.isSyncingPaid = false;
    }
  }

  removePaidItem(item: any) {
    const index = this.paidFiles.indexOf(item);
    if (index !== -1) {
      this.paidFiles.splice(index, 1);
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
    if (this.showItemsSummaryPopup) {
      this.calculateAggregatedItems();
    }
  }

  formatStringWithTwoDecimalPlaces(value: any): string {
    const numberValue = parseFloat(value);
    const formattedNumber = numberValue.toFixed(2);
    return formattedNumber;
  }

  updatedFiles: any[] = [];
  async getUpdatedCheckOutOrders() {
    if (USE_DATABASE) {
      this.getCheckOutOrders();
      return;
    }
    
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
    if (USE_DATABASE) {
      this.getCheckOutOrders();
    } else {
      this.getUpdatedCheckOutOrders();
    }
  }

  refreshOrder() {
    if (USE_DATABASE) {
      this.getCheckOutOrders();
    } else {
      this.getUpdatedCheckOutOrders();
    }
  }

  refreshPaidOrder() {
    if (USE_DATABASE) {
      this.getPaidOrders();
    } else {
      this.getUpdatedPaidOrders();
    }
  }

    paidOrderReport() {
    this.generateAdvancedConsolidatedPdfReport(this.paidOrderList, this.reportAmounts);
  }
  selectTab(tabName: string): void {
    window.scrollTo(0, 0);
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

  getOrderIdsString(orderList: any): string {
    if (!orderList) return '';
    let ids: any[] = [];
    if (Array.isArray(orderList)) {
      ids = orderList.map(o => o ? (o.id !== undefined ? o.id : o) : '').filter(val => val !== '');
    } else if (typeof orderList === 'object') {
      if (orderList.id !== undefined) {
        ids = orderList.id.toString().split(',').map((idStr: string) => idStr.trim());
      }
    } else {
      ids = orderList.toString().split(',').map((idStr: string) => idStr.trim());
    }

    const flatIds: string[] = [];
    ids.forEach(id => {
      id.toString().split(',').forEach((part: string) => {
        if (part.trim()) flatIds.push(part.trim());
      });
    });
    return flatIds.join(', ');
  }

  isDeliveryPaidCard(card: any): boolean {
    const order = Array.isArray(card?.order) ? card.order[0] : card?.order;
    const place = String(order?.table_place || '');
    const mode = String(card?.paidDetails?.[0]?.mode || card?.paidDetails?.[0]?.payment_mode || '');
    return place === DELIVERY_TABLE_PLACE || mode === 'delivery';
  }

  private resetSaleTotals(): void {
    this.TotalPaidAmount = 0;
    this.TotalActualAmount = 0;
    this.TotalCashAmount = 0;
    this.TotalOnlineAMpunt = 0;
    this.TotalDeliveryAmount = 0;
    this.TotalDeliveryOrders = 0;
  }

  private addSaleByMode(mode: string, paidAmount: number, isDeliveryOrder = false): void {
    const amt = parseFloat(String(paidAmount || '0')) || 0;
    const m = String(mode || '').toLowerCase();
    if (m === 'delivery' || isDeliveryOrder) {
      this.TotalDeliveryAmount += amt;
      this.TotalDeliveryOrders += 1;
      return;
    }
    if (m === 'cash') {
      this.TotalCashAmount += amt;
      return;
    }
    this.TotalOnlineAMpunt += amt;
  }

  private recomputeDeliveryTotalsFromPaidList(): void {
    this.TotalDeliveryAmount = 0;
    this.TotalDeliveryOrders = 0;
    let online = 0;
    let cash = 0;
    for (const card of this.paidOrderList || []) {
      const mode = String(card?.paidDetails?.[0]?.mode || '');
      const amt = parseFloat(String(card?.paidDetails?.[0]?.paid_amount || '0')) || 0;
      if (this.isDeliveryPaidCard(card) || mode === 'delivery') {
        this.TotalDeliveryAmount += amt;
        this.TotalDeliveryOrders += 1;
      } else if (mode === 'cash') {
        cash += amt;
      } else {
        online += amt;
      }
    }
    // Keep cash/online in sync when list is the source of truth (DB path already set paid/actual)
    if ((this.paidOrderList || []).length) {
      this.TotalCashAmount = cash;
      this.TotalOnlineAMpunt = online;
    }
  }

  paidCardTableLabel(card: any): string {
    const order = Array.isArray(card?.order) ? card.order[0] : card?.order;
    if (!order) return 'Order';
    if (this.isDeliveryPaidCard(card)) {
      return `🛵 ${deliveryDisplayTableNo(order.order_ref_id || order.id)}`;
    }
    return `📍 Table ${order.table_no ?? ''}`;
  }

  paidCardModeLabel(card: any): string {
    const mode = String(card?.paidDetails?.[0]?.mode || '');
    if (this.isDeliveryPaidCard(card) || mode === 'delivery') return '🛵 Delivery';
    if (mode === 'cash') return '💵 Cash';
    return '💳 Online';
  }

  getCardIdsString(orderList: any): string {
    if (!orderList) return '';
    let ids: any[] = [];
    if (Array.isArray(orderList)) {
      ids = orderList.map(o => o ? (o.id !== undefined ? o.id : o) : '').filter(val => val !== '');
    } else if (typeof orderList === 'object') {
      if (orderList.id !== undefined) {
        ids = orderList.id.toString().split(',').map((idStr: string) => idStr.trim());
      }
    } else {
      ids = orderList.toString().split(',').map((idStr: string) => idStr.trim());
    }

    const flatIds: string[] = [];
    ids.forEach(id => {
      id.toString().split(',').forEach((part: string) => {
        const trimmed = part.trim();
        if (trimmed && !flatIds.includes(trimmed)) {
          flatIds.push(trimmed);
        }
      });
    });

    if (flatIds.length <= 2) {
      return flatIds.join(', ');
    } else {
      return `${flatIds.slice(0, 2).join(', ')}... (+${flatIds.length - 2} more)`;
    }
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
          if (!itemMap[itemName].all_ids) {
            itemMap[itemName].all_ids = [itemMap[itemName].id];
          }
          if (item.id) {
            itemMap[itemName].all_ids.push(item.id);
          }
        } else {
          // If the item is not in the map, create a new entry
          itemMap[itemName] = { ...item, item_quantity: quantity, all_ids: item.id ? [item.id] : [] };
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

  mergeOrdersPrompt(order: any) {
    this.selectedOrderToMerge = order;
    this.orderIdsToMergeInput = '';
    this.isMergePopupOpen = true;
  }

  closeMergePopup() {
    this.isMergePopupOpen = false;
    this.selectedOrderToMerge = null;
    this.orderIdsToMergeInput = '';
  }

  executeMergeOrders() {
    if (!this.selectedOrderToMerge || !this.orderIdsToMergeInput.trim()) {
      return;
    }

    if (!USE_DATABASE) {
      this.errorMessage = "Merge is only supported in Database mode.";
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    const orderIds = this.orderIdsToMergeInput
      .split(',')
      .map((s: string) => parseInt(s.trim(), 10))
      .filter((n: number) => !isNaN(n));

    if (orderIds.length === 0) {
      this.errorMessage = "Please enter valid numeric Order IDs.";
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    // Capture all needed values from selectedOrderToMerge before closing the popup and resetting properties
    const primaryOrder = this.selectedOrderToMerge.order[0];
    const mainTableNo = primaryOrder.table_no;
    const mainTablePlace = primaryOrder.table_place;
    const mainOrderIds = this.selectedOrderToMerge.order.map((o: any) => o.original_id !== undefined ? o.original_id : o.id);
    let mainCheckoutId = primaryOrder.check_out_id;

    // Close the merge popup immediately so the user returns to the main page while processing
    this.closeMergePopup();

    this.showSpinner = true;

    // Fetch order details to verify their table numbers
    this.graphqlService.getPaidOrdersByIds(orderIds).subscribe(
      (result: any) => {
        const dbOrders = result.data.kubera_order || [];

        if (dbOrders.length !== orderIds.length) {
          this.errorMessage = "Some entered Order IDs do not exist.";
          this.showSpinner = false;
          setTimeout(() => this.errorMessage = '', 3000);
          return;
        }

        // Verify all target orders are from the same table (matching table number and place)
        const invalidOrders = dbOrders.filter((o: any) => o.table_no !== mainTableNo || o.table_place !== mainTablePlace);
        if (invalidOrders.length > 0) {
          this.errorMessage = `All orders must be from the same table (Table ${mainTableNo}${mainTablePlace ? ' ' + mainTablePlace : ''}).`;
          this.showSpinner = false;
          setTimeout(() => this.errorMessage = '', 4000);
          return;
        }

        let mainOrdersNeedUpdate = false;

        if (!mainCheckoutId || !mainCheckoutId.startsWith('CHK_')) {
          mainCheckoutId = 'CHK_' + new Date().getTime().toString() + '_' + Math.floor(Math.random() * 1000).toString();
          mainOrdersNeedUpdate = true;
        }

        const allIdsToUpdate = [...orderIds];
        if (mainOrdersNeedUpdate) {
          allIdsToUpdate.push(...mainOrderIds);
        }

        this.graphqlService.updateMultipleOrdersCheckout(allIdsToUpdate, 'checkout', mainCheckoutId).subscribe(
          (res: any) => {
            this.successMessage = "Orders merged successfully!";
            this.webSocketService.sendMessage("payment");
            this.getCheckOutOrders(true);
            setTimeout(() => this.successMessage = '', 3000);
          },
          (err: any) => {
            console.error("Error merging orders:", err);
            this.errorMessage = "Failed to merge orders.";
            this.showSpinner = false;
            setTimeout(() => this.errorMessage = '', 3000);
          }
        );
      },
      (err: any) => {
        console.error("Error checking order tables:", err);
        this.errorMessage = "Error verifying order table numbers.";
        this.showSpinner = false;
        setTimeout(() => this.errorMessage = '', 3000);
      }
    );
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
    if (!USE_DATABASE) {
      let kubera_payment_details_insert_input: any = {};
      //added code for updating payment details in database
      kubera_payment_details_insert_input.order_id = order_ids;
      kubera_payment_details_insert_input.payment_mode = paymentType.mode;
      kubera_payment_details_insert_input.paid_amount = parseFloat(paymentType.paid_amount);
      kubera_payment_details_insert_input.actual_amount = parseFloat(paymentType.actual_amount);
      kubera_payment_details_insert_input.created_at = this.sharedService.updateCurrentDateInIST();
      kubera_payment_details_insert_input.created_time =  paymentType.period;
      kubera_payment_details_insert_input.bill_no =  data.order[0].billNo;
      this.graphqlService.insertPaymentDetails(kubera_payment_details_insert_input).subscribe();
    }
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

  prepareQStashPayload(data: any, actualAmount: number, paidAmount: number, paymentMode: string): any {
    try {
      let idsStr = (data.order && data.order[0]?.id) ? data.order[0].id.toString() : "";
      let orderIds = idsStr.split(',').map((idStr: string) => parseInt(idStr.trim())).filter((id: number) => !isNaN(id));
      let primaryOrderId = orderIds[0] || null;

      const orderData = (data.order || []).map((o: any) => {
        return {
          id: o.original_id ? Number(o.original_id) : null,
          order_ref_id: o.order_ref_id ? Number(o.order_ref_id) : null,
          table_no: o.table_no ? Number(o.table_no) : null,
          table_place: o.table_place || "",
          customer_number: o.customer_number || "",
          employee: o.employee || "",
          order_status: "paid",
          check_out_id: o.check_out_id ? String(o.check_out_id) : "",
          comments: o.comments || "",
          created_at: o.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      const itemData = (data.orderItems || []).map((item: any) => {
        const matchingOrder = (data.order || []).find((o: any) => o.original_id === item.order_id);
        const orderRefId = matchingOrder ? matchingOrder.order_ref_id : (data.order && data.order[0]?.order_ref_id);

        return {
          order_ref_id: orderRefId ? Number(orderRefId) : null,
          order_id: item.order_id ? Number(item.order_id) : primaryOrderId,
          item_name: item.item_name || "",
          item_description: item.item_description || "",
          item_quantity: item.item_quantity ? Number(item.item_quantity) : 0,
          status: item.status || "Preparing",
          created_at: item.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      let billNoRaw = data.order && data.order[0]?.billNo;
      let billNo = billNoRaw ? String(billNoRaw) : "";

      const modeMapped = paymentMode === 'online' ? 'Card' : (paymentMode === 'cash' ? 'Cash' : paymentMode);

      const paymentData = [
        {
          order_id: idsStr,
          bill_no: billNo,
          payment_mode: modeMapped,
          actual_amount: actualAmount,
          paid_amount: paidAmount,
          created_at: this.sharedService.updateCurrentDateInIST(),
          created_time: this.sharedService.updateCurrentDateTimeInIST()
        }
      ];

      return {
        orderData,
        itemData,
        paymentData
      };
    } catch (e) {
      console.error("Error preparing QStash payload:", e);
      return null;
    }
  }

  sendQStashPayload(payload: any) {
    if (!payload) return;
    this.dataService.postToQStash(payload).subscribe(
      (response: any) => {
        console.log("Successfully posted to QStash queue:", response);
      },
      (error: any) => {
        console.error("Error posting to QStash queue:", error);
      }
    );
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

    // Prepare QStash payload before database/file operations
    let qstashPayload: any = null;
    if (USE_DATABASE) {
      qstashPayload = this.prepareQStashPayload(data, parseFloat(paymentType.actual_amount) || 0, parseFloat(paymentType.paid_amount) || 0, paymentType.mode);
    }

    if (USE_DATABASE) {
      let idsStr = data.order[0].id.toString();
      let orderIds = idsStr.split(',').map((idStr: string) => parseInt(idStr.trim())).filter((id: number) => !isNaN(id));

      const formattedDate = this.sharedService.updateCurrentDateInIST();

      let paymentPayload = {
        actual_amount: parseFloat(paymentType.actual_amount),
        paid_amount: parseFloat(paymentType.paid_amount),
        order_id: idsStr,
        payment_mode: paymentType.mode,
        bill_no: data.order[0].billNo.toString(),
        created_time: paymentType.period,
        created_at: formattedDate
      };

      this.graphqlService.insertPaymentDetails(paymentPayload).subscribe((response: any) => {
        const paymentId = response?.data?.insert_kubera_payment_details_one?.id;
        let completed = 0;
        let hasError = false;
        orderIds.forEach((id: number) => {
          this.graphqlService.updateOrderStatus(id, "paid").subscribe(() => {
            completed++;
            if (completed === orderIds.length) {
              if (USE_DATABASE && qstashPayload) {
                if (paymentId && qstashPayload.paymentData && qstashPayload.paymentData.length > 0) {
                  qstashPayload.paymentData[0].payment_detail_id_ref = paymentId;
                }
                this.sendQStashPayload(qstashPayload);
              }
              this.sendMailPaymentOrder(data);
              setTimeout(() => { this.closePaymentTypePopup(); this.refreshOrder(); }, 3000);
            }
          }, (err: any) => { 
            console.error('Error updating status:', err); 
            if (!hasError) {
              hasError = true;
              this.showSpinner = false;
            }
          });
        });
      }, (err: any) => {
        console.error("Error inserting payment:", err);
        this.showSpinner = false;
      });

      return;
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

    // Prepare QStash payload before database/file operations
    let qstashPayload: any = null;
    if (USE_DATABASE) {
      qstashPayload = this.prepareQStashPayload(data, parseFloat(paymentType.actual_amount) || 0, parseFloat(paymentType.paid_amount) || 0, "owner");
    }

    if (USE_DATABASE) {
      let idsStr = data.order[0].id.toString();
      let orderIds = idsStr.split(',').map((idStr: string) => parseInt(idStr.trim())).filter((id: number) => !isNaN(id));

      const formattedDate = this.sharedService.updateCurrentDateInIST();

      let paymentPayload = {
        actual_amount: parseFloat(paymentType.actual_amount),
        paid_amount: 0.0,
        order_id: idsStr,
        payment_mode: "owner",
        bill_no: data.order[0].billNo.toString(),
        created_time: paymentType.period,
        created_at: formattedDate
      };

      this.graphqlService.insertPaymentDetails(paymentPayload).subscribe((response: any) => {
        const paymentId = response?.data?.insert_kubera_payment_details_one?.id;
        let completed = 0;
        let hasError = false;
        orderIds.forEach((id: number) => {
          this.graphqlService.updateOrderStatus(id, "paid").subscribe(() => {
            completed++;
            if (completed === orderIds.length) {
              if (USE_DATABASE && qstashPayload) {
                if (paymentId && qstashPayload.paymentData && qstashPayload.paymentData.length > 0) {
                  qstashPayload.paymentData[0].payment_detail_id_ref = paymentId;
                }
                this.sendQStashPayload(qstashPayload);
              }
              this.sendMailAdminPaymentOrder(data);
              setTimeout(() => { this.closeOwnerPasswordPopup(); this.refreshOrder(); }, 3000);
            }
          }, (err: any) => { 
            console.error('Error updating status:', err); 
            if (!hasError) {
              hasError = true;
              this.showSpinner = false;
            }
          });
        });
      }, (err: any) => {
        console.error("Error inserting payment:", err);
        this.showSpinner = false;
      });

      return;
    }

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
    this.editOrder = order;
    if (!this.apiEditStatus) {
      this.username = "";
      this.isPasswordPopupOpen = true
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
    if (USE_DATABASE) {
      this.editableOrder = JSON.parse(JSON.stringify(this.editOrder));
      this.originalEditOrder = JSON.parse(JSON.stringify(this.editOrder));
      this.editMode = new Array(this.editableOrder.orderItems.length).fill(false);
      this.isPasswordPopupOpen = false;
      this.isEditOrderPopUpOpen = true;
    } else {
      this.downloadCheckOutFileByFileName(this.editOrder.filePath);
    }
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

    if (USE_DATABASE) {
      // 1. Get all the order IDs in the group
      let idsStr = this.editableOrder.order[0].id.toString();
      let orderIds = idsStr.split(',').map((idStr: string) => parseInt(idStr.trim())).filter((id: number) => !isNaN(id));
      let primaryOrderId = orderIds[0];

      // 2. Iterate through editable items and distribute quantities to existing records
      let updatePayloads: any[] = [];
      let newSummary = 0;

      this.editableOrder.orderItems.forEach((item: any, i: number) => {
        let targetQty = parseFloat(item.item_quantity);
        if (isNaN(targetQty) || targetQty < 0) targetQty = 0;
        newSummary += (parseFloat(item.item_cost) * targetQty);

        let originalItem = this.editOrder.orderItems[i];
        let originalQty = originalItem ? parseFloat(originalItem.item_quantity) : -1;

        if (item.all_ids && item.all_ids.length > 0) {
          // Distribute: First ID gets targetQty, rest get 0.
          item.all_ids.forEach((id: number, index: number) => {
            let assignedQty = (index === 0) ? targetQty : 0;
            updatePayloads.push({
              where: { id: { _eq: id } },
              _set: { 
                item_quantity: Math.floor(assignedQty), 
                item_cost: item.item_cost.toString() 
              }
            });
          });
        }
      });

      let newAdditional = parseFloat(this.editableOrder.order[0].order_additional_service_amount || '0');
      let newTotal = newSummary + newAdditional;

      // Close popup immediately upon saving
      this.isEditOrderPopUpOpen = false;

      // 3. Prepare order totals updates
      let orderUpdates: any[] = [];
      orderUpdates.push({
        where: { id: { _eq: primaryOrderId } },
        _set: { 
          order_summary_amount: newSummary, 
          order_additional_service_amount: newAdditional, 
          order_total_amount: newTotal 
        }
      });

      let secondaryIds = orderIds.filter((id: number) => id !== primaryOrderId);
      secondaryIds.forEach((id: number) => {
        orderUpdates.push({
          where: { id: { _eq: id } },
          _set: {
            order_summary_amount: 0,
            order_additional_service_amount: 0,
            order_total_amount: 0
          }
        });
      });

      const finalize = () => {
        this.showSpinner = false;
        this.getCheckOutOrders(); // Refresh the DB list completely to guarantee UI sync
        this.revokeEditAccess(); // Revoke edit access once save is complete
        this.sendMailForEditOrder();
      };

      // 4. Execute single batched GraphQL call
      this.graphqlService.batchEditOrder(updatePayloads, orderUpdates).subscribe(() => {
        finalize();
      }, (err: any) => { 
        console.error('Error batch updating order:', err); 
        finalize(); // Always refresh to sync UI with whatever the DB state is
      });

      return;
    }

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

  


showReportButton = false;
checkReportButtonTime() {
  const now = new Date();

  const hours = now.getHours();
  const minutes = now.getMinutes();

  const currentMinutes = hours * 60 + minutes;

  const startTime = 22 * 60 + 30; // 10:30 PM
  const endTime = 1 * 60;         // 1:00 AM

  // Time window crosses midnight
  this.showReportButton =
    currentMinutes >= startTime || currentMinutes < endTime;
}

isReportPopupOpen = false;

reportAmounts = {
  swiggy: 0,
  zomato: 0,
  swiggyDineIn: 0,
  dstrict: 0
};
openReportPopup() {
  this.reportAmounts = {
    swiggy: 0,
    zomato: 0,
    swiggyDineIn: 0,
    dstrict: 0
  };
  this.isReportPopupOpen = true;
}

closeReportPopup() {
  this.isReportPopupOpen = false;
}

confirmReport() {
  this.isReportPopupOpen = false;
  this.generateAdvancedConsolidatedPdfReport(
    this.paidOrderList, this.reportAmounts
  
  );
}
generateAdvancedConsolidatedPdfReport(

  orders: PaidFileOrderDto[],
  reportAmounts: {
    swiggy: number;
    zomato: number;
    swiggyDineIn: number;
    dstrict: number;
  }
) {
    this.showSpinner = false;

  const pdf = new jsPDF('p', 'mm', 'a4');

  /* ================= HEADER ================= */
  const now = new Date();
  const paymentDate = now.toISOString().split('T')[0];

  const headerDateTime = now.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const addHeader = (title: string) => {
    pdf.setFontSize(14);
    pdf.text(title, 14, 12);
    pdf.setFontSize(9);
    pdf.text(`Generated on: ${headerDateTime}`, 150, 12);
    pdf.setDrawColor(200);
    pdf.line(14, 14, 196, 14);
  };

  /* ================= PAGE 1 – AGGREGATE ITEMS ================= */
  addHeader('Cafe Kubera - Aggregate Item Summary');

  const itemAggregate: Record<string, { qty: number; amount: number }> = {};

  orders.forEach(order => {
    order.orderItems.forEach((item: any) => {
      if (!itemAggregate[item.item_name]) {
        itemAggregate[item.item_name] = { qty: 0, amount: 0 };
      }
      itemAggregate[item.item_name].qty += +item.item_quantity;
      itemAggregate[item.item_name].amount +=
        +item.item_quantity * +item.item_cost;
    });
  });

  autoTable(pdf, {
    startY: 18,
    head: [['Item', 'Total Qty', 'Total Amount']],
    body: Object.keys(itemAggregate).map(key => [
      key,
      itemAggregate[key].qty,
      itemAggregate[key].amount.toFixed(2)
    ]),
    styles: { fontSize: 10 }
  });

  /* ================= PAGE 2 – DETAILED ORDERS ================= */
  pdf.addPage();
  addHeader('Cafe Kubera - Detailed Orders');

  const detailRows: any[] = [];

  orders.forEach(order => {
    const o = order.order?.[0];
    const p = order.paidDetails?.[0];
    if (!o || !p) return;

    const diff = +p.actual_amount - +p.paid_amount;

    order.orderItems.forEach((item: any) => {
      detailRows.push([
        o.billNo,
        p.period,
        p.mode,
        p.actual_amount,
        p.paid_amount,
        diff.toFixed(2),
        item.item_name,
        item.item_quantity,
        item.item_cost
      ]);
    });
  });

  autoTable(pdf, {
    startY: 18,
    head: [['Bill', 'Date', 'Mode', 'Actual', 'Paid', 'Diff', 'Item', 'Qty', 'Cost']],
    body: detailRows,
    styles: { fontSize: 7, cellPadding: 2 }
  });

  /* ================= PAGE 3 – PAYMENT SUMMARY ================= */
  pdf.addPage();
  addHeader('Cafe Kubera - Payment Summary');

  let totalActual = 0;
  let totalPaid = 0;
  let cashTotal = 0;
  let onlineTotal = 0;

  orders.forEach(o => {
    const p = o.paidDetails?.[0];
    if (!p) return;

    totalActual += +p.actual_amount;
    totalPaid += +p.paid_amount;

    p.mode === 'cash'
      ? cashTotal += +p.paid_amount
      : onlineTotal += +p.paid_amount;
  });

  const totalDifference = totalActual - totalPaid;

  /* ---------- PAYMENT SUMMARY TABLE ---------- */
  autoTable(pdf, {
    startY: 20,
    head: [['Description', 'Amount']],
    body: [
      ['Total Actual Amount', totalActual.toFixed(2)],
      ['Total Paid Amount', totalPaid.toFixed(2)],
      ['Difference', totalDifference.toFixed(2)],
      ['Cash Payments', cashTotal.toFixed(2)],
      ['Online Payments', onlineTotal.toFixed(2)]
    ],
    styles: { fontSize: 11 },
    didParseCell(data) {
      if (data.section === 'body' && data.row.index === 1) {
        data.cell.styles.fontStyle = 'bold'; // Total Paid
      }
    }
  });

  /* ---------- ONLINE PLATFORM SETTLEMENT ---------- */
  const platformTotal =
    reportAmounts.swiggy +
    reportAmounts.zomato +
    reportAmounts.swiggyDineIn +
    reportAmounts.dstrict;

  const platformStartY = (pdf as any).lastAutoTable.finalY + 8;

  pdf.setFontSize(12);
  pdf.text('Online Platform Settlement', 14, platformStartY);

  autoTable(pdf, {
    startY: platformStartY + 4,
    head: [['Platform', 'Amount']],
    body: [
      ['Swiggy', reportAmounts.swiggy.toFixed(2)],
      ['Zomato', reportAmounts.zomato.toFixed(2)],
      ['Swiggy Dine-In', reportAmounts.swiggyDineIn.toFixed(2)],
      ['Dstrict', reportAmounts.dstrict.toFixed(2)],
      ['Platform Total', platformTotal.toFixed(2)]
    ],
    styles: { fontSize: 11 },
    didParseCell(data) {
      if (data.section === 'body' && data.row.index === 4) {
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  /* ---------- GRAND TOTAL ---------- */
  const grandTotal = totalPaid + platformTotal;
  const grandTotalY = (pdf as any).lastAutoTable.finalY + 8;

  autoTable(pdf, {
    startY: grandTotalY,
    head: [['Final Summary', 'Amount']],
    body: [
      ['Grand Total Collected', grandTotal.toFixed(2)]
    ],
    styles: {
      fontSize: 12,
      fontStyle: 'bold'
    }
  });

  /* ================= DATA FOR EMAIL ================= */
  const page3Summary = {
    reportDate: paymentDate,
    totalOrders: orders.length,
    totalActual,
    totalPaid,
    totalDifference,
    cashTotal,
    onlineTotal,
    platforms: reportAmounts
  };
 
  /* ================= INSERT DAILY SALES REPORT TO HASURA ================= */
  const dailyReportPayload = {
    report_date: paymentDate,
    total_orders: orders.length,
    total_actual: totalActual,
    total_paid: totalPaid,
    difference: totalDifference,
    cash_amount: cashTotal,
    online_amount: onlineTotal,
    swiggy_amount: reportAmounts.swiggy,
    zomato_amount: reportAmounts.zomato,
    swiggy_dine_in_amount: reportAmounts.swiggyDineIn,
    dstrict_amount: reportAmounts.dstrict,
    platform_total: platformTotal,
    grand_total: grandTotal
  };

  this.hasuraDataService.insertDailySalesReport(dailyReportPayload).subscribe({
    next: (res) => {
      console.log('Daily sales report inserted successfully:', res);
    },
    error: (err) => {
      console.error('Error inserting daily sales report:', err);
    }
  });

  /* ================= SEND EMAIL ================= */
  this.sendReportEmail(pdf, page3Summary);
}


private generatePage3MailHtml(summary: any): string {

  const platformTotal =
    summary.platforms.swiggy +
    summary.platforms.zomato +
    summary.platforms.swiggyDineIn +
    summary.platforms.dstrict;

  const grandTotal = summary.totalPaid + platformTotal;

  return `
  <h3>SALE REPORT FOR ${summary.reportDate}</h3>

  <table border="1" cellpadding="8" cellspacing="0" width="100%">
    <tr><th>Description</th><th>Amount</th></tr>
    <tr><td>Total Orders</td><td>${summary.totalOrders}</td></tr>
    <tr><td>Total Actual</td><td>${summary.totalActual.toFixed(2)}</td></tr>
    <tr><td><b>Total Paid</b></td><td><b>${summary.totalPaid.toFixed(2)}</b></td></tr>
    <tr><td>Difference</td><td>${summary.totalDifference.toFixed(2)}</td></tr>
    <tr><td>Cash</td><td>${summary.cashTotal.toFixed(2)}</td></tr>
    <tr><td>Online</td><td>${summary.onlineTotal.toFixed(2)}</td></tr>
  </table>

  <h4>Platform Settlement</h4>
  <table border="1" cellpadding="8" cellspacing="0" width="100%">
    <tr><td>Swiggy</td><td>${summary.platforms.swiggy.toFixed(2)}</td></tr>
    <tr><td>Zomato</td><td>${summary.platforms.zomato.toFixed(2)}</td></tr>
    <tr><td>Swiggy Dine-In</td><td>${summary.platforms.swiggyDineIn.toFixed(2)}</td></tr>
    <tr><td>Dstrict</td><td>${summary.platforms.dstrict.toFixed(2)}</td></tr>
    <tr><td><b>Platform Total</b></td><td><b>${platformTotal.toFixed(2)}</b></td></tr>
  </table>

  <h3>Grand Total: <b>${grandTotal.toFixed(2)}</b></h3>
  `;
}

  successMessage = '';
errorMessage = '';
private sendReportEmail(pdf: jsPDF, summary: any): void {
  // 🔄 Start spinner
  this.showSpinner = true;

  // Reset messages
  this.successMessage = '';
  this.errorMessage = '';

  // Generate HTML table mail body
  const htmlMessage = this.generatePage3MailHtml(summary);

  this.mailService.sendPdfReport(
    pdf,
    'cafekubera2223@gmail.com',
    `Cafe Kubera Consolidated Report - ${summary.reportDate}`,
    htmlMessage
  ).subscribe({
    next: () => {
      // ✅ Success
      this.showSpinner = false;
      this.successMessage = 'Report sent successfully';

      // Auto hide after 4 sec
      setTimeout(() => {
        this.successMessage = '';
      }, 4000);
    },

    error: (err) => {
      // ❌ Error
      console.error('Email Error:', err);

      this.showSpinner = false;
      this.errorMessage = '❌ Failed to send report. Please try again';

      // Auto hide after 4 sec
      setTimeout(() => {
        this.errorMessage = '';
      }, 4000);
    }
  });
}


}

