import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from '../common/constanst';

export interface DeliveryOrderWhatsAppPayload {
  tableNo: string;
  orderRefId: string;
  customerNumber: string;
  customerName?: string;
  addressText: string;
  totalAmount: number;
  amountBeforeDiscount?: number;
  discountAmount?: number;
  couponCode?: string;
  paymentMethod?: 'upi_qr' | 'cod' | string;
  items: { name: string; quantity: number; cost: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class WhatsappNotifyService {
  constructor(private http: HttpClient) {}

  /** Café alert via Telegram. */
  sendDeliveryOrderAlert(
    payload: DeliveryOrderWhatsAppPayload
  ): Observable<{ sent: boolean; reason?: string; channel?: string }> {
    return this.sendPlainAlert(this.buildMessage(payload));
  }

  sendPlainAlert(text: string): Observable<{ sent: boolean; reason?: string; channel?: string }> {
    const token = (TELEGRAM_BOT_TOKEN || '').trim();
    const chatId = (TELEGRAM_CHAT_ID || '').trim();
    if (!token || !chatId) {
      return of({ sent: false, reason: 'telegram_not_configured', channel: 'telegram' });
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    return this.http
      .post<any>(url, {
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      })
      .pipe(
        map((res) => ({
          sent: !!res?.ok,
          channel: 'telegram',
          reason: res?.ok ? undefined : 'telegram_failed'
        })),
        catchError((err) => {
          console.error('Telegram notify failed', err);
          return of({ sent: false, reason: 'request_failed', channel: 'telegram' });
        })
      );
  }

  private buildMessage(payload: DeliveryOrderWhatsAppPayload): string {
    const payLabel = payload.paymentMethod === 'cod' ? 'Cash on delivery' : 'UPI QR';
    const lines = [
      'Cafe Kubera — NEW DELIVERY ORDER',
      `Order: ${payload.tableNo}`,
      `Ref: ${payload.orderRefId}`,
      `Customer: ${payload.customerNumber}${payload.customerName ? ' (' + payload.customerName + ')' : ''}`,
      `Address: ${payload.addressText}`,
      'Items:'
    ];
    payload.items.forEach((i) => {
      lines.push(`- ${i.name} x${i.quantity} (₹${i.cost})`);
    });
    if (payload.amountBeforeDiscount != null) {
      lines.push(`Subtotal+fee: ₹${Number(payload.amountBeforeDiscount).toFixed(2)}`);
    }
    if (payload.couponCode) {
      lines.push(`Coupon: ${payload.couponCode} (-₹${Number(payload.discountAmount || 0).toFixed(2)})`);
    }
    lines.push(`Amount to pay: ₹${Number(payload.totalAmount).toFixed(2)}`);
    lines.push(`Payment: ${payLabel}`);
    lines.push('Please CALL customer to confirm, then open Captain → approve.');
    return lines.join('\n');
  }
}
