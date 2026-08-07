import { Component, OnDestroy, OnInit } from '@angular/core';
import { firstValueFrom, from, Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import {
  DELIVERY_TABLE_PLACE,
  RESTAURANT_LAT,
  RESTAURANT_LNG,
  deliveryDisplayTableNo
} from '../common/constanst';
import { DeliveryHistoryService } from '../service/delivery-history.service';
import { GraphqlService } from '../service/graphql.service';
import { SharedService } from '../service/shared-service';
import { WhatsappNotifyService } from '../service/whatsapp-notify.service';

type AgentAction = 'out_for_delivery' | 'delivery_completed';

@Component({
  selector: 'app-delivery-agent',
  templateUrl: './delivery-agent.component.html',
  styleUrls: ['./delivery-agent.component.scss']
})
export class DeliveryAgentComponent implements OnInit, OnDestroy {
  orders: any[] = [];
  loading = true;
  errorMsg = '';
  busyId: number | null = null;
  activeTab: 'ready' | 'way' = 'ready';

  confirmOpen = false;
  confirmAction: AgentAction | null = null;
  confirmOrder: any = null;

  paymentCheckOpen = false;
  paymentCheckBusy = false;
  paymentCheckOrder: any = null;
  paymentCheckResult: {
    state: 'paid' | 'collect' | 'verify' | 'unknown';
    title: string;
    detail: string;
    amount: number;
    method: string;
    status: string;
  } | null = null;

  private pollSub?: Subscription;
  private userPickedTab = false;

  readonly activeStatuses = ['Approved', 'print', 'out_for_delivery'];

  constructor(
    private deliveryHistory: DeliveryHistoryService,
    private graphqlService: GraphqlService,
    private sharedService: SharedService,
    private whatsappNotify: WhatsappNotifyService
  ) {}

  ngOnInit(): void {
    this.pollSub = timer(0, 15000)
      .pipe(switchMap(() => from(this.loadOrders())))
      .subscribe();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  readyOrders(): any[] {
    return this.orders.filter((o) => {
      const s = String(o?.order_status || '');
      return s === 'Approved' || s === 'print';
    });
  }

  onTheWayOrders(): any[] {
    return this.orders.filter((o) => String(o?.order_status || '') === 'out_for_delivery');
  }

  setTab(tab: 'ready' | 'way'): void {
    this.userPickedTab = true;
    this.activeTab = tab;
  }

  items(order: any): any[] {
    const raw = order?.items_summary;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  payLabel(method: string): string {
    return method === 'cod' ? 'Cash on delivery' : method === 'upi_qr' ? 'UPI QR' : method || '—';
  }

  amountToCollect(order: any): number {
    const n = Number(order?.amount_to_pay ?? order?.order_total_amount);
    return Number.isFinite(n) ? n : 0;
  }

  isPaymentPaid(order: any): boolean {
    const s = String(order?.payment_status || '').toLowerCase();
    return s === 'paid' || s === 'confirmed';
  }

  needsCollect(order: any): boolean {
    if (this.isPaymentPaid(order)) return false;
    return String(order?.payment_method || '') === 'cod' || !order?.payment_method;
  }

  paymentBadge(order: any): { label: string; kind: 'paid' | 'collect' | 'verify' } {
    if (this.isPaymentPaid(order)) {
      return { label: 'Paid', kind: 'paid' };
    }
    if (String(order?.payment_method || '') === 'upi_qr') {
      return { label: 'Check UPI', kind: 'verify' };
    }
    return { label: 'Collect cash', kind: 'collect' };
  }

  async checkPayment(order: any): Promise<void> {
    const id = Number(order?.order_id);
    if (!id) return;
    this.paymentCheckOrder = order;
    this.paymentCheckOpen = true;
    this.paymentCheckBusy = true;
    this.paymentCheckResult = null;
    try {
      const pay = await firstValueFrom(this.deliveryHistory.getDeliveryPaymentByOrderId(id));
      const method = String(pay?.payment_method || order.payment_method || '');
      const status = String(pay?.status || order.payment_status || '');
      const amount = Number(pay?.amount_to_pay ?? pay?.amount ?? this.amountToCollect(order)) || 0;

      // Keep list badge in sync
      order.payment_status = status || order.payment_status;
      order.payment_method = method || order.payment_method;
      if (pay?.amount_to_pay != null) {
        order.amount_to_pay = Number(pay.amount_to_pay);
      }

      const paid = status === 'paid' || status === 'confirmed';
      if (paid) {
        this.paymentCheckResult = {
          state: 'paid',
          title: 'Payment already done',
          detail: 'No cash to collect. Hand over the order.',
          amount,
          method,
          status
        };
      } else if (method === 'upi_qr') {
        this.paymentCheckResult = {
          state: 'verify',
          title: 'UPI — verify payment',
          detail: 'Ask customer to confirm UPI transfer, then mark delivered.',
          amount,
          method,
          status: status || 'awaiting_payment'
        };
      } else if (method === 'cod' || status === 'cod_pending') {
        this.paymentCheckResult = {
          state: 'collect',
          title: 'Collect cash',
          detail: 'Cash on delivery — collect this amount from the customer.',
          amount,
          method: method || 'cod',
          status: status || 'cod_pending'
        };
      } else {
        this.paymentCheckResult = {
          state: 'unknown',
          title: 'Payment unclear',
          detail: 'Could not confirm payment status. Ask café / collect if cash.',
          amount,
          method,
          status: status || '—'
        };
      }
    } catch (e) {
      console.error('checkPayment failed', e);
      this.paymentCheckResult = {
        state: 'unknown',
        title: 'Could not check payment',
        detail: 'Network error. Try again.',
        amount: this.amountToCollect(order),
        method: String(order?.payment_method || ''),
        status: '—'
      };
    } finally {
      this.paymentCheckBusy = false;
    }
  }

  closePaymentCheck(): void {
    this.paymentCheckOpen = false;
    this.paymentCheckOrder = null;
    this.paymentCheckResult = null;
    this.paymentCheckBusy = false;
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      Approved: 'Ready',
      print: 'Ready',
      out_for_delivery: 'On the way'
    };
    return map[status] || status || '—';
  }

  canNavigate(order: any): boolean {
    const lat = Number(order?.delivery_lat);
    const lng = Number(order?.delivery_lng);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
    return hasCoords || !!String(order?.delivery_address_text || '').trim();
  }

  openGoogleMaps(order: any): void {
    const url = this.mapsNavigateUrl(order);
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }

  mapsNavigateUrl(order: any): string {
    if (!order) return '';
    const lat = Number(order.delivery_lat);
    const lng = Number(order.delivery_lng);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
    const destination = hasCoords
      ? `${lat},${lng}`
      : encodeURIComponent(String(order.delivery_address_text || '').trim());
    if (!destination) return '';
    return (
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${RESTAURANT_LAT},${RESTAURANT_LNG}` +
      `&destination=${destination}` +
      `&travelmode=driving`
    );
  }

  askOutForDelivery(order: any): void {
    this.confirmOrder = order;
    this.confirmAction = 'out_for_delivery';
    this.confirmOpen = true;
  }

  askComplete(order: any): void {
    this.confirmOrder = order;
    this.confirmAction = 'delivery_completed';
    this.confirmOpen = true;
  }

  closeConfirm(): void {
    if (this.busyId != null) return;
    this.confirmOpen = false;
    this.confirmAction = null;
    this.confirmOrder = null;
  }

  async confirmYes(): Promise<void> {
    const order = this.confirmOrder;
    const action = this.confirmAction;
    if (!order?.order_id || !action) {
      this.closeConfirm();
      return;
    }
    if (action === 'out_for_delivery') {
      await this.markOutForDelivery(order);
    } else {
      await this.completeDelivery(order);
    }
  }

  refreshNow(): void {
    void this.loadOrders(true);
  }

  private sinceIso(): string {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  private async loadOrders(showSpinner = false): Promise<void> {
    if (showSpinner || !this.orders.length) {
      this.loading = true;
    }
    try {
      const since = this.sinceIso();
      const [mapRows, liveRes] = await Promise.all([
        firstValueFrom(this.deliveryHistory.getActiveDeliveryMaps(this.activeStatuses, since)).catch(
          (e) => {
            console.error(e);
            return [] as any[];
          }
        ),
        firstValueFrom(
          this.graphqlService.getActiveOnlineDeliveryOrders(this.activeStatuses, since)
        ).catch((e) => {
          console.error(e);
          return null;
        })
      ]);

      const liveOrders: any[] = liveRes?.data?.kubera_order || [];
      const merged = this.mergeMapAndLive(Array.isArray(mapRows) ? mapRows : [], liveOrders);
      const orderIds = merged.map((o) => Number(o.order_id)).filter((n) => n > 0);
      const payments = await firstValueFrom(
        this.deliveryHistory.getDeliveryPaymentsByOrderIds(orderIds)
      ).catch(() => [] as any[]);
      const payByOrder = new Map<number, any>();
      for (const p of payments || []) {
        const oid = Number(p?.order_id);
        if (!oid || payByOrder.has(oid)) continue; // first = newest (query ordered desc)
        payByOrder.set(oid, p);
      }
      for (const o of merged) {
        const pay = payByOrder.get(Number(o.order_id));
        if (!pay) continue;
        o.payment_status = pay.status;
        o.payment_method = o.payment_method || pay.payment_method;
        if (pay.amount_to_pay != null) {
          o.amount_to_pay = Number(pay.amount_to_pay);
        }
      }
      this.orders = merged;
      this.errorMsg = '';
      this.healStaleMapStatuses(mapRows, liveOrders);
      this.pickDefaultTab();
    } catch (e) {
      console.error(e);
      this.errorMsg = 'Could not load delivery orders.';
    } finally {
      this.loading = false;
    }
  }

  /**
   * Prefer live café status (source of truth for captain actions) and keep
   * address / pay fields from the delivery map when present.
   */
  private mergeMapAndLive(mapRows: any[], liveOrders: any[]): any[] {
    const byId = new Map<number, any>();

    for (const row of mapRows) {
      const id = Number(row?.order_id);
      if (!id) continue;
      byId.set(id, {
        ...row,
        order_id: id,
        order_status: String(row.order_status || '')
      });
    }

    for (const live of liveOrders) {
      const id = Number(live?.id);
      if (!id) continue;
      const existing = byId.get(id);
      const liveStatus = String(live.order_status || '');
      const itemsSummary =
        existing?.items_summary ||
        (live.order_items || []).map((i: any) => ({
          name: i.item_name,
          qty: i.item_quantity,
          cost: i.item_cost
        }));

      const addressFromComments = this.addressFromComments(live.comments);
      const payFromComments = this.payFromComments(live.comments);

      byId.set(id, {
        ...(existing || {}),
        order_id: id,
        order_ref_id: existing?.order_ref_id || live.order_ref_id,
        table_no:
          existing?.table_no ||
          (live.order_ref_id != null
            ? deliveryDisplayTableNo(live.order_ref_id, live.created_at ? new Date(live.created_at) : new Date())
            : `D-${id}`),
        table_place: DELIVERY_TABLE_PLACE,
        // Live status wins — captain may have updated café DB before map sync
        order_status: liveStatus || existing?.order_status || '',
        customer_number: existing?.customer_number || live.customer_number || '',
        delivery_address_text: existing?.delivery_address_text || addressFromComments || '',
        order_total_amount: existing?.order_total_amount ?? live.order_total_amount,
        amount_to_pay: existing?.amount_to_pay ?? live.order_total_amount,
        payment_method: existing?.payment_method || payFromComments || '',
        items_summary: itemsSummary,
        comments: existing?.comments || live.comments || '',
        placed_at: existing?.placed_at || live.created_at,
        updated_at: existing?.updated_at || live.created_at
      });
    }

    return Array.from(byId.values()).sort((a, b) => {
      const ta = new Date(a.updated_at || a.placed_at || 0).getTime();
      const tb = new Date(b.updated_at || b.placed_at || 0).getTime();
      return tb - ta;
    });
  }

  private addressFromComments(comments: string): string {
    const text = String(comments || '');
    const m = text.match(/Address:\s*(.+?)(?:\n|Coupon:|Pay:|$)/i);
    return m?.[1]?.trim() || '';
  }

  private payFromComments(comments: string): string {
    const text = String(comments || '');
    if (/Pay:\s*Cash on delivery/i.test(text)) return 'cod';
    if (/Pay:\s*UPI QR/i.test(text)) return 'upi_qr';
    return '';
  }

  /** If café is ahead of delivery map, push status onto the map quietly. */
  private healStaleMapStatuses(mapRows: any[], liveOrders: any[]): void {
    const mapById = new Map<number, string>();
    for (const row of mapRows || []) {
      const id = Number(row?.order_id);
      if (id) mapById.set(id, String(row.order_status || ''));
    }
    for (const live of liveOrders || []) {
      const id = Number(live?.id);
      if (!id) continue;
      const liveStatus = String(live.order_status || '');
      const mapStatus = mapById.get(id);
      if (!mapStatus || mapStatus === liveStatus) continue;
      if (!this.activeStatuses.includes(liveStatus)) continue;
      void firstValueFrom(
        this.deliveryHistory.updateOrderMapStatusByOrderId(id, liveStatus)
      ).catch(() => undefined);
    }
  }

  private pickDefaultTab(): void {
    if (this.userPickedTab) return;
    if (this.onTheWayOrders().length && !this.readyOrders().length) {
      this.activeTab = 'way';
    } else if (this.readyOrders().length) {
      this.activeTab = 'ready';
    } else if (this.onTheWayOrders().length) {
      this.activeTab = 'way';
    }
  }

  private async markOutForDelivery(order: any): Promise<void> {
    const id = Number(order.order_id);
    if (!id) return;
    this.busyId = id;
    try {
      await firstValueFrom(this.graphqlService.updateOrderStatus(id, 'out_for_delivery'));
      await this.syncDeliverySideEffects(id, 'out_for_delivery', 'Rider left — out for delivery');
      this.notify(order, 'OUT FOR DELIVERY');
      this.confirmOpen = false;
      this.confirmAction = null;
      this.confirmOrder = null;
      this.userPickedTab = true;
      this.activeTab = 'way';
      await this.loadOrders(true);
    } catch (e) {
      console.error('out_for_delivery failed', e);
      this.errorMsg = 'Failed to mark out for delivery.';
    } finally {
      this.busyId = null;
    }
  }

  private async completeDelivery(order: any): Promise<void> {
    const id = Number(order.order_id);
    if (!id) return;
    this.busyId = id;
    try {
      const totalAmount = Number(order.order_total_amount) || 0;
      let paidAmount = this.amountToCollect(order);
      try {
        const mapRow = await firstValueFrom(this.deliveryHistory.getOrderMapByOrderId(id));
        if (mapRow?.amount_to_pay != null) {
          paidAmount = Number(mapRow.amount_to_pay);
        }
      } catch {
        /* keep */
      }

      const billNo =
        'DEL_' + new Date().getTime().toString() + '_' + Math.floor(Math.random() * 1000).toString();
      await firstValueFrom(
        this.graphqlService.insertPaymentDetails({
          actual_amount: totalAmount,
          paid_amount: paidAmount,
          order_id: String(id),
          payment_mode: 'delivery',
          bill_no: billNo,
          created_time: this.sharedService.updateCurrentDateTimeInIST(),
          created_at: this.sharedService.updateCurrentDateInIST()
        })
      );

      await firstValueFrom(this.graphqlService.updateOrderStatus(id, 'paid'));
      await this.syncDeliverySideEffects(id, 'delivered', 'Delivery completed', {
        delivered_at: new Date().toISOString()
      });
      this.notify(order, 'COMPLETED');
      this.confirmOpen = false;
      this.confirmAction = null;
      this.confirmOrder = null;
      await this.loadOrders(true);
    } catch (e) {
      console.error('completeDelivery failed', e);
      this.errorMsg = 'Failed to complete delivery.';
    } finally {
      this.busyId = null;
    }
  }

  private async syncDeliverySideEffects(
    orderId: number,
    status: string,
    message: string,
    extra: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      const mapRes = await firstValueFrom(
        this.deliveryHistory.updateOrderMapStatusByOrderId(orderId, status, extra)
      );
      const mapRow = mapRes?.data?.update_kubera_delivery_kubera_customer_order_map?.returning?.[0];
      if (mapRow?.id) {
        await firstValueFrom(
          this.deliveryHistory.insertStatusEvent({
            order_map_id: mapRow.id,
            order_id: orderId,
            order_ref_id: String(mapRow.order_ref_id || ''),
            status,
            message
          })
        );
      }
      if (status === 'delivered' || status === 'paid') {
        await firstValueFrom(this.deliveryHistory.updateDeliveryPaymentStatusByOrderId(orderId, 'paid'));
      }
    } catch (e) {
      console.warn('delivery side-effect sync failed', e);
    }
  }

  private notify(order: any, statusLabel: string): void {
    try {
      const lines = this.items(order)
        .map((i) => `- ${i.name || i.item_name} x${i.qty || i.quantity || i.item_quantity}`)
        .join('\n');
      const text = [
        `Cafe Kubera — DELIVERY ${statusLabel}`,
        `Order: ${order.table_no || ''}`,
        `Customer: ${order.customer_number || ''}`,
        lines ? `Items:\n${lines}` : '',
        `Total: ₹${this.amountToCollect(order).toFixed(2)}`,
        `Pay: ${this.payLabel(order.payment_method)}`
      ]
        .filter(Boolean)
        .join('\n');
      this.whatsappNotify.sendPlainAlert(text).subscribe();
    } catch (e) {
      console.warn('delivery status notify failed', e);
    }
  }
}
