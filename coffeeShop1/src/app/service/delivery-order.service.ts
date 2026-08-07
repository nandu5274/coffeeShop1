import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { filter, take, timeout } from 'rxjs/operators';
import { CartItemDto } from '../dtos/CartItemDto';
import {
  DELIVERY_FEE,
  DELIVERY_TABLE_PLACE,
  deliveryDisplayTableNo,
  deliveryOrderTableNoInt
} from '../common/constanst';
import { GraphqlService } from './graphql.service';
import { SharedService } from './shared-service';
import { DeliveryHistoryService } from './delivery-history.service';
import { WhatsappNotifyService } from './whatsapp-notify.service';
import { WebSocketService } from './WebSocket.service';

export interface DeliveryCheckoutInput {
  cartItems: CartItemDto[];
  orderAmount: number;
  deliveryFee: number;
  amountBeforeDiscount: number;
  discountPercent: number;
  discountAmount: number;
  amountToPay: number;
  couponCode?: string | null;
  couponId?: string | null;
  couponUsedCount?: number | null;
  paymentMethod: 'upi_qr' | 'cod';
  commentText?: string;
}

export interface DeliveryCheckoutResult {
  ok: boolean;
  message?: string;
  orderId?: number;
  orderRefId?: string;
  tableNo?: string;
  mapId?: string | null;
  amountToPay?: number;
  paymentMethod?: 'upi_qr' | 'cod';
  couponCode?: string | null;
  discountAmount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DeliveryOrderService {
  constructor(
    private graphqlService: GraphqlService,
    private sharedService: SharedService,
    private deliveryHistoryService: DeliveryHistoryService,
    private whatsappNotifyService: WhatsappNotifyService,
    private webSocketService: WebSocketService
  ) {}

  async placeDeliveryOrder(input: DeliveryCheckoutInput): Promise<DeliveryCheckoutResult> {
    if (sessionStorage.getItem('is_login') !== 'true') {
      return { ok: false, message: 'Please login to place a delivery order.' };
    }
    if (!sessionStorage.getItem('delivery_address_id') || !sessionStorage.getItem('delivery_address_text')) {
      return { ok: false, message: 'Please select a delivery address first.' };
    }
    const customerNumber = sessionStorage.getItem('customer_number') || '';
    if (!customerNumber) {
      return { ok: false, message: 'Customer mobile missing. Please login again.' };
    }
    if (!input.cartItems?.length) {
      return { ok: false, message: 'Cart is empty.' };
    }

    let customerDetailsId = 0;
    let customerName = '';
    try {
      const raw = sessionStorage.getItem('customer_Details');
      if (raw) {
        const d = JSON.parse(raw);
        customerDetailsId = d?.customer_detail?.id || 0;
        customerName = d?.customer_detail?.name || '';
      }
    } catch {
      /* ignore */
    }

    const rdmOrderRefId = this.sharedService.generateRandomNumberWithDateTime();
    // Café kubera_order.table_no is INTEGER — D-… label is only for delivery map / customer UI
    const tableNoInt = deliveryOrderTableNoInt(rdmOrderRefId);
    const tableNoDisplay = deliveryDisplayTableNo(rdmOrderRefId);
    const addressText = sessionStorage.getItem('delivery_address_text') || '';
    const dataList = input.cartItems.map((item) => ({
      order_ref_id: rdmOrderRefId,
      item_name: item.name,
      item_description: item.description,
      item_quantity: item.quantity,
      item_cost: item.cost,
      status: 'progress'
    }));

    const couponNote = input.couponCode
      ? `\nCoupon: ${input.couponCode} (-₹${input.discountAmount})`
      : '';
    const payNote = input.paymentMethod === 'cod' ? '\nPay: Cash on delivery' : '\nPay: UPI QR';

    const orderTableData = {
      order_status: 'approval_waiting',
      table_no: tableNoInt,
      table_place: DELIVERY_TABLE_PLACE,
      order_ref_id: rdmOrderRefId,
      order_summary_amount: input.orderAmount,
      order_additional_service_amount: input.deliveryFee,
      order_total_amount: input.amountToPay,
      order_items: { data: dataList },
      employee: 'ONLINE',
      comments: `${input.commentText || ''}\n[DELIVERY] ${tableNoDisplay}\n${addressText}${couponNote}${payNote}`.trim(),
      customer_number: customerNumber
    };

    this.graphqlService.saveDataAndLink(orderTableData);

    let response: any;
    try {
      response = await firstValueFrom(
        this.sharedService.getOrderProcessingResponseObservable().pipe(
          filter((r) => !!r && (r.status === 'success' || r.status === 'error')),
          take(1),
          timeout(30000)
        )
      );
    } catch {
      return { ok: false, message: 'Order timed out. Please try again.' };
    }

    if (response?.status !== 'success') {
      return { ok: false, message: 'Failed to place order. Please try again.' };
    }

    const inserted = response?.data?.data?.insert_kubera_order_one;
    if (!inserted?.id) {
      return { ok: false, message: 'Order created but response incomplete.' };
    }

    const paymentStatus =
      input.paymentMethod === 'cod' ? 'cod_pending' : 'awaiting_payment';

    const mapObj: Record<string, unknown> = {
      customer_details_id: customerDetailsId,
      customer_number: customerNumber,
      order_id: inserted.id,
      order_ref_id: String(inserted.order_ref_id),
      table_no: tableNoDisplay,
      table_place: DELIVERY_TABLE_PLACE,
      order_status: 'approval_waiting',
      order_summary_amount: input.orderAmount,
      order_additional_service_amount: input.deliveryFee,
      order_total_amount: input.amountToPay,
      delivery_fee: input.deliveryFee,
      delivery_distance_km: parseFloat(sessionStorage.getItem('delivery_distance_km') || '0') || null,
      delivery_address_id: parseInt(sessionStorage.getItem('delivery_address_id') || '', 10) || null,
      delivery_address_text: addressText,
      delivery_lat: parseFloat(sessionStorage.getItem('delivery_lat') || '') || null,
      delivery_lng: parseFloat(sessionStorage.getItem('delivery_lng') || '') || null,
      comments: orderTableData.comments,
      items_summary: dataList.map((i) => ({
        name: i.item_name,
        qty: i.item_quantity,
        cost: i.item_cost
      })),
      coupon_code: input.couponCode || null,
      discount_percent: input.discountPercent || 0,
      discount_amount: input.discountAmount || 0,
      amount_before_discount: input.amountBeforeDiscount,
      amount_to_pay: input.amountToPay,
      payment_method: input.paymentMethod
    };

    let mapId: string | null = null;
    try {
      const mapRes = await firstValueFrom(this.deliveryHistoryService.insertOrderMap(mapObj));
      mapId = mapRes?.data?.insert_kubera_delivery_kubera_customer_order_map_one?.id || null;
      if (mapId) {
        await firstValueFrom(
          this.deliveryHistoryService.insertStatusEvent({
            order_map_id: mapId,
            order_id: inserted.id,
            order_ref_id: String(inserted.order_ref_id),
            status: 'approval_waiting',
            message: 'Order placed — café will call to confirm'
          })
        );
      }
    } catch (e) {
      console.warn('delivery map/event failed', e);
    }

    try {
      await firstValueFrom(
        this.deliveryHistoryService.insertDeliveryPayment({
          customer_details_id: customerDetailsId,
          customer_number: customerNumber,
          order_map_id: mapId,
          order_id: inserted.id,
          order_ref_id: String(inserted.order_ref_id),
          gateway: 'none',
          payment_method: input.paymentMethod,
          coupon_code: input.couponCode || null,
          coupon_id: input.couponId || null,
          discount_percent: input.discountPercent || 0,
          discount_amount: input.discountAmount || 0,
          amount_before_discount: input.amountBeforeDiscount,
          delivery_fee: input.deliveryFee ?? DELIVERY_FEE,
          amount: input.amountToPay,
          amount_to_pay: input.amountToPay,
          currency: 'INR',
          status: paymentStatus
        })
      );
    } catch (e) {
      console.warn('delivery payment insert failed', e);
    }

    if (input.couponId != null && input.couponUsedCount != null) {
      try {
        await firstValueFrom(
          this.deliveryHistoryService.bumpCouponUsedCount(input.couponId, input.couponUsedCount + 1)
        );
      } catch (e) {
        console.warn('coupon used_count bump failed', e);
      }
    }

    try {
      this.webSocketService.send('approval');
    } catch (e) {
      console.warn('WS approval failed', e);
    }

    this.whatsappNotifyService
      .sendDeliveryOrderAlert({
        tableNo: tableNoDisplay,
        orderRefId: String(inserted.order_ref_id),
        customerNumber,
        customerName,
        addressText,
        totalAmount: input.amountToPay,
        amountBeforeDiscount: input.amountBeforeDiscount,
        discountAmount: input.discountAmount,
        couponCode: input.couponCode || undefined,
        paymentMethod: input.paymentMethod,
        items: dataList.map((i) => ({
          name: i.item_name,
          quantity: i.item_quantity,
          cost: i.item_cost
        }))
      })
      .subscribe();

    sessionStorage.removeItem('cartDataList');
    this.deliveryHistoryService.clearAppliedCoupon();

    return {
      ok: true,
      orderId: inserted.id,
      orderRefId: String(inserted.order_ref_id),
      tableNo: tableNoDisplay,
      mapId,
      amountToPay: input.amountToPay,
      paymentMethod: input.paymentMethod,
      couponCode: input.couponCode,
      discountAmount: input.discountAmount
    };
  }
}
