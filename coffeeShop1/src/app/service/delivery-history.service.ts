import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  KUBERA_DELIVERY_GRAPHQL_ADMIN_SECRET,
  KUBERA_DELIVERY_GRAPHQL_URL
} from '../common/constanst';

export interface DeliveryCoupon {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percent' | 'flat' | string;
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number | null;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  usage_limit?: number | null;
  used_count?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DeliveryHistoryService {
  private apiUrl = KUBERA_DELIVERY_GRAPHQL_URL;

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_DELIVERY_GRAPHQL_ADMIN_SECRET
    });
  }

  private static readonly COUPON_SESSION_KEY = 'delivery_applied_coupon';

  getActiveCouponByCode(code: string): Observable<DeliveryCoupon | null> {
    const query = `
      query GetCoupon($code: String!) {
        kubera_delivery_delivery_coupon(
          where: {
            _and: [
              { is_active: { _eq: true } }
              { code: { _ilike: $code } }
            ]
          }
          limit: 1
        ) {
          id
          code
          description
          discount_type
          discount_value
          min_order_amount
          max_discount_amount
          is_active
          starts_at
          ends_at
          usage_limit
          used_count
        }
      }
    `;
    return this.http
      .post<any>(this.apiUrl, { query, variables: { code } }, { headers: this.headers() })
      .pipe(
        map((res) => {
          const row = res?.data?.kubera_delivery_delivery_coupon?.[0];
          return row || null;
        })
      );
  }

  /** Active coupons for Offers & Benefits suggestions */
  listActiveCoupons(limit = 8): Observable<DeliveryCoupon[]> {
    const query = `
      query ListCoupons($limit: Int!) {
        kubera_delivery_delivery_coupon(
          where: { is_active: { _eq: true } }
          order_by: { created_at: desc }
          limit: $limit
        ) {
          id
          code
          description
          discount_type
          discount_value
          min_order_amount
          max_discount_amount
          is_active
          starts_at
          ends_at
          usage_limit
          used_count
        }
      }
    `;
    return this.http
      .post<any>(this.apiUrl, { query, variables: { limit } }, { headers: this.headers() })
      .pipe(
        map((res) => res?.data?.kubera_delivery_delivery_coupon || [])
      );
  }

  saveAppliedCoupon(payload: {
    code: string;
    id: string;
    usedCount: number;
    discountPercent: number;
    discountAmount: number;
  } | null): void {
    if (!payload) {
      sessionStorage.removeItem(DeliveryHistoryService.COUPON_SESSION_KEY);
      return;
    }
    sessionStorage.setItem(
      DeliveryHistoryService.COUPON_SESSION_KEY,
      JSON.stringify(payload)
    );
  }

  readAppliedCoupon(): {
    code: string;
    id: string;
    usedCount: number;
    discountPercent: number;
    discountAmount: number;
  } | null {
    try {
      const raw = sessionStorage.getItem(DeliveryHistoryService.COUPON_SESSION_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed?.code || !parsed?.id) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  clearAppliedCoupon(): void {
    sessionStorage.removeItem(DeliveryHistoryService.COUPON_SESSION_KEY);
  }

  couponOfferLabel(coupon: DeliveryCoupon): string {
    if (coupon.discount_type === 'flat') {
      return `Save ₹${Number(coupon.discount_value) || 0}`;
    }
    const pct = Number(coupon.discount_value) || 0;
    const cap =
      coupon.max_discount_amount != null
        ? ` (up to ₹${Number(coupon.max_discount_amount)})`
        : '';
    return `Save ${pct}%${cap}`;
  }

  async validateAndComputeDiscount(
    code: string,
    amountBeforeDiscount: number
  ): Promise<{
    ok: boolean;
    message?: string;
    coupon?: DeliveryCoupon;
    discountPercent: number;
    discountAmount: number;
    amountToPay: number;
  }> {
    const trimmed = (code || '').trim();
    if (!trimmed) {
      return {
        ok: false,
        message: 'Enter a coupon code',
        discountPercent: 0,
        discountAmount: 0,
        amountToPay: amountBeforeDiscount
      };
    }

    const coupon = await firstValueFrom(this.getActiveCouponByCode(trimmed));
    if (!coupon) {
      return {
        ok: false,
        message: 'Invalid or inactive coupon',
        discountPercent: 0,
        discountAmount: 0,
        amountToPay: amountBeforeDiscount
      };
    }

    const now = Date.now();
    if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
      return {
        ok: false,
        message: 'Coupon not started yet',
        discountPercent: 0,
        discountAmount: 0,
        amountToPay: amountBeforeDiscount
      };
    }
    if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now) {
      return {
        ok: false,
        message: 'Coupon expired',
        discountPercent: 0,
        discountAmount: 0,
        amountToPay: amountBeforeDiscount
      };
    }
    if (
      coupon.usage_limit != null &&
      coupon.used_count != null &&
      coupon.used_count >= coupon.usage_limit
    ) {
      return {
        ok: false,
        message: 'Coupon usage limit reached',
        discountPercent: 0,
        discountAmount: 0,
        amountToPay: amountBeforeDiscount
      };
    }

    const minOrder = Number(coupon.min_order_amount || 0);
    if (amountBeforeDiscount < minOrder) {
      return {
        ok: false,
        message: `Minimum order ₹${minOrder} required`,
        discountPercent: 0,
        discountAmount: 0,
        amountToPay: amountBeforeDiscount
      };
    }

    let discountAmount = 0;
    let discountPercent = 0;
    if (coupon.discount_type === 'flat') {
      discountAmount = Number(coupon.discount_value) || 0;
    } else {
      discountPercent = Number(coupon.discount_value) || 0;
      discountAmount = (amountBeforeDiscount * discountPercent) / 100;
      if (coupon.max_discount_amount != null) {
        discountAmount = Math.min(discountAmount, Number(coupon.max_discount_amount));
      }
    }
    discountAmount = Math.min(discountAmount, amountBeforeDiscount);
    discountAmount = Math.round(discountAmount * 100) / 100;
    const amountToPay = Math.round((amountBeforeDiscount - discountAmount) * 100) / 100;

    return {
      ok: true,
      coupon,
      discountPercent,
      discountAmount,
      amountToPay
    };
  }

  insertOrderMap(obj: Record<string, unknown>): Observable<any> {
    const query = `
      mutation InsertOrderMap($obj: kubera_delivery_kubera_customer_order_map_insert_input!) {
        insert_kubera_delivery_kubera_customer_order_map_one(object: $obj) {
          id
          order_id
          order_ref_id
          table_no
          order_status
        }
      }
    `;
    return this.http.post(this.apiUrl, { query, variables: { obj } }, { headers: this.headers() });
  }

  insertStatusEvent(obj: Record<string, unknown>): Observable<any> {
    const query = `
      mutation InsertStatusEvent($obj: kubera_delivery_kubera_customer_order_status_events_insert_input!) {
        insert_kubera_delivery_kubera_customer_order_status_events_one(object: $obj) {
          id
          status
        }
      }
    `;
    return this.http.post(this.apiUrl, { query, variables: { obj } }, { headers: this.headers() });
  }

  insertDeliveryPayment(obj: Record<string, unknown>): Observable<any> {
    const query = `
      mutation InsertDeliveryPayment($obj: kubera_delivery_kubera_customer_delivery_payment_insert_input!) {
        insert_kubera_delivery_kubera_customer_delivery_payment_one(object: $obj) {
          id
          amount_to_pay
          payment_method
          status
          coupon_code
        }
      }
    `;
    return this.http.post(this.apiUrl, { query, variables: { obj } }, { headers: this.headers() });
  }

  updateOrderMapStatusByOrderId(
    orderId: number,
    orderStatus: string,
    extra: Record<string, unknown> = {}
  ): Observable<any> {
    const query = `
      mutation UpdateOrderMap($orderId: Int!, $set: kubera_delivery_kubera_customer_order_map_set_input!) {
        update_kubera_delivery_kubera_customer_order_map(
          where: { order_id: { _eq: $orderId } }
          _set: $set
        ) {
          returning { id order_id order_status order_ref_id table_no customer_number amount_to_pay }
        }
      }
    `;
    const set = { order_status: orderStatus, updated_at: new Date().toISOString(), ...extra };
    return this.http.post(this.apiUrl, { query, variables: { orderId, set } }, { headers: this.headers() });
  }

  updateDeliveryPaymentStatusByOrderId(orderId: number, status: string): Observable<any> {
    const query = `
      mutation UpdateDeliveryPay($orderId: Int!, $status: String!, $paidAt: timestamptz, $updatedAt: timestamptz!) {
        update_kubera_delivery_kubera_customer_delivery_payment(
          where: { order_id: { _eq: $orderId } }
          _set: { status: $status, paid_at: $paidAt, updated_at: $updatedAt }
        ) {
          affected_rows
        }
      }
    `;
    const now = new Date().toISOString();
    const paidAt = status === 'paid' || status === 'confirmed' ? now : null;
    return this.http.post(
      this.apiUrl,
      { query, variables: { orderId, status, paidAt, updatedAt: now } },
      { headers: this.headers() }
    );
  }

  getOrdersByCustomerNumber(customerNumber: string): Observable<any[]> {
    const query = `
      query MyDeliveryOrders($mobile: String!) {
        kubera_delivery_kubera_customer_order_map(
          where: { customer_number: { _eq: $mobile } }
          order_by: { placed_at: desc }
        ) {
          id
          order_id
          order_ref_id
          table_no
          table_place
          order_status
          order_summary_amount
          order_additional_service_amount
          order_total_amount
          delivery_fee
          delivery_address_text
          items_summary
          coupon_code
          discount_amount
          amount_before_discount
          amount_to_pay
          payment_method
          placed_at
          updated_at
          delivered_at
        }
      }
    `;
    return this.http
      .post<any>(this.apiUrl, { query, variables: { mobile: customerNumber } }, { headers: this.headers() })
      .pipe(map((res) => res?.data?.kubera_delivery_kubera_customer_order_map || []));
  }

  getOrderMapById(id: string): Observable<any | null> {
    const query = `
      query OneDeliveryOrder($id: uuid!) {
        kubera_delivery_kubera_customer_order_map_by_pk(id: $id) {
          id
          order_id
          order_ref_id
          table_no
          order_status
          order_total_amount
          amount_to_pay
          delivery_address_text
          items_summary
          coupon_code
          discount_amount
          payment_method
          placed_at
          updated_at
          delivered_at
          customer_number
        }
        kubera_delivery_kubera_customer_order_status_events(
          where: { order_map_id: { _eq: $id } }
          order_by: { created_at: asc }
        ) {
          id
          status
          message
          created_at
        }
      }
    `;
    return this.http.post<any>(this.apiUrl, { query, variables: { id } }, { headers: this.headers() }).pipe(
      map((res) => {
        const order = res?.data?.kubera_delivery_kubera_customer_order_map_by_pk;
        if (!order) return null;
        return {
          ...order,
          events: res?.data?.kubera_delivery_kubera_customer_order_status_events || []
        };
      })
    );
  }

  getDeliveryPaymentsByOrderIds(orderIds: number[]): Observable<any[]> {
    const ids = (orderIds || []).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);
    if (!ids.length) {
      return of([]);
    }
    const query = `
      query DeliveryPaymentsByOrders($ids: [Int!]!) {
        kubera_delivery_kubera_customer_delivery_payment(
          where: { order_id: { _in: $ids } }
          order_by: { created_at: desc }
        ) {
          id
          order_id
          status
          payment_method
          amount
          amount_to_pay
          paid_at
          updated_at
        }
      }
    `;
    return this.http
      .post<any>(this.apiUrl, { query, variables: { ids } }, { headers: this.headers() })
      .pipe(
        map((res) => {
          if (res?.errors?.length) {
            console.error('DeliveryPaymentsByOrders errors', res.errors);
            return [];
          }
          return res?.data?.kubera_delivery_kubera_customer_delivery_payment || [];
        })
      );
  }

  getDeliveryPaymentByOrderId(orderId: number): Observable<any | null> {
    return this.getDeliveryPaymentsByOrderIds([orderId]).pipe(
      map((rows) => (Array.isArray(rows) && rows.length ? rows[0] : null))
    );
  }

  getOrderMapByOrderId(orderId: number): Observable<any | null> {
    const query = `
      query MapByOrderId($orderId: Int!) {
        kubera_delivery_kubera_customer_order_map(
          where: { order_id: { _eq: $orderId } }
          limit: 1
        ) {
          id
          order_id
          order_ref_id
          table_no
          customer_number
          amount_to_pay
          order_status
          payment_method
        }
      }
    `;
    return this.http
      .post<any>(this.apiUrl, { query, variables: { orderId } }, { headers: this.headers() })
      .pipe(map((res) => res?.data?.kubera_delivery_kubera_customer_order_map?.[0] || null));
  }

  /**
   * Active delivery maps for agent / staff.
   * Uses a multi-day window (default 7) on placed_at OR updated_at so overnight
   * / timezone edge cases and recently updated dispatches still appear.
   */
  getActiveDeliveryMaps(statuses: string[], sinceIso?: string): Observable<any[]> {
    const start = sinceIso || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    })();
    const query = `
      query ActiveDeliveryMaps($statuses: [String!]!, $since: timestamptz!) {
        kubera_delivery_kubera_customer_order_map(
          where: {
            _and: [
              { order_status: { _in: $statuses } }
              {
                _or: [
                  { placed_at: { _gte: $since } }
                  { updated_at: { _gte: $since } }
                ]
              }
            ]
          }
          order_by: { updated_at: desc }
        ) {
          id
          order_id
          order_ref_id
          table_no
          order_status
          customer_number
          delivery_address_text
          delivery_lat
          delivery_lng
          order_total_amount
          amount_to_pay
          payment_method
          items_summary
          coupon_code
          discount_amount
          comments
          placed_at
          updated_at
        }
      }
    `;
    return this.http
      .post<any>(
        this.apiUrl,
        { query, variables: { statuses, since: start } },
        { headers: this.headers() }
      )
      .pipe(
        map((res) => {
          if (res?.errors?.length) {
            console.error('ActiveDeliveryMaps GraphQL errors', res.errors);
            throw new Error(res.errors[0]?.message || 'Delivery map query failed');
          }
          return res?.data?.kubera_delivery_kubera_customer_order_map || [];
        })
      );
  }

  bumpCouponUsedCount(couponId: string, nextCount: number): Observable<any> {
    const query = `
      mutation BumpCoupon($id: uuid!, $used: Int!) {
        update_kubera_delivery_delivery_coupon_by_pk(
          pk_columns: { id: $id }
          _set: { used_count: $used }
        ) { id used_count }
      }
    `;
    return this.http.post(
      this.apiUrl,
      { query, variables: { id: couponId, used: nextCount } },
      { headers: this.headers() }
    );
  }
}
