import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { Subscription, firstValueFrom } from 'rxjs';
import {
  DELIVERY_RADIUS_KM,
  GOOGLE_MAPS_API_KEY,
  RESTAURANT_LAT,
  RESTAURANT_LNG
} from '../common/constanst';
import {
  CustomerAddress,
  CustomerAddressService
} from '../service/customer-address.service';
import { DeliveryLocationService } from '../service/delivery-location.service';
import { SharedService } from '../service/shared-service';

interface LocationSearchHit {
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
  /** Google place id — details fetched on pick */
  placeId?: string;
  source?: 'local' | 'google' | 'osm' | 'photon' | 'coords';
}

/** Nearby places often missing from OpenStreetMap but common for delivery */
const LOCAL_DELIVERY_POIS: LocationSearchHit[] = [
  {
    display_name: 'City Heart Towers, Gayatri Nagar, Vijayawada, Andhra Pradesh 520008',
    lat: '16.50355',
    lon: '80.65465',
    address: {
      road: 'City Heart Towers',
      suburb: 'Gayatri Nagar',
      city: 'Vijayawada',
      postcode: '520008'
    },
    source: 'local'
  },
  {
    display_name: 'Nethaji Street, Patamata, Vijayawada, Andhra Pradesh',
    lat: '16.49520',
    lon: '80.66180',
    address: {
      road: 'Nethaji Street',
      suburb: 'Patamata',
      city: 'Vijayawada',
      postcode: '520010'
    },
    source: 'local'
  },
  {
    display_name: 'Patamata, Vijayawada, Andhra Pradesh',
    lat: '16.49488',
    lon: '80.66254',
    address: { suburb: 'Patamata', city: 'Vijayawada' },
    source: 'local'
  },
  {
    display_name: 'Patamata Lanka, Vijayawada, Andhra Pradesh',
    lat: '16.49444',
    lon: '80.65417',
    address: { suburb: 'Patamata Lanka', city: 'Vijayawada' },
    source: 'local'
  },
  {
    display_name: 'Gurunanak Colony, Vijayawada, Andhra Pradesh',
    lat: '16.50510',
    lon: '80.66447',
    address: { suburb: 'Gurunanak Colony', city: 'Vijayawada', postcode: '520008' },
    source: 'local'
  },
  {
    display_name: 'Cafe Kubera, Vijayawada',
    lat: String(RESTAURANT_LAT),
    lon: String(RESTAURANT_LNG),
    address: { name: 'Cafe Kubera', city: 'Vijayawada' },
    source: 'local'
  }
];

declare global {
  interface Window {
    google?: any;
  }
}

@Component({
  selector: 'app-delivery-addresses',
  templateUrl: './delivery-addresses.component.html',
  styleUrls: ['./delivery-addresses.component.scss']
})
export class DeliveryAddressesComponent implements OnInit, OnDestroy {
  @ViewChild('mapHost') mapHost?: ElementRef<HTMLDivElement>;

  addresses: CustomerAddress[] = [];
  selectedId: number | null = null;
  selectedText = '';
  showSpinner = false;
  showEditor = false;
  errorMsg = '';
  successMsg = '';
  mapReady = false;
  distanceKm: number | null = null;
  withinRadius = false;
  radiusKm = DELIVERY_RADIUS_KM;

  searchQuery = '';
  searchResults: LocationSearchHit[] = [];
  searchLoading = false;
  searchOpen = false;

  form: CustomerAddress = this.emptyForm();
  editingId: number | null = null;

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private customerDetailsId = 0;
  private profileName = '';
  private profilePhone = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private searchSub?: Subscription;
  private resizeHandler = () => this.map?.invalidateSize();
  private locationSub?: Subscription;

