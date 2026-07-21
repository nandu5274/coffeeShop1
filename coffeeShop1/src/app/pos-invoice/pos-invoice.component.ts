import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { SharedService } from '../service/shared-service';
import * as QRCode from 'qrcode';
import { KUBERA2_UPI_ID, KUBERA_UPI_ID, PAYMENT_TRIGGER_YOUR_ADMIN_SECRET } from '../common/constanst';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-pos-invoice',
  templateUrl: './pos-invoice.component.html',
  styleUrls: ['./pos-invoice.component.scss']
})
export class PosInvoiceComponent implements OnChanges {


  constructor(
    private sharedService: SharedService,private http: HttpClient) {
  }

  invoiceData:any = {};
  updateOrderItem:any = [];
  @Input() printData: any;
    upiQrImageUrl: string = '';

  ngOnChanges(changes: SimpleChanges) {
    // This method will be called whenever the @Input property changes
    if (changes['printData']) {
     this.populateInvoice()
    }
  }
   updateOrderItemPrices(orderItems:any)
  {
    orderItems.forEach((item: any) => {
     
      item.item_gst_cost = Math.ceil(item.item_cost);
      this.updateOrderItem.push(item);
    })

  }
  upiId:string = ''

async checkPaymentTrigger() {
  console.log('checkPaymentTrigger called');
  

  const url = 'https://glorious-marten-67.hasura.app/api/rest/triggerquery';

  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'x-hasura-admin-secret': PAYMENT_TRIGGER_YOUR_ADMIN_SECRET
  });

  try {
    // ⏳ WAITS here until response arrives
    const response: any = await this.http.get(url, { headers }).toPromise();

    console.log('Trigger API response:', response);

    const trigger =
      response?.kubera_payment_trigger?.[0]?.trigger?.trim();



    if (trigger === 'n') {
      this.upiId = KUBERA_UPI_ID;
      console.log('Trigger = n → Using KUBERA_UPI_ID');
      this.generateUpiQr();
    } else if (trigger === 'y') {
      this.upiId = KUBERA2_UPI_ID;
      console.log('Trigger = y → Using KUBERA2_UPI_ID');

       this.generateUpiQr();
       this.callTriggerN();
    } else {
      console.warn('Unknown trigger value:', trigger);
      return;
    }

  

  } catch (error) {
    console.error('Trigger API failed', error);
  } 
}


