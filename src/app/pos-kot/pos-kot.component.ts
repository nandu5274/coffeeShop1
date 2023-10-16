import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { SharedService } from '../service/shared-service';

@Component({
  selector: 'app-pos-kot',
  templateUrl: './pos-kot.component.html',
  styleUrls: ['./pos-kot.component.scss']
})
export class PosKotComponent {


  constructor(
    private sharedService: SharedService) {
  }

  invoiceData:any = {};
  @Input() printData: any;
  @Output() messageEvent = new EventEmitter<string>();

  ngOnChanges(changes: SimpleChanges) {
    // This method will be called whenever the @Input property changes
    if (changes['printData']) {
     this.populateInvoice()
    }
  }

  populateInvoice()
  {
    this.invoiceData.date =  this.printData.created_at;
  
    this.invoiceData.tokenNumbers = "";
    this.invoiceData.tableNo = this.printData.table_no
    this.invoiceData.billNo = ""
    this.invoiceData.items = this.printData.order_items
    this.invoiceData.orderNo = this.printData.id
    
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
      let itemCost = item.item_quantity * item.item_cost
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
    this.sendMessage();
  }

  test()
  {
    console.log("printData", this.printData);
  }

  sendMessage() {
    this.messageEvent.emit('kot');
  }
}
