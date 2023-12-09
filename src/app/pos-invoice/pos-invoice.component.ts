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

  @Input() printData: any;

  ngOnChanges(changes: SimpleChanges) {
    // This method will be called whenever the @Input property changes
    if (changes['printData']) {
     this.populateInvoice()
    }
  }

  populateInvoice()
  {
    this.invoiceData.date = this.sharedService.updateCurrentDateInIST();
    this.invoiceData.tokenNumbers = this.getTokenNumbersFromData(this.printData)
  }
  
  getTokenNumbersFromData(data:any)
  {

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
          width: 75px;
          max-width: 75px;
      }
      
      td.quantity,
      th.quantity {
          width: 40px;
          max-width: 40px;
          word-break: break-all;
      }
      
      td.price,
      th.price {
          width: 40px;
          max-width: 40px;
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