private async callTriggerN() {
 
  const url = 'https://glorious-marten-67.hasura.app/api/rest/trigegrupdaten';

  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'x-hasura-admin-secret': PAYMENT_TRIGGER_YOUR_ADMIN_SECRET
  });

  try {
    const res = await this.http.post(url, {}, { headers }).toPromise();
  
    console.log('trigger_n called successfully', res);
  } catch (error) {
     
    console.error('trigger_n failed', error);
  }
}
  async generateUpiQr() {


    const shopName = 'CafeKubera';
    const amount = this.invoiceData.GrandTotal
    const note = `Invoice ${this.invoiceData.billNo}`;

    const upiLink =
      `upi://pay?pa=${this.upiId}` +
      `&pn=${encodeURIComponent(shopName)}` +
     
      `&cu=INR` +
      `&tn=${encodeURIComponent(note)}`;
console.log("upiLink"+upiLink)
    try {
       this.upiQrImageUrl = await QRCode.toDataURL(upiLink, {
         width: 100,
         margin: 1
       });
    } catch (err) {
      console.error('QR generation failed', err);
    }
  }
  zeroQuantityRemovedOrderItems:any
  zeroQuantityRemovedOrder()
  {
this.zeroQuantityRemovedOrderItems = this.printData.orderItems.filter((item: any) => item.item_quantity !== 0);
  }
  isDiscountEnabled:boolean = false
  discountPercentage:any=''
  addDiscountToActualAmount()
  {
  let customer_details = this.printData.customer_detail
  if(customer_details.customer_member_ship != null && this.isMemberShipValid(customer_details.customer_member_ship))
  {
    this.isDiscountEnabled = true
    this.discountPercentage = 10
    this.invoiceData.un_discount_actualAmount =  this.invoiceData.actualAmount;
    this.printData.un_discount_actualAmount =  this.invoiceData.actualAmount;
    this.printData.actualAmount = this.invoiceData.actualAmount - (this.invoiceData.actualAmount * 0.10);
    this.printData.discountPercentage =  this.discountPercentage
     return this.invoiceData.actualAmount = this.invoiceData.actualAmount - (this.invoiceData.actualAmount * 0.10);

  }
  else{
    this.isDiscountEnabled = false
    return this.invoiceData.actualAmount 
  }
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
  

  populateInvoice()
  {
     
    this.invoiceData.date = this.sharedService.updateCurrentDateInIST();
    this.invoiceData.tokenNumbers = this.getTokenNumbersFromData(this.printData)
    this.invoiceData.tableNo = this.printData.order[0].table_no
    this.invoiceData.billNo = this.printData.order[0].billNo
    this.invoiceData.CustomerNumber = this.getCustomerNumber(this.printData.order)
    this.updateOrderItemPrices(this.printData.orderItems);
    this.zeroQuantityRemovedOrder()

    this.invoiceData.items = this.zeroQuantityRemovedOrderItems
    this.invoiceData.actualAmount =  this.formatStringWithTwoDecimalPlaces(this.getActualAmount(this.printData.orderItems))
    if(this.printData.customer_detail!=null)
    {
      this.invoiceData.actualAmount = this.addDiscountToActualAmount();
    }

  

    this.invoiceData.sgst =   (this.invoiceData.actualAmount * 2.5) / 100;
    this.invoiceData.sgst = this.formatStringWithTwoDecimalPlaces( this.invoiceData.sgst );
    this.invoiceData.cgst =  (this.invoiceData.actualAmount * 2.5) / 100;
    this.invoiceData.cgst = this.formatStringWithTwoDecimalPlaces( this.invoiceData.cgst );
    this.invoiceData.GrandTotal =  this.invoiceData.GrandTotal =   parseFloat(this.invoiceData.actualAmount)
    +   parseFloat(this.invoiceData.sgst) +   parseFloat(this.invoiceData.cgst );
    
      this.invoiceData.GrandTotal =  this.formatStringWithTwoDecimalPlaces(    this.invoiceData.GrandTotal)
       this.checkPaymentTrigger();
  }
  getCustomerNumber(ordersList: any[]) {
    const latestCustomerNumber = ordersList.find((obj: any) => obj.customer_number !== "")?.customer_number || "";
  
    return latestCustomerNumber;
  }
  getTokenNumbersFromData(data:any)
  {
     const ids: string[] = [];
     data.order.forEach((obj: any) => {
       if (obj && obj.id) {
         obj.id.toString().split(',').forEach((part: string) => {
           const trimmed = part.trim();
           if (trimmed && !ids.includes(trimmed)) {
             ids.push(trimmed);
           }
         });
       }
     });
     return ids.join(',');
  }
  
  formatStringWithTwoDecimalPlaces(value :any): string {
    const numberValue = parseFloat(value);
    const formattedNumber = numberValue.toFixed(2);
  
    return formattedNumber;
  }


  getActualAmount(orderItems: any) {
    let orderCost = 0;

    orderItems.forEach((item: any) => {
      let itemCost = item.item_quantity * item.item_gst_cost
      orderCost = orderCost + itemCost

    })
    return orderCost;
  }
  printPage(): void {
    
    // Create a new window with the printable content
    const printWindow = window.open('', '_blank')
    
    // Inject the printable content into the new window
    printWindow?.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Printable Invoice</title>
          <style>
          @page {
            size: auto;
            size: A3;
            margin: 0mm;
        }
      td,
      th,
      tr,
      table {
          border-top: 1px solid black;
          border-collapse: collapse;
      }
      
      td.description,
      th.description {
          width: 60px;
          max-width: 60px;
      }
      
      td.quantity,
      th.quantity {
          width: 40px;
          max-width: 40px;
          word-break: break-all;
      }
      
      td.price,
      th.price {
          width: 24px;
          max-width: 24px;
          word-break: break-all;
      }
      
      .centered {
          margin: auto;
          text-align: center;
          align-content: center;
      }
      .hr{
          opacity: 100%;
          border-top: 1px solid #000;
          margin: 3px 0px 3px 0px;
      }
      .grand-total {
          color: black;
          font-size: medium;
          font-weight: bold;
      }
      
      .ticket {
          width: 275px;
          max-width: 275px;
      }
      
      img {
          max-width: inherit;
          width: inherit;
      }
      
      @media print {
          .hidden-print,
          .hidden-print * {
              display: none !important;
          }
      }
      
        </style>
        </head>
   
          ${document.querySelector('.printable-content')?.innerHTML}
  
      </html>
    `);

    // Close the document stream
    printWindow?.document.close();
    
    // Trigger the print dialog for the new window
    printWindow?.print();
  }

  test()
  {
    console.log("printData", this.printData);
  }

}