  constructor(
    private addressService: CustomerAddressService,
    private deliveryLocation: DeliveryLocationService,
    private sharedService: SharedService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    if (sessionStorage.getItem('is_login') !== 'true') {
      this.sharedService.requestCustomerLogin();
      this.router.navigate(['/delivery']);
      return;
    }
    const raw = sessionStorage.getItem('customer_Details');
    if (!raw) {
      this.router.navigate(['/delivery']);
      return;
    }
    try {
      const details = JSON.parse(raw);
      this.customerDetailsId = details?.customer_detail?.id;
      this.profileName = details?.customer_detail?.name || '';
      this.profilePhone = details?.customer_detail?.mobile_number || '';
      this.form.full_name = this.profileName;
      this.form.phone = this.profilePhone;
      if (this.profilePhone) {
        sessionStorage.setItem('customer_number', String(this.profilePhone));
      }
    } catch {
      this.router.navigate(['/delivery']);
      return;
    }
    if (!this.customerDetailsId) {
      this.errorMsg = 'Could not load your profile id. Please log in again.';
      return;
    }
    this.syncSelectedFromService();
    this.locationSub = this.deliveryLocation.selected$.subscribe(() => this.syncSelectedFromService());
    this.loadAddresses();
  }

  ngOnDestroy(): void {
    this.locationSub?.unsubscribe();
    this.searchSub?.unsubscribe();
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.destroyMap();
  }

  private syncSelectedFromService(): void {
    const sel = this.deliveryLocation.getSelected();
    this.selectedId = sel?.id ?? null;
    this.selectedText = sel?.text || '';
  }

  get selectedAddress(): CustomerAddress | undefined {
    return this.addresses.find((a) => a.id === this.selectedId);
  }

  get otherAddresses(): CustomerAddress[] {
    return this.addresses.filter((a) => a.id !== this.selectedId);
  }

