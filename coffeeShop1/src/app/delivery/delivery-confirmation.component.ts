import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as QRCode from 'qrcode';
import { KUBERA_UPI_ID } from '../common/constanst';

@Component({
  selector: 'app-delivery-confirmation',
  templateUrl: './delivery-confirmation.component.html',
  styleUrls: ['./delivery-confirmation.component.scss']
})
export class DeliveryConfirmationComponent implements OnInit {
  order: any = null;
  qrDataUrl = '';
  upiId = KUBERA_UPI_ID;

  constructor(private router: Router) {}

  async ngOnInit(): Promise<void> {
    const raw = sessionStorage.getItem('delivery_last_order');
    if (!raw) {
      this.router.navigate(['/delivery']);
      return;
    }
    try {
      this.order = JSON.parse(raw);
    } catch {
      this.router.navigate(['/delivery']);
      return;
    }

    if (this.order.paymentMethod === 'upi_qr') {
      await this.buildQr();
    }
  }

  private async buildQr(): Promise<void> {
    const amount = Number(this.order.amountToPay || 0).toFixed(2);
    const note = `Delivery ${this.order.tableNo || this.order.orderRefId}`;
    const upiLink =
      `upi://pay?pa=${this.upiId}` +
      `&pn=${encodeURIComponent('CafeKubera')}` +
      `&am=${amount}` +
      `&cu=INR` +
      `&tn=${encodeURIComponent(note)}`;
    try {
      this.qrDataUrl = await QRCode.toDataURL(upiLink, { width: 220, margin: 1 });
    } catch (e) {
      console.error('QR failed', e);
    }
  }

  goHome(): void {
    this.router.navigate(['/delivery']);
  }

  goOrders(): void {
    this.router.navigate(['/delivery/orders']);
  }

  goTrack(): void {
    if (this.order?.mapId) {
      this.router.navigate(['/delivery/orders', this.order.mapId]);
      return;
    }
    this.goOrders();
  }

  goMenu(): void {
    sessionStorage.setItem('order_mode', 'delivery');
    this.router.navigate(['/menu'], { fragment: 'menu' });
  }
}
