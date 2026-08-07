import { Component, ElementRef, EventEmitter, Input, Output, SimpleChanges, ViewChild } from '@angular/core';

@Component({
  selector: 'app-pos-delivery-kot',
  templateUrl: './pos-delivery-kot.component.html',
  styleUrls: ['./pos-delivery-kot.component.scss']
})
export class PosDeliveryKotComponent {
  @ViewChild('printableRoot', { static: false }) printableRoot?: ElementRef<HTMLElement>;

  @Input() printData: any;
  @Output() messageEvent = new EventEmitter<string>();

  ticket: any = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['printData'] && this.printData) {
      this.populate();
    }
  }

  private populate(): void {
    const d = this.printData || {};
    const items = (d.order_items || []).filter((i: any) => Number(i.item_quantity) !== 0);
    this.ticket = {
      orderNo: d.id,
      deliveryNo: d.table_no || d.deliveryNo || '',
      date: this.formatDate(d.created_at),
      customerNumber: d.customer_number || '',
      comments: d.comments || '',
      items: items.map((i: any) => {
        const qty = Number(i.item_quantity) || 0;
        const cost = Number(i.item_cost) || 0;
        return {
          item_name: i.item_name,
          item_quantity: qty,
          item_cost: cost,
          line_total: qty * cost
        };
      }),
      itemTotal: Number(d.order_summary_amount) || 0,
      deliveryFee: Number(d.order_additional_service_amount) || 0,
      discountAmount: Number(d.discount_amount) || 0,
      couponCode: d.coupon_code || '',
      // Use exact stored payable — do not recalculate GST
      totalAmount: Number(d.order_total_amount) || 0,
      paymentMethod: d.payment_method || ''
    };
  }

  private formatDate(value: any): string {
    if (!value) {
      return '';
    }
    const raw = String(value).trim();
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const dd = String(parsed.getDate()).padStart(2, '0');
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const yyyy = parsed.getFullYear();
      let h = parsed.getHours();
      const min = String(parsed.getMinutes()).padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${dd}/${mm}/${yyyy} ${h}:${min} ${ampm}`;
    }
    return raw;
  }

  formatMoney(value: any): string {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  }

  printPage(): void {
    const content =
      this.printableRoot?.nativeElement?.innerHTML ||
      document.querySelector('.delivery-kot-printable')?.innerHTML;
    if (!content) {
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Delivery KOT print');
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
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
  <title>Delivery KOT</title>
  <style>
    @page { size: auto; margin: 0mm; }
    body { font-family: 'Times New Roman', Times, serif; color: #000; margin: 0; padding: 0; }
    .ticket { width: 280px; max-width: 100%; margin: 0 auto; padding: 5px; text-align: left; font-size: 12px; }
    .ticket-head, .centered { text-align: center; margin: 0; }
    .title { font-size: 22px; font-weight: 900; }
    .order-no { font-size: 18px; font-weight: 700; margin-top: 2px; }
    .hr { border: 0; border-top: 1px solid #000; margin: 6px 0; }
    .meta { display: flex; flex-direction: column; gap: 2px; }
    .meta-line { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .meta-date { flex: 1 1 auto; min-width: 0; font-size: 13px; word-break: break-word; }
    .meta-delivery { flex: 0 0 auto; font-size: 15px; font-weight: 700; white-space: nowrap; }
    .meta-sub { font-size: 13px; }
    .items-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .items-table th, .items-table td { border-top: 1px solid #000; vertical-align: top; padding: 3px 2px; font-size: 14px; }
    td.description, th.description { width: 58%; text-align: left; word-break: break-word; }
    td.quantity, th.quantity { width: 16%; text-align: center; }
    td.price, th.price { width: 26%; text-align: right; white-space: nowrap; }
    .kot-line { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; width: 100%; margin: 3px 0; font-size: 14px; }
    .kot-line > span:last-child { white-space: nowrap; }
    .kot-line.total { font-weight: 900; font-size: 16px; }
    .note { font-size: 13px; word-break: break-word; white-space: pre-line; }
    .note-label { font-weight: 900; }
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
      } catch {
        /* ignore */
      }
    };

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
      setTimeout(cleanup, 60_000);
    } else {
      cleanup();
    }

    this.messageEvent.emit('kot');
  }
}