  private destroyMap(): void {
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('orientationchange', this.resizeHandler);
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.marker = null;
      this.mapReady = false;
    }
  }

  emptyForm(): CustomerAddress {
    return {
      customer_details_id: 0,
      full_name: '',
      phone: '',
      line1: '',
      line2: '',
      landmark: '',
      city: 'Vijayawada',
      pincode: '',
      lat: RESTAURANT_LAT,
      lng: RESTAURANT_LNG,
      is_default: true
    };
  }

  private fixDefaultMarkerIcon(): void {
    // Webpack/Angular breaks Leaflet's relative marker image paths.
    const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
    const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
    const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';
    const DefaultIcon = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = DefaultIcon;
  }

  private initMap(): void {
    const el = this.mapHost?.nativeElement;
    if (!el || this.map) {
      return;
    }

    try {
      this.fixDefaultMarkerIcon();
      const lat = this.form.lat ?? RESTAURANT_LAT;
      const lng = this.form.lng ?? RESTAURANT_LNG;

      this.map = L.map(el, {
        scrollWheelZoom: true,
        zoomControl: true
      }).setView([lat, lng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(this.map);

      L.circle([RESTAURANT_LAT, RESTAURANT_LNG], {
        radius: DELIVERY_RADIUS_KM * 1000,
        color: '#c9a227',
        fillColor: '#c9a227',
        fillOpacity: 0.12,
        weight: 2
      }).addTo(this.map);

      L.marker([RESTAURANT_LAT, RESTAURANT_LNG], { title: 'Cafe Kubera' }).addTo(this.map);

      this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
      this.marker.on('dragend', () => {
        const p = this.marker!.getLatLng();
        this.setPin(p.lat, p.lng);
      });
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.marker?.setLatLng(e.latlng);
        this.setPin(e.latlng.lat, e.latlng.lng);
      });

      this.setPin(lat, lng);
      this.mapReady = true;
      window.addEventListener('resize', this.resizeHandler);
      window.addEventListener('orientationchange', this.resizeHandler);

      // Leaflet often renders blank until size is recalculated (esp. mobile + sticky desktop).
      requestAnimationFrame(() => {
        this.map?.invalidateSize();
        setTimeout(() => this.map?.invalidateSize(), 250);
        setTimeout(() => this.map?.invalidateSize(), 800);
      });
    } catch (e) {
      console.error('Map init failed', e);
      this.errorMsg = 'Could not load map. Check network, then refresh.';
      this.mapReady = false;
    }
  }

  setPin(lat: number, lng: number): void {
    this.form.lat = Number(lat.toFixed(7));
    this.form.lng = Number(lng.toFixed(7));
    this.distanceKm = this.sharedService.distanceKm(
      RESTAURANT_LAT,
      RESTAURANT_LNG,
      this.form.lat,
      this.form.lng
    );
    this.withinRadius = this.distanceKm <= DELIVERY_RADIUS_KM;
  }

  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.errorMsg = 'Geolocation is not supported on this device.';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.setPin(lat, lng);
        this.marker?.setLatLng([lat, lng]);
        this.map?.setView([lat, lng], 16);
        this.map?.invalidateSize();
      },
      () => {
        this.errorMsg = 'Could not get your location. Move the pin on the map instead.';
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  onSearchInput(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    const q = this.searchQuery.trim();
    if (q.length < 2) {
      this.searchResults = [];
      this.searchOpen = false;
      this.searchLoading = false;
      return;
    }
    this.searchTimer = setTimeout(() => this.runLocationSearch(q), 350);
  }

  runLocationSearch(query?: string): void {
    const q = (query ?? this.searchQuery).trim();
    if (q.length < 2) {
      return;
    }
    this.searchLoading = true;
    this.searchOpen = true;
    this.searchSub?.unsubscribe();
    this.errorMsg = '';

    // Paste: "16.50, 80.66" or Google Maps URL with @lat,lng
    const fromPaste = this.parseCoordsOrMapsUrl(q);
    if (fromPaste) {
      this.searchResults = [fromPaste];
      this.searchLoading = false;
      this.searchOpen = true;
      return;
    }

    const localHits = this.matchLocalPois(q);
    void this.searchAllProviders(q, localHits);
  }

  private matchLocalPois(q: string): LocationSearchHit[] {
    const needle = q.toLowerCase().replace(/\s+/g, ' ');
    return LOCAL_DELIVERY_POIS.filter((p) => {
      const hay = p.display_name.toLowerCase();
      return needle.split(' ').every((part) => part.length < 2 || hay.includes(part));
    });
  }

  private parseCoordsOrMapsUrl(q: string): LocationSearchHit | null {
    const coordMatch = q.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
    if (coordMatch) {
      return {
        display_name: `Pinned location (${coordMatch[1]}, ${coordMatch[2]})`,
        lat: coordMatch[1],
        lon: coordMatch[2],
        source: 'coords'
      };
    }
    const atMatch = q.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      return {
        display_name: 'Location from Google Maps link',
        lat: atMatch[1],
        lon: atMatch[2],
        source: 'coords'
      };
    }
    const qMatch = q.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) {
      return {
        display_name: 'Location from map link',
        lat: qMatch[1],
        lon: qMatch[2],
        source: 'coords'
      };
    }
    return null;
  }

  private async searchAllProviders(q: string, localHits: LocationSearchHit[]): Promise<void> {
    const merged: LocationSearchHit[] = [...localHits];
    const hasGoogleKey = !!GOOGLE_MAPS_API_KEY?.trim();

    // Google first when configured — best for Indian street / building names
    if (hasGoogleKey) {
      try {
        const googleHits = await this.searchGooglePlaces(q);
        merged.push(...googleHits);
      } catch {
        /* ignore */
      }
    }

    try {
      const photonHits = await this.searchPhoton(q);
      merged.push(...photonHits);
    } catch {
      /* ignore */
    }

    try {
      const osmHits = await this.searchNominatim(q);
      merged.push(...osmHits);
    } catch {
      /* ignore */
    }

    // If map data was weak and Google wasn't used yet, try Google as fallback
    const weak =
      merged.filter((h) => h.source !== 'local').length === 0 ||
      (merged.length <= localHits.length && !merged.some((h) => h.source === 'google'));
    if (hasGoogleKey && weak && !merged.some((h) => h.source === 'google')) {
      try {
        const googleHits = await this.searchGooglePlaces(`${q} Vijayawada`);
        merged.push(...googleHits);
      } catch {
        /* ignore */
      }
    }

    this.searchResults = this.dedupeHits(merged).slice(0, 10);
    this.searchLoading = false;
    this.searchOpen = true;
    if (!this.searchResults.length) {
      this.errorMsg = hasGoogleKey
        ? 'No locations found. Paste a Google Maps link, or drop the pin on the map.'
        : 'Not in OpenStreetMap. Paste a Google Maps share link, or set GOOGLE_MAPS_API_KEY in constanst.ts for Google search.';
    }
  }

  private dedupeHits(hits: LocationSearchHit[]): LocationSearchHit[] {
    const seen = new Set<string>();
    const out: LocationSearchHit[] = [];
    for (const h of hits) {
      const key = h.placeId
        ? `g:${h.placeId}`
        : `${Number(h.lat).toFixed(4)},${Number(h.lon).toFixed(4)}:${(h.display_name || '').slice(0, 24)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(h);
    }
    // Prefer nearby + local/google
    return out.sort((a, b) => {
      const score = (h: LocationSearchHit) => {
        let s = 0;
        if (h.source === 'local') s += 30;
        if (h.source === 'google') s += 20;
        if (h.lat && h.lon) {
          const d = this.sharedService.distanceKm(
            RESTAURANT_LAT,
            RESTAURANT_LNG,
            Number(h.lat),
            Number(h.lon)
          );
          s += Math.max(0, 15 - d);
        }
        return s;
      };
      return score(b) - score(a);
    });
  }

  private searchNominatim(q: string): Promise<LocationSearchHit[]> {
    const queries = [`${q}, Vijayawada`, q, `${q}, Gayatri Nagar, Vijayawada`];
    const reqs = queries.map((query) => {
      const params = new URLSearchParams({
        format: 'json',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'in',
        q: query
      });
      return firstValueFrom(
        this.http.get<LocationSearchHit[]>(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`
        )
      )
        .then((rows) =>
          (rows || []).map((r) => ({
            ...r,
            source: 'osm' as const
          }))
        )
        .catch(() => [] as LocationSearchHit[]);
    });
    return Promise.all(reqs).then((chunks) => chunks.flat());
  }

  private searchPhoton(q: string): Promise<LocationSearchHit[]> {
    const params = new URLSearchParams({
      q: `${q} Vijayawada`,
      lat: String(RESTAURANT_LAT),
      lon: String(RESTAURANT_LNG),
      limit: '6',
      lang: 'en'
    });
    return firstValueFrom(this.http.get<any>(`https://photon.komoot.io/api/?${params.toString()}`))
      .then((data) => {
        const features = data?.features || [];
        return features.map((f: any) => {
          const p = f.properties || {};
          const [lon, lat] = f.geometry?.coordinates || [];
          const parts = [p.name, p.street, p.locality || p.district, p.city, p.state, p.country].filter(
            Boolean
          );
          return {
            display_name: parts.join(', ') || q,
            lat: String(lat),
            lon: String(lon),
            address: {
              road: p.street || p.name,
              suburb: p.locality || p.district,
              city: p.city,
              postcode: p.postcode
            },
            source: 'photon' as const
          } as LocationSearchHit;
        });
      })
      .catch(() => [] as LocationSearchHit[]);
  }

  private ensureGooglePlaces(): Promise<boolean> {
    if (!GOOGLE_MAPS_API_KEY) {
      return Promise.resolve(false);
    }
    if (window.google?.maps?.places) {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const existing = document.getElementById('google-maps-places-sdk');
      if (existing) {
        existing.addEventListener('load', () => resolve(!!window.google?.maps?.places));
        existing.addEventListener('error', () => resolve(false));
        return;
      }
      const script = document.createElement('script');
      script.id = 'google-maps-places-sdk';
      script.async = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.onload = () => resolve(!!window.google?.maps?.places);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  private async searchGooglePlaces(q: string): Promise<LocationSearchHit[]> {
    const ok = await this.ensureGooglePlaces();
    if (!ok || !window.google?.maps?.places) {
      return [];
    }
    const svc = new window.google.maps.places.AutocompleteService();
    const inputs = q.toLowerCase().includes('vijayawada') ? [q] : [q, `${q}, Vijayawada, Andhra Pradesh`];
    const allPreds: any[] = [];

    for (const input of inputs) {
      const preds: any[] = await new Promise((resolve) => {
        svc.getPlacePredictions(
          {
            input,
            componentRestrictions: { country: 'in' },
            location: new window.google.maps.LatLng(RESTAURANT_LAT, RESTAURANT_LNG),
            radius: 15000
          },
          (results: any[], status: string) => {
            if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results) {
              resolve([]);
              return;
            }
            resolve(results);
          }
        );
      });
      allPreds.push(...preds);
      if (allPreds.length >= 6) {
        break;
      }
    }

    const seen = new Set<string>();
    const unique = allPreds.filter((p) => {
      if (!p?.place_id || seen.has(p.place_id)) {
        return false;
      }
      seen.add(p.place_id);
      return true;
    });

    return unique.slice(0, 8).map((p) => ({
      display_name: p.description,
      lat: '',
      lon: '',
      placeId: p.place_id,
      source: 'google' as const
    }));
  }

  async pickSearchResult(hit: LocationSearchHit): Promise<void> {
    let lat = Number(hit.lat);
    let lng = Number(hit.lon);

    if (hit.placeId && (Number.isNaN(lat) || Number.isNaN(lng) || !hit.lat)) {
      const details = await this.resolveGooglePlace(hit.placeId);
      if (!details) {
        this.errorMsg = 'Could not load that Google place. Try another result or drop the pin.';
        return;
      }
      lat = details.lat;
      lng = details.lng;
      hit.display_name = details.display_name || hit.display_name;
      hit.address = details.address || hit.address;
    }

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return;
    }
    this.setPin(lat, lng);
    this.marker?.setLatLng([lat, lng]);
    this.map?.setView([lat, lng], 17);
    this.map?.invalidateSize();
    this.applySearchAddress({ ...hit, lat: String(lat), lon: String(lng) });
    this.searchQuery = (hit.display_name || '').split(',')[0] || this.searchQuery;
    this.searchResults = [];
    this.searchOpen = false;
    this.successMsg = '';
    this.errorMsg = '';
  }

  private resolveGooglePlace(
    placeId: string
  ): Promise<{ lat: number; lng: number; display_name: string; address?: Record<string, string> } | null> {
    if (!window.google?.maps?.places) {
      return Promise.resolve(null);
    }
    const el = document.createElement('div');
    const svc = new window.google.maps.places.PlacesService(el);
    return new Promise((resolve) => {
      svc.getDetails(
        {
          placeId,
          fields: ['geometry', 'formatted_address', 'name', 'address_components']
        },
        (place: any, status: string) => {
          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
            resolve(null);
            return;
          }
          const comps = place.address_components || [];
          const get = (type: string) =>
            comps.find((c: any) => (c.types || []).includes(type))?.long_name || '';
          resolve({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            display_name: place.formatted_address || place.name || '',
            address: {
              road: place.name || get('route'),
              suburb: get('sublocality') || get('neighborhood'),
              city: get('locality') || get('administrative_area_level_2'),
              postcode: get('postal_code')
            }
          });
        }
      );
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.searchOpen = false;
    this.searchLoading = false;
  }

  private applySearchAddress(hit: LocationSearchHit): void {
    const a = hit.address || {};
    const line =
      [a['house_number'], a['road'] || a['pedestrian'] || a['path']].filter(Boolean).join(' ') ||
      a['neighbourhood'] ||
      a['suburb'] ||
      a['residential'] ||
      (hit.display_name || '').split(',')[0];
    if (line && !this.form.line1?.trim()) {
      this.form.line1 = line;
    } else if (line) {
      this.form.line1 = line;
    }
    if (a['suburb'] || a['neighbourhood'] || a['residential']) {
      this.form.line2 = a['suburb'] || a['neighbourhood'] || a['residential'] || this.form.line2;
    }
    if (a['city'] || a['town'] || a['village'] || a['state_district']) {
      this.form.city = a['city'] || a['town'] || a['village'] || a['state_district'] || this.form.city;
    }
    if (a['postcode']) {
      this.form.pincode = a['postcode'];
    }
  }

  loadAddresses(): void {
    this.showSpinner = true;
    this.addressService.getAddressesByCustomerId(this.customerDetailsId).subscribe({
      next: (res) => {
        this.addresses = res?.data?.kubera_profile_customer_address || [];
        this.showSpinner = false;
      },
      error: () => {
        this.errorMsg = 'Failed to load addresses.';
        this.showSpinner = false;
      }
    });
  }

  openAdd(): void {
    this.resetForm();
    this.clearSearch();
    this.errorMsg = '';
    this.successMsg = '';
    this.showEditor = true;
    this.scheduleMapInit();
  }

  openEdit(addr: CustomerAddress): void {
    this.editingId = addr.id ?? null;
    this.form = { ...addr };
    this.clearSearch();
    this.successMsg = '';
    this.errorMsg = '';
    this.showEditor = true;
    this.scheduleMapInit(() => {
      if (addr.lat != null && addr.lng != null) {
        this.setPin(Number(addr.lat), Number(addr.lng));
        this.marker?.setLatLng([addr.lat, addr.lng]);
        this.map?.setView([addr.lat, addr.lng], 16);
        this.map?.invalidateSize();
      }
    });
  }

  closeEditor(): void {
    this.destroyMap();
    this.showEditor = false;
    this.resetForm();
    this.clearSearch();
    this.errorMsg = '';
  }

  onBack(): void {
    if (this.showEditor) {
      this.closeEditor();
      return;
    }
    this.back();
  }

  private scheduleMapInit(after?: () => void): void {
    setTimeout(() => {
      this.initMap();
      after?.();
      requestAnimationFrame(() => {
        this.map?.invalidateSize();
        setTimeout(() => this.map?.invalidateSize(), 250);
      });
    }, 40);
  }

  editAddress(addr: CustomerAddress): void {
    this.openEdit(addr);
  }

  resetForm(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.form.full_name = this.profileName;
    this.form.phone = this.profilePhone;
    this.setPin(RESTAURANT_LAT, RESTAURANT_LNG);
    this.marker?.setLatLng([RESTAURANT_LAT, RESTAURANT_LNG]);
    this.map?.setView([RESTAURANT_LAT, RESTAURANT_LNG], 14);
  }

  saveAddress(): void {
    this.errorMsg = '';
    this.successMsg = '';
    if (!this.form.line1?.trim() || !this.form.full_name?.trim() || !this.form.phone?.trim()) {
      this.errorMsg = 'Name, phone, and address line are required.';
      return;
    }
    if (this.form.lat == null || this.form.lng == null) {
      this.errorMsg = 'Set a location on the map.';
      return;
    }
    if (!this.withinRadius) {
      this.errorMsg = `We only deliver within ${DELIVERY_RADIUS_KM} km of the café. Move the pin closer.`;
      return;
    }

    const payload: CustomerAddress = {
      customer_details_id: this.customerDetailsId,
      full_name: this.form.full_name.trim(),
      phone: this.form.phone.trim(),
      line1: this.form.line1.trim(),
      line2: this.form.line2 || null,
      landmark: this.form.landmark || null,
      city: this.form.city || null,
      pincode: this.form.pincode || null,
      lat: this.form.lat,
      lng: this.form.lng,
      is_default: !!this.form.is_default,
      updated_at: new Date().toISOString()
    };

    this.showSpinner = true;
    const afterClear = () => {
      if (this.editingId) {
        this.addressService.updateAddress(this.editingId, payload).subscribe({
          next: () => {
            this.successMsg = 'Address updated.';
            this.showSpinner = false;
            this.destroyMap();
            this.showEditor = false;
            this.resetForm();
            this.loadAddresses();
          },
          error: () => {
            this.errorMsg = 'Failed to update address.';
            this.showSpinner = false;
          }
        });
      } else {
        this.addressService.insertAddress(payload).subscribe({
          next: () => {
            this.successMsg = 'Address saved.';
            this.showSpinner = false;
            this.destroyMap();
            this.showEditor = false;
            this.resetForm();
            this.loadAddresses();
          },
          error: () => {
            this.errorMsg = 'Failed to save address.';
            this.showSpinner = false;
          }
        });
      }
    };

    if (payload.is_default) {
      this.addressService.clearDefaults(this.customerDetailsId).subscribe({
        next: () => afterClear(),
        error: () => afterClear()
      });
    } else {
      afterClear();
    }
  }

  deleteAddress(id: number): void {
    if (!confirm('Delete this address?')) {
      return;
    }
    this.showSpinner = true;
    this.addressService.deleteAddress(id).subscribe({
      next: () => {
        this.showSpinner = false;
        this.loadAddresses();
      },
      error: () => {
        this.errorMsg = 'Failed to delete address.';
        this.showSpinner = false;
      }
    });
  }

  selectForDelivery(addr: CustomerAddress): void {
    const result = this.deliveryLocation.setFromAddress(addr);
    if (!result.ok) {
      this.errorMsg = result.error || 'Could not select address.';
      this.successMsg = '';
      return;
    }
    this.errorMsg = '';
    this.successMsg = 'Delivering to this address.';
    this.syncSelectedFromService();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  formatAddress(a: CustomerAddress): string {
    return this.deliveryLocation.formatAddress(a);
  }

  back(): void {
    this.router.navigate(['/delivery']);
  }
}
