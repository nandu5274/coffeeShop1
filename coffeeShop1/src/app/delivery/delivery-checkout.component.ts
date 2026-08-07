import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartItemDto } from '../dtos/CartItemDto';
import {
  DELIVERY_FEE,
  DELIVERY_RADIUS_KM,
  RESTAURANT_LAT,
  RESTAURANT_LNG
} from '../common/constanst';
import { DeliveryHistoryService } from '../service/delivery-history.service';
import { DeliveryOrderService } from '../service/delivery-order.service';
import { SharedService } from '../service/shared-service';

@Component({
  selector: 'app-delivery-checkout',
  templateUrl: './delivery-checkout.component.html',
  styleUrls: ['./delivery-checkout.component.scss']
})
export class DeliveryCheckoutComponent implements OnInit {
  cartItems: CartItemDto[] = [];
  orderAmount = 0;
  deliveryFee = Number(DELIVERY_FEE) || 0;
  amountBeforeDiscount = 0;
  discountPercent = 0;
  discountAmount = 0;
  amountToPay = 0;

  couponInput = '';
  couponAppliedCode: string | null = null;
  couponId: string | null = null;
  couponUsedCount: number | null = null;
  couponMessage = '';
  couponOk = false;

  paymentMethod: 'upi_qr' | 'cod' = 'upi_qr';
  commentText = '';
  addressText = '';
  errorMsg = '';
  showSpinner = false;

  constructor(
    private router: Router,
    private sharedService: SharedService,
    private deliveryHistoryService: DeliveryHistoryService,
    private deliveryOrderService: DeliveryOrderService
  ) {}

  ngOnInit(): void {
    sessionStorage.setItem('order_mode', 'delivery');

    if (sessionStorage.getItem('is_login') !== 'true') {
      this.sharedService.requestCustomerLogin();
      this.router.navigate(['/delivery']);
      return;
    }
    if (!sessionStorage.getItem('delivery_address_id')) {
      this.router.navigate(['/delivery/addresses']);
      return;
    }

    const lat = parseFloat(sessionStorage.getItem('delivery_lat') || '');
    const lng = parseFloat(sessionStorage.getItem('delivery_lng') || '');
    if (!isNaN(lat) && !isNaN(lng)) {
      const km = this.sharedService.distanceKm(RESTAURANT_LAT, RESTAURANT_LNG, lat, lng);
      sessionStorage.setItem('delivery_distance_km', km.toFixed(3));
      if (km > DELIVERY_RADIUS_KM) {
        this.errorMsg = `Address is outside ${DELIVERY_RADIUS_KM} km delivery area.`;
      }
    }

    this.addressText = sessionStorage.getItem('delivery_address_text') || '';
    const raw = sessionStorage.getItem('cartDataList');
    if (!raw) {
      this.router.navigate(['/menu'], { fragment: 'menu' });
      return;
    }
    try {
      this.cartItems = JSON.parse(atob(raw));
    } catch {
      this.cartItems = [];
    }
    if (!this.cartItems.length) {
      this.router.navigate(['/menu'], { fragment: 'menu' });
      return;
    }
    this.recalc();
    void this.restoreCouponFromSession();
  }

  recalc(): void {
    this.orderAmount = this.cartItems.reduce((s, i) => s + (i.totalCartCost || 0), 0);
    this.amountBeforeDiscount = this.orderAmount + this.deliveryFee;
    this.amountToPay = Math.round((this.amountBeforeDiscount - this.discountAmount) * 100) / 100;
    if (this.amountToPay < 0) {
      this.amountToPay = 0;
    }
  }

  private async restoreCouponFromSession(): Promise<void> {
    const saved = this.deliveryHistoryService.readAppliedCoupon();
    if (!saved?.code) {
      return;
    }
    this.couponInput = saved.code;
    await this.applyCoupon();
  }

  async applyCoupon(): Promise<void> {
    this.couponMessage = '';
    this.recalc();
    const result = await this.deliveryHistoryService.validateAndComputeDiscount(
      this.couponInput,
      this.amountBeforeDiscount
    );
    this.couponOk = result.ok;
    this.couponMessage = result.message || (result.ok ? 'Coupon applied' : '');
    if (result.ok && result.coupon) {
      this.couponAppliedCode = result.coupon.code;
      this.couponId = result.coupon.id;
      this.couponUsedCount = result.coupon.used_count ?? 0;
      this.discountPercent = result.discountPercent;
      this.discountAmount = result.discountAmount;
      this.amountToPay = result.amountToPay;
      this.couponMessage = `Applied ${result.coupon.code}: −₹${result.discountAmount.toFixed(2)}`;
      this.deliveryHistoryService.saveAppliedCoupon({
        code: result.coupon.code,
        id: result.coupon.id,
        usedCount: result.coupon.used_count ?? 0,
        discountPercent: result.discountPercent,
        discountAmount: result.discountAmount
      });
    } else {
      this.clearCoupon(false);
      this.couponMessage = result.message || 'Invalid coupon';
    }
  }

  clearCoupon(resetInput = true): void {
    this.couponAppliedCode = null;
    this.couponId = null;
    this.couponUsedCount = null;
    this.discountPercent = 0;
    this.discountAmount = 0;
    this.deliveryHistoryService.clearAppliedCoupon();
    if (resetInput) {
      this.couponInput = '';
      this.couponMessage = '';
    }
    this.couponOk = false;
    this.recalc();
  }

  async placeOrder(): Promise<void> {
    this.errorMsg = '';
    const lat = parseFloat(sessionStorage.getItem('delivery_lat') || '');
    const lng = parseFloat(sessionStorage.getItem('delivery_lng') || '');
    if (!isNaN(lat) && !isNaN(lng)) {
      const km = this.sharedService.distanceKm(RESTAURANT_LAT, RESTAURANT_LNG, lat, lng);
      if (km > DELIVERY_RADIUS_KM) {
        this.errorMsg = `We only deliver within ${DELIVERY_RADIUS_KM} km.`;
        return;
      }
    }

    this.showSpinner = true;
    const result = await this.deliveryOrderService.placeDeliveryOrder({
      cartItems: this.cartItems,
      orderAmount: this.orderAmount,
      deliveryFee: this.deliveryFee,
      amountBeforeDiscount: this.amountBeforeDiscount,
      discountPercent: this.discountPercent,
      discountAmount: this.discountAmount,
      amountToPay: this.amountToPay,
      couponCode: this.couponAppliedCode,
      couponId: this.couponId,
      couponUsedCount: this.couponUsedCount,
      paymentMethod: this.paymentMethod,
      commentText: this.commentText
    });
    this.showSpinner = false;

    if (!result.ok) {
      this.errorMsg = result.message || 'Order failed';
      return;
    }

    sessionStorage.setItem(
      'delivery_last_order',
      JSON.stringify({
        orderId: result.orderId,
        orderRefId: result.orderRefId,
        tableNo: result.tableNo,
        mapId: result.mapId,
        amountToPay: result.amountToPay,
        paymentMethod: result.paymentMethod,
        couponCode: result.couponCode,
        discountAmount: result.discountAmount,
        addressText: this.addressText
      })
    );

    this.router.navigate(['/delivery/confirmation']);
  }

  backToMenu(): void {
    this.router.navigate(['/menu'], { fragment: 'menu' });
  }

  changeAddress(): void {
    this.router.navigate(['/delivery/addresses']);
  }
}
