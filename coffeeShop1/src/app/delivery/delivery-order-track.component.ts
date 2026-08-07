import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DeliveryHistoryService } from '../service/delivery-history.service';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-delivery-order-track',
  templateUrl: './delivery-order-track.component.html',
  styleUrls: ['./delivery-order-track.component.scss']
})
export class DeliveryOrderTrackComponent implements OnInit, OnDestroy {
  order: any = null;
  loading = true;
  errorMsg = '';
  private pollSub?: Subscription;

  readonly steps = [
    { key: 'approval_waiting', label: 'Placed' },
    { key: 'Approved', label: 'Confirmed' },
    { key: 'out_for_delivery', label: 'Out for delivery' },
    { key: 'delivered', label: 'Delivered' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private deliveryHistory: DeliveryHistoryService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/delivery/orders']);
      return;
    }
    this.pollSub = timer(0, 15000)
      .pipe(switchMap(() => this.deliveryHistory.getOrderMapById(id)))
      .subscribe({
        next: (row) => {
          this.loading = false;
          if (!row) {
            this.errorMsg = 'Order not found.';
            this.order = null;
            return;
          }
          this.order = row;
          this.errorMsg = '';
        },
        error: () => {
          this.loading = false;
          this.errorMsg = 'Could not load order.';
        }
      });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  stepIndex(status: string): number {
    if (status === 'print' || status === 'Approved') return 1;
    if (status === 'out_for_delivery') return 2;
    if (status === 'delivered' || status === 'paid') return 3;
    if (status === 'approval_waiting') return 0;
    return 0;
  }

  items(): any[] {
    const raw = this.order?.items_summary;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  latestUpdate(): any | null {
    const list = this.order?.events;
    if (!Array.isArray(list) || !list.length) {
      return null;
    }
    const sorted = [...list].sort((a, b) => {
      const ta = new Date(a?.created_at || 0).getTime();
      const tb = new Date(b?.created_at || 0).getTime();
      return ta - tb;
    });
    return sorted[sorted.length - 1] || null;
  }

  payLabel(method: string): string {
    return method === 'cod' ? 'Cash on delivery' : 'UPI QR';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      approval_waiting: 'Awaiting confirmation',
      Approved: 'Preparing',
      print: 'Preparing',
      out_for_delivery: 'Out for delivery',
      delivered: 'Delivered',
      paid: 'Delivered',
      cancelled: 'Cancelled'
    };
    return map[status] || status || 'Placed';
  }

  back(): void {
    this.router.navigate(['/delivery/orders']);
  }
}
