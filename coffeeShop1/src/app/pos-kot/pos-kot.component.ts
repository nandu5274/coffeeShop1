import { Component, ElementRef, EventEmitter, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { SharedService } from '../service/shared-service';

@Component({
  selector: 'app-pos-kot',
  templateUrl: './pos-kot.component.html',
  styleUrls: ['./pos-kot.component.scss']
})
export class PosKotComponent {
  @ViewChild('printableRoot', { static: false }) printableRoot?: ElementRef<HTMLElement>;

  constructor(private sharedService: SharedService) {}

  invoiceData: any = {};
  @Input() printData: any;
  @Output() messageEvent = new EventEmitter<string>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['printData']) {
      this.populateInvoice();
    }
  }

  populateInvoice() {
    this.invoiceData.date = this.printData.created_at;
    this.invoiceData.tokenNumbers = '';
    this.invoiceData.tableNo = this.printData.table_no;
    this.invoiceData.billNo = '';
    this.invoiceData.items = this.printData.order_items;
    this.invoiceData.orderNo = this.printData.id;
    this.invoiceData.comments = this.printData.comments;
  }

  getTokenNumbersFromData(data: any) {
    return data.order.map((obj: any) => obj.id).join(',');
  }

  formatStringWithTwoDecimalPlaces(value: any): string {
    const numberValue = parseFloat(value);
    return numberValue.toFixed(2);
  }

  getActualAmount(orderItems: any) {
    let orderCost = 0;
    orderItems.forEach((item: any) => {
      orderCost = orderCost + item.item_quantity * item.item_cost;
    });
    return orderCost;
  }

  /**
   * Print via hidden iframe (avoids window.open blank doc + unload policy warnings).
   */
  printPage(): void {
    const content =
      this.printableRoot?.nativeElement?.innerHTML ||
      document.querySelector('.printable-content')?.innerHTML;
    if (!content) {
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'KOT print');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      return;
    }

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>KOT</title>
  <style>
    @page { size: auto; margin: 0mm; }
    td, th, tr, table { border-top: 1px solid black; border-collapse: collapse; }
    td.description, th.description { width: 60px; max-width: 60px; }
    td.quantity, th.quantity { width: 40px; max-width: 40px; word-break: break-all; }
    td.price, th.price { width: 24px; max-width: 24px; word-break: break-all; }
    .centered { margin: auto; text-align: center; align-content: center; }
    .hr { opacity: 100%; border-top: 1px solid #000; margin: 3px 0; }
    .grand-total { color: black; font-size: medium; font-weight: bold; }
    .ticket { width: 275px; max-width: 275px; }
    img { max-width: inherit; width: inherit; }
    @media print {
      .hidden-print, .hidden-print * { display: none !important; }
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`);
    doc.close();

    const win = iframe.contentWindow;
    const cleanup = () => {
      try {
        iframe.remove();
      } catch {}
    };

    // Prefer afterprint; fallback timer — do not use unload (blocked by Chrome)
    if (win) {
      win.addEventListener('afterprint', cleanup, { once: true });
      setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch {
          cleanup();
        }
      }, 50);
      // Safety cleanup if afterprint never fires
      setTimeout(cleanup, 60_000);
    } else {
      cleanup();
    }

    this.sendMessage();
  }

  test() {
    console.log('printData', this.printData);
  }

  sendMessage() {
    this.messageEvent.emit('kot');
  }
}
