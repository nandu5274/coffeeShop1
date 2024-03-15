import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { SharedService } from '../service/shared-service';

@Component({
  selector: 'app-pos-invoice',
  templateUrl: './pos-invoice.component.html',
  styleUrls: ['./pos-invoice.component.scss']
})
export class PosInvoiceComponent implements OnChanges {

  constructor(
    private sharedService: SharedService) {
  }

  invoiceData:any = {};
  updateOrderItem:any = [];
  @Input() printData: any;

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
  zeroQuantityRemovedOrderItems:any
  zeroQuantityRemovedOrder()
  {
this.zeroQuantityRemovedOrderItems = this.printData.orderItems.filter((item: any) => item.item_quantity !== 0);
  }
  populateInvoice()
  {
    this.invoiceData.date = this.sharedService.updateCurrentDateInIST();
    this.invoiceData.tokenNumbers = this.getTokenNumbersFromData(this.printData)
    this.invoiceData.tableNo = this.printData.order[0].table_no
    this.invoiceData.billNo = this.printData.order[0].billNo
    this.updateOrderItemPrices(this.printData.orderItems);
    this.zeroQuantityRemovedOrder()

    this.invoiceData.items = this.zeroQuantityRemovedOrderItems
    this.invoiceData.actualAmount =  this.formatStringWithTwoDecimalPlaces(this.getActualAmount(this.printData.orderItems))
    this.invoiceData.sgst =   (this.invoiceData.actualAmount * 2.5) / 100;
    this.invoiceData.sgst = this.formatStringWithTwoDecimalPlaces( this.invoiceData.sgst );
    this.invoiceData.cgst =  (this.invoiceData.actualAmount * 2.5) / 100;
    this.invoiceData.cgst = this.formatStringWithTwoDecimalPlaces( this.invoiceData.cgst );
    this.invoiceData.GrandTotal =  this.invoiceData.GrandTotal =   parseFloat(this.invoiceData.actualAmount)
    +   parseFloat(this.invoiceData.sgst) +   parseFloat(this.invoiceData.cgst );
    
      this.invoiceData.GrandTotal =  this.formatStringWithTwoDecimalPlaces(    this.invoiceData.GrandTotal)
  }
  
  getTokenNumbersFromData(data:any)
  {
     return data.order.map((obj: any) => obj.id).join(',');
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
