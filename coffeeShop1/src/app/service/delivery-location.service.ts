import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  DELIVERY_RADIUS_KM,
  RESTAURANT_LAT,
  RESTAURANT_LNG
} from '../common/constanst';
import { CustomerAddress, CustomerAddressService } from './customer-address.service';
import { SharedService } from './shared-service';

export interface SelectedDeliveryAddress {
  id: number;
  text: string;
  lat: number;
  lng: number;
  distanceKm: number;
  label?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DeliveryLocationService {
  private selectedSubject = new BehaviorSubject<SelectedDeliveryAddress | null>(this.readFromSession());

  constructor(
    private addressService: CustomerAddressService,
    private sharedService: SharedService
  ) {}

  get selected$(): Observable<SelectedDeliveryAddress | null> {
    return this.selectedSubject.asObservable();
  }

  getSelected(): SelectedDeliveryAddress | null {
    return this.selectedSubject.value;
  }

  formatAddress(a: CustomerAddress): string {
    return [a.line1, a.line2, a.landmark, a.city, a.pincode].filter(Boolean).join(', ');
  }

  shortLabel(text: string): string {
    if (!text) {
      return '';
    }
    const first = text.split(',')[0]?.trim() || text;
    return first.length > 22 ? `${first.slice(0, 20)}…` : first;
  }

  setFromAddress(addr: CustomerAddress, opts?: { skipRadiusCheck?: boolean }): { ok: boolean; error?: string } {
    if (addr.id == null || addr.lat == null || addr.lng == null) {
      return { ok: false, error: 'This address has no map pin. Edit and set location.' };
    }
    const km = this.sharedService.distanceKm(
      RESTAURANT_LAT,
      RESTAURANT_LNG,
      Number(addr.lat),
      Number(addr.lng)
    );
    if (!opts?.skipRadiusCheck && km > DELIVERY_RADIUS_KM) {
      return {
        ok: false,
        error: `This address is ${km.toFixed(1)} km away (max ${DELIVERY_RADIUS_KM} km).`
      };
    }

    const selected: SelectedDeliveryAddress = {
      id: Number(addr.id),
      text: this.formatAddress(addr),
      lat: Number(addr.lat),
      lng: Number(addr.lng),
      distanceKm: km,
      label: addr.line1 || addr.full_name
    };
    this.persist(selected);
    return { ok: true };
  }

  clear(): void {
    sessionStorage.removeItem('delivery_address_id');
    sessionStorage.removeItem('delivery_address_text');
    sessionStorage.removeItem('delivery_lat');
    sessionStorage.removeItem('delivery_lng');
    sessionStorage.removeItem('delivery_distance_km');
    sessionStorage.removeItem('delivery_address_label');
    this.selectedSubject.next(null);
  }

  /**
   * After login / on delivery home: pick nearest saved address to the user's GPS.
   * Falls back to default / first in-range address if GPS is unavailable.
   */
  autoSelectNearest(customerDetailsId: number): void {
    if (!customerDetailsId) {
      return;
    }
    this.addressService.getAddressesByCustomerId(customerDetailsId).subscribe({
      next: (res) => {
        const list: CustomerAddress[] = res?.data?.kubera_profile_customer_address || [];
        const withPin = list.filter((a) => a.lat != null && a.lng != null && a.id != null);
        if (!withPin.length) {
          return;
        }

        const inRange = withPin.filter((a) => {
          const km = this.sharedService.distanceKm(
            RESTAURANT_LAT,
            RESTAURANT_LNG,
            Number(a.lat),
            Number(a.lng)
          );
          return km <= DELIVERY_RADIUS_KM;
        });
        const pool = inRange.length ? inRange : withPin;

        this.getUserPosition()
          .then((pos) => {
            let best = pool[0];
            let bestKm = Number.POSITIVE_INFINITY;
            for (const a of pool) {
              const d = this.sharedService.distanceKm(pos.lat, pos.lng, Number(a.lat), Number(a.lng));
              if (d < bestKm) {
                bestKm = d;
                best = a;
              }
            }
            this.setFromAddress(best, { skipRadiusCheck: !inRange.length });
          })
          .catch(() => {
            const def = pool.find((a) => a.is_default) || pool[0];
            this.setFromAddress(def, { skipRadiusCheck: !inRange.length });
          });
      },
      error: () => {
        /* silent — user can pick manually */
      }
    });
  }

  /** Refresh nav chip from session (e.g. after navigation). */
  refreshFromSession(): void {
    this.selectedSubject.next(this.readFromSession());
  }

  private persist(selected: SelectedDeliveryAddress): void {
    sessionStorage.setItem('delivery_address_id', String(selected.id));
    sessionStorage.setItem('delivery_address_text', selected.text);
    sessionStorage.setItem('delivery_lat', String(selected.lat));
    sessionStorage.setItem('delivery_lng', String(selected.lng));
    sessionStorage.setItem('delivery_distance_km', selected.distanceKm.toFixed(3));
    sessionStorage.setItem('delivery_address_label', selected.label || this.shortLabel(selected.text));
    sessionStorage.setItem('order_mode', 'delivery');
    this.selectedSubject.next(selected);
  }

  private readFromSession(): SelectedDeliveryAddress | null {
    const id = sessionStorage.getItem('delivery_address_id');
    const text = sessionStorage.getItem('delivery_address_text');
    const lat = sessionStorage.getItem('delivery_lat');
    const lng = sessionStorage.getItem('delivery_lng');
    if (!id || !text || !lat || !lng) {
      return null;
    }
    return {
      id: Number(id),
      text,
      lat: Number(lat),
      lng: Number(lng),
      distanceKm: Number(sessionStorage.getItem('delivery_distance_km') || 0),
      label: sessionStorage.getItem('delivery_address_label') || this.shortLabel(text)
    };
  }

  private getUserPosition(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('no geo'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => reject(new Error('denied')),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }
}
