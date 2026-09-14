import { Component, OnInit, OnDestroy, ChangeDetectorRef, isDevMode } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Subject, of, timer, Subscription } from 'rxjs';
import { catchError, timeout, map } from 'rxjs/operators';
import {
  VERSION,
  GRAPHQL_KEY,
  KUBERA_ACCOUNT_GRAPHQL_KEY,
  KUBERA_ACCOUNT_GRAPHQL_QUERY_API,
  KUBERA_ACCOUNT_GRAPHQL_API,
  KUBERA_ACCOUNT_MENU_GRAPHQL_KEY,
  KUBERA_ACCOUNT_MENU_GRAPHQL_QUERY_API,
  CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE,
  CUSTOMER_ACCOUNT_GRAPHQL_URL,
  KUBERA_DELIVERY_GRAPHQL_ADMIN_SECRET,
  KUBERA_DELIVERY_GRAPHQL_URL,
  PAYMENT_HASURA_ADMIN_SECRET,
  DAILY_SALES_REPORT_API,
  KUBERA_API_WEB_SOCKET_URL,
  USE_DATABASE,
  SELF_ORDERING_ENABLED,
  DELIVERY_HOME_BUTTON_ENABLED,
  UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN,
  TELEGRAM_BOT_TOKEN,
  RESTAURANT_LAT,
  RESTAURANT_LNG,
  DELIVERY_RADIUS_KM,
  DELIVERY_FEE,
  DROPBOX_APPKEY,
  DROPBOX_APPSECRATE,
  DROPBOX_REFRESH_TOKEN,
  KUBERA_HEALTH_MASTER_OTP
} from '../common/constanst';

export type ServiceStatus = 'pending' | 'checking' | 'healthy' | 'degraded' | 'down';
export type ServiceCategory = 'hasura' | 'backend' | 'client' | 'config';

export interface ServiceItem {
  id: string;
  name: string;
  category: ServiceCategory;
  graphqlUrl?: string;
  restUrl?: string;
  healthzUrl?: string;
  secretHeaderName?: string;
  secretValue?: string;
  description: string;
  status: ServiceStatus;
  statusCode?: number;
  latencyMs?: number;
  lastChecked?: Date;
  details?: string;
  errorMessage?: string;
  queryTypeUsed?: string;
  showDetails?: boolean;
}

export interface AppConfigItem {
  key: string;
  label: string;
  value: any;
  type: 'boolean' | 'string' | 'number' | 'object';
  description: string;
  status: 'ok' | 'info' | 'warning' | 'error';
}

export interface ClientMetricItem {
  key: string;
  label: string;
  value: string;
  icon: string;
  status: 'ok' | 'warning' | 'error';
}

@Component({
  selector: 'app-health',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './health.component.html',
  styleUrls: ['./health.component.scss']
})
export class HealthComponent implements OnInit, OnDestroy {
  // Authentication & Security Gate
  public isAuthenticated: boolean = false;
  public otpInput: string = '';
  public generatedOtp: string | null = null;
  public otpSentNotice: boolean = false;
  public sendingOtp: boolean = false;
  public loginErrorMsg: string | null = null;

  public activeTab: 'all' | 'hasura' | 'backend' | 'config' | 'client' = 'all';
  public searchQuery: string = '';
  public autoRefreshIntervalSec: number = 30; // 0 means off
  public autoRefreshCountdown: number = 30;
  public isRefreshingAll: boolean = false;
  public lastAuditTime: Date | null = null;
  public copiedNotice: boolean = false;

  private timerSub?: Subscription;
  private countdownSub?: Subscription;

  // List of Hasura and Backend Services
  public services: ServiceItem[] = [
    {
      id: 'hasura-glorious-marten',
      name: 'Glorious Marten (Primary GraphQL)',
      category: 'hasura',
      graphqlUrl: 'https://glorious-marten-67.hasura.app/v1/graphql',
      healthzUrl: 'https://glorious-marten-67.hasura.app/healthz',
      secretHeaderName: 'x-hasura-admin-secret',
      secretValue: GRAPHQL_KEY,
      description: 'Main Apollo GraphQL engine handling cafe operations, orders, cart & live menu data.',
      status: 'pending'
    },
    {
      id: 'hasura-major-serval',
      name: 'Major Serval (Account & Configs)',
      category: 'hasura',
      graphqlUrl: KUBERA_ACCOUNT_GRAPHQL_QUERY_API,
      restUrl: KUBERA_ACCOUNT_GRAPHQL_API,
      healthzUrl: 'https://major-serval-68.hasura.app/healthz',
      secretHeaderName: 'x-hasura-admin-secret',
      secretValue: KUBERA_ACCOUNT_GRAPHQL_KEY,
      description: 'Account settings, dynamic store configurations, versioning & admin panel REST endpoints.',
      status: 'pending'
    },
    {
      id: 'hasura-wanted-manatee',
      name: 'Wanted Manatee (Menu Catalog Engine)',
      category: 'hasura',
      graphqlUrl: 'https://wanted-manatee-76.hasura.app/v1/graphql',
      restUrl: KUBERA_ACCOUNT_MENU_GRAPHQL_QUERY_API,
      healthzUrl: 'https://wanted-manatee-76.hasura.app/healthz',
      secretHeaderName: 'x-hasura-admin-secret',
      secretValue: KUBERA_ACCOUNT_MENU_GRAPHQL_KEY,
      description: 'Menu catalog database, item creation, category management & item soft-delete publishing.',
      status: 'pending'
    },
    {
      id: 'hasura-stirring-pup',
      name: 'Stirring Pup (Customer Accounts)',
      category: 'hasura',
      graphqlUrl: CUSTOMER_ACCOUNT_GRAPHQL_URL,
      healthzUrl: 'https://stirring-pup-80.hasura.app/healthz',
      secretHeaderName: 'x-hasura-admin-secret',
      secretValue: CUSTOMER_ACCOUNT_GRAPHQL_ADMIN_SECRETE,
      description: 'Customer profile storage, authentication tokens, delivery address history & loyalty cards.',
      status: 'pending'
    },
    {
      id: 'hasura-champion-ant',
      name: 'Champion Ant (Delivery & Orders)',
      category: 'hasura',
      graphqlUrl: KUBERA_DELIVERY_GRAPHQL_URL,
      healthzUrl: 'https://champion-ant-14.hasura.app/healthz',
      secretHeaderName: 'x-hasura-admin-secret',
      secretValue: KUBERA_DELIVERY_GRAPHQL_ADMIN_SECRET,
      description: 'Online delivery order ledger (kubera_delivery schema), live driver tracking & status events.',
      status: 'pending'
    },
    {
      id: 'hasura-alive-bedbug',
      name: 'Alive Bedbug (Payments & Sales)',
      category: 'hasura',
      graphqlUrl: 'https://alive-bedbug-11.hasura.app/v1/graphql',
      restUrl: DAILY_SALES_REPORT_API,
      healthzUrl: 'https://alive-bedbug-11.hasura.app/healthz',
      secretHeaderName: 'x-hasura-admin-secret',
      secretValue: PAYMENT_HASURA_ADMIN_SECRET,
      description: 'Payment verification triggers, daily sales reports aggregation & order dump destination.',
      status: 'pending'
    },
    {
      id: 'backend-upstash-redis',
      name: 'Upstash Redis Cache REST',
      category: 'backend',
      restUrl: `${UPSTASH_REDIS_REST_URL}/ping`,
      secretHeaderName: 'Authorization',
      secretValue: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      description: 'Global low-latency Redis cache for menu queries & API rate-limiting.',
      status: 'pending'
    },
    {
      id: 'backend-dropbox',
      name: 'Dropbox Cloud Storage Connection',
      category: 'backend',
      restUrl: 'https://api.dropboxapi.com/2/files/list_folder',
      description: 'Dropbox API connectivity check by exchanging OAuth refresh token and fetching root folder entries.',
      status: 'pending'
    },
    {
      id: 'backend-telegram-bot',
      name: 'Telegram Order Alert Bot',
      category: 'backend',
      restUrl: `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`,
      description: 'Instant notification bot sending new delivery orders directly to cafe staff Telegram channel.',
      status: 'pending'
    }
  ];

  // Application Configurations
  public appConfigs: AppConfigItem[] = [
    {
      key: 'APP_RUNNING_MODE',
      label: 'Application Running Mode',
      value: isDevMode() ? 'DEVELOPMENT MODE (Local Dev Server)' : 'PRODUCTION MODE (Live Production Build)',
      type: 'string',
      description: 'Indicates whether the application is running in local development mode or compiled production build.',
      status: isDevMode() ? 'warning' : 'ok'
    },
    {
      key: 'DATA_PERSISTENCE_MODE',
      label: 'Data Persistence Mode',
      value: USE_DATABASE ? 'HASURA DATABASE MODE (GraphQL)' : 'DROPBOX FILE STORAGE MODE (JSON)',
      type: 'string',
      description: 'Shows whether the application is operating in live Hasura GraphQL Database mode or legacy Dropbox File mode.',
      status: USE_DATABASE ? 'ok' : 'warning'
    },
    {
      key: 'VERSION',
      label: 'Application & API Build Version',
      value: `UI: ${VERSION} | API: Checking...`,
      type: 'string',
      description: 'Verifying frontend UI release tag against backend Hasura API version tag...',
      status: 'info'
    },
    {
      key: 'SELF_ORDERING_ENABLED',
      label: 'Guest Table Self-Ordering',
      value: SELF_ORDERING_ENABLED,
      type: 'boolean',
      description: 'Allows guests scanning table QR codes to browse menu and self-place orders.',
      status: SELF_ORDERING_ENABLED ? 'ok' : 'info'
    },
    {
      key: 'DELIVERY_HOME_BUTTON_ENABLED',
      label: 'Online Delivery Master Switch',
      value: DELIVERY_HOME_BUTTON_ENABLED,
      type: 'boolean',
      description: 'Toggles visibility of online delivery ordering on homepage and customer apps.',
      status: DELIVERY_HOME_BUTTON_ENABLED ? 'ok' : 'warning'
    },
    {
      key: 'DELIVERY_FEE',
      label: 'Standard Delivery Fee',
      value: `₹${DELIVERY_FEE}`,
      type: 'string',
      description: 'Flat delivery fee added to customer online delivery orders.',
      status: 'info'
    },
    {
      key: 'DELIVERY_RADIUS_KM',
      label: 'Maximum Delivery Radius',
      value: `${DELIVERY_RADIUS_KM} KM`,
      type: 'string',
      description: 'Max geo-distance allowed from restaurant for delivery eligibility.',
      status: 'info'
    },
    {
      key: 'RESTAURANT_LOCATION',
      label: 'Cafe GPS Coordinates',
      value: `${RESTAURANT_LAT}, ${RESTAURANT_LNG}`,
      type: 'string',
      description: 'Latitude & Longitude used for customer distance calculation.',
      status: 'info'
    },
    {
      key: 'WEBSOCKET_URL',
      label: 'WebSocket Endpoint',
      value: KUBERA_API_WEB_SOCKET_URL,
      type: 'string',
      description: 'Real-time WebSocket endpoint for kitchen order updates.',
      status: 'info'
    }
  ];

  // Client Runtime Diagnostics
  public clientMetrics: ClientMetricItem[] = [];
  public Math = Math;

  public getLatencyPercentage(latencyMs: number | undefined): number {
    if (!latencyMs) return 0;
    return Math.min(100, Math.round((latencyMs / 2000) * 100));
  }

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const sessionAuth = sessionStorage.getItem('health_authenticated');
    if (sessionAuth === 'true') {
      this.isAuthenticated = true;
      this.refreshClientMetrics();
      this.runAllChecks();
      this.startAutoRefreshTimer();
    } else {
      this.isAuthenticated = false;
    }
  }

  ngOnDestroy(): void {
    this.stopAutoRefreshTimer();
  }

  public sendMailOtp(): void {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    this.generatedOtp = otp;
    this.sendingOtp = true;
    this.loginErrorMsg = null;

    const mailData = {
      recipient: 'cafekubera2223@gmail.com',
      msgBody: `Hello Admin,\n\nYour security OTP to access the Cafe Kubera System Health Monitor is: ${otp}\n\nThanks,\nCafe Kubera Team`,
      subject: `${otp} is OTP for Health Dashboard Access`
    };

    this.http
      .post<any>('https://email-serverless-project.vercel.app/api/send-notification', mailData)
      .pipe(
        timeout(8000),
        catchError((err) => of(err))
      )
      .subscribe(() => {
        this.sendingOtp = false;
        this.otpSentNotice = true;
        this.cdr.markForCheck();
      });
  }

  public verifyAndLogin(): void {
    const input = (this.otpInput || '').trim();
    if (!input) {
      this.loginErrorMsg = 'Please enter an OTP or Master Code.';
      this.cdr.markForCheck();
      return;
    }

    if (input === KUBERA_HEALTH_MASTER_OTP || (this.generatedOtp && input === this.generatedOtp)) {
      this.isAuthenticated = true;
      sessionStorage.setItem('health_authenticated', 'true');
      this.loginErrorMsg = null;
      this.refreshClientMetrics();
      this.runAllChecks();
      this.startAutoRefreshTimer();
    } else {
      this.loginErrorMsg = 'Invalid OTP or Master Code. Please try again.';
    }
    this.cdr.markForCheck();
  }

  public lockHealthPage(): void {
    this.isAuthenticated = false;
    sessionStorage.removeItem('health_authenticated');
    this.stopAutoRefreshTimer();
    this.services.forEach((s) => {
      s.status = 'pending';
      s.latencyMs = undefined;
      s.statusCode = undefined;
      s.errorMessage = undefined;
      s.details = undefined;
    });
    this.lastAuditTime = null;
    this.cdr.markForCheck();
  }

  public apiVersion: string | null = null;
  public versionMatchStatus: 'checking' | 'match' | 'mismatch' | 'error' = 'checking';

  public checkApiVersion(): void {
    if (!this.isAuthenticated) return;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_ACCOUNT_GRAPHQL_KEY
    });

    this.http
      .get<any>(KUBERA_ACCOUNT_GRAPHQL_API, { headers })
      .pipe(
        timeout(6000),
        catchError((err) => of(err))
      )
      .subscribe((res: any) => {
        const body = res?.body || res;
        const graphqlErrors = body?.errors || res?.errors;
        const hasErrors = Array.isArray(graphqlErrors) && graphqlErrors.length > 0;
        const firstErrorMsg = hasErrors ? graphqlErrors[0]?.message : null;
        const apiVer = body?.kubera_Account_ui_version?.[0]?.verison || body?.kubera_Account_ui_version?.[0]?.version;
        const versionConfig = this.appConfigs.find((c) => c.key === 'VERSION');

        if (apiVer && !hasErrors) {
          this.apiVersion = apiVer;
          const isMatch = VERSION === apiVer;
          this.versionMatchStatus = isMatch ? 'match' : 'mismatch';

          if (versionConfig) {
            versionConfig.value = isMatch 
              ? `UI: ${VERSION} | API: ${apiVer} (MATCH)` 
              : `UI: ${VERSION} | API: ${apiVer} (MISMATCH)`;
            versionConfig.status = isMatch ? 'ok' : 'error';
            versionConfig.description = isMatch
              ? `UI version (${VERSION}) matches backend API version (${apiVer}).`
              : `VERSION MISMATCH ERROR: UI version is ${VERSION} but API expects ${apiVer}.`;
          }
        } else {
          this.apiVersion = 'Unknown / Error';
          this.versionMatchStatus = 'error';
          if (versionConfig) {
            versionConfig.value = `UI: ${VERSION} | API: Error`;
            versionConfig.status = 'error';
            versionConfig.description = firstErrorMsg
              ? `Hasura API Error: ${firstErrorMsg}`
              : 'Unable to fetch API version tag from Major Serval Hasura endpoint.';
          }
        }
        this.cdr.markForCheck();
      });
  }

  public runAllChecks(): void {
    if (!this.isAuthenticated) return;

    this.isRefreshingAll = true;
    this.lastAuditTime = new Date();

    let completed = 0;
    const total = this.services.length;

    this.services.forEach((service) => {
      this.checkService(service, () => {
        completed++;
        if (completed >= total) {
          this.isRefreshingAll = false;
          this.cdr.markForCheck();
        }
      });
    });

    this.checkApiVersion();
    this.refreshClientMetrics();
    this.autoRefreshCountdown = this.autoRefreshIntervalSec;
    this.cdr.markForCheck();
  }

  public checkService(service: ServiceItem, callback?: () => void): void {
    if (!this.isAuthenticated) {
      service.status = 'pending';
      if (callback) callback();
      return;
    }

    service.status = 'checking';
    service.errorMessage = undefined;
    service.details = undefined;
    this.cdr.markForCheck();

    const startTime = performance.now();

    // Special Check for Dropbox Cloud Connection
    if (service.id === 'backend-dropbox') {
      const dropboxAppKey = DROPBOX_APPKEY;
      const dropboxAppSecret = DROPBOX_APPSECRATE;

      const headers = new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded'
      });

      const params = new HttpParams()
        .set('refresh_token', DROPBOX_REFRESH_TOKEN)
        .set('grant_type', 'refresh_token')
        .set('client_id', dropboxAppKey)
        .set('client_secret', dropboxAppSecret);

      this.http
        .post<any>('https://api.dropboxapi.com/oauth2/token', params, { headers })
        .pipe(
          timeout(8000),
          catchError((err) => of(err))
        )
        .subscribe((tokenRes: any) => {
          if (tokenRes && tokenRes.access_token) {
            const accessToken = tokenRes.access_token;
            sessionStorage.setItem('access_token', accessToken);

            const listHeaders = new HttpHeaders({
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            });
            const listBody = { path: '', recursive: false, limit: 10 };

            this.http
              .post<any>('https://api.dropboxapi.com/2/files/list_folder', listBody, {
                headers: listHeaders,
                observe: 'response'
              })
              .pipe(
                timeout(8000),
                catchError((err) => of(err))
              )
              .subscribe((listRes: any) => {
                const endTime = performance.now();
                service.latencyMs = Math.round(endTime - startTime);
                service.lastChecked = new Date();
                service.queryTypeUsed = 'OAuth Refresh + files/list_folder';

                if (listRes && (listRes.status === 200 || listRes.body?.entries)) {
                  const entriesCount = listRes.body?.entries?.length ?? 0;
                  service.statusCode = listRes.status || 200;
                  service.status = service.latencyMs > 1500 ? 'degraded' : 'healthy';
                  service.details = `Dropbox Connection Active! OAuth token verified & found ${entriesCount} item(s) in root folder. Latency: ${service.latencyMs}ms.`;
                } else {
                  service.status = 'down';
                  service.statusCode = listRes.status || 0;
                  service.errorMessage = listRes.message || 'Dropbox list_folder call failed.';
                  service.details = `Access token acquired, but files/list_folder returned HTTP ${listRes.status || 'Error'}.`;
                }

                this.cdr.markForCheck();
                if (callback) callback();
              });
          } else {
            const endTime = performance.now();
            service.latencyMs = Math.round(endTime - startTime);
            service.lastChecked = new Date();
            service.status = 'down';
            service.statusCode = tokenRes.status || 0;
            service.errorMessage =
              tokenRes.error?.error_description || tokenRes.message || 'Dropbox OAuth token exchange failed.';
            service.details = 'Failed to obtain access token using refresh token.';

            this.cdr.markForCheck();
            if (callback) callback();
          }
        });

      return;
    }

    // Priority 1: Hasura GraphQL introspection / lightweight query
    if (service.graphqlUrl) {
      const headersConfig: any = {
        'Content-Type': 'application/json'
      };
      if (service.secretHeaderName && service.secretValue) {
        headersConfig[service.secretHeaderName] = service.secretValue;
      }
      const headers = new HttpHeaders(headersConfig);
      const body = { query: 'query HealthCheck { __typename }' };

      this.http
        .post<any>(service.graphqlUrl, body, { headers, observe: 'response' })
        .pipe(
          timeout(8000),
          catchError((err) => {
            // Fallback to healthz or REST endpoint if GraphQL query failed
            if (service.healthzUrl) {
              return this.http.get<any>(service.healthzUrl, { observe: 'response' }).pipe(
                timeout(6000),
                catchError((err2) => of(err2))
              );
            }
            return of(err);
          })
        )
        .subscribe((res: any) => {
          const endTime = performance.now();
          service.latencyMs = Math.round(endTime - startTime);
          service.lastChecked = new Date();

          const body = res?.body || res;
          const graphqlErrors = body?.errors || res?.error?.errors || res?.errors;
          const hasGraphqlErrors = Array.isArray(graphqlErrors) && graphqlErrors.length > 0;
          const firstErrorMsg = hasGraphqlErrors ? (graphqlErrors[0]?.message || 'Hasura GraphQL Error') : null;

          if (res && (res.status === 200 || res.ok) && !hasGraphqlErrors && (body?.data || res?.data)) {
            service.statusCode = res.status || 200;
            service.queryTypeUsed = 'GraphQL POST { __typename }';
            if (service.latencyMs > 1500) {
              service.status = 'degraded';
              service.details = `Operational, but slow response time (${service.latencyMs}ms).`;
            } else {
              service.status = 'healthy';
              service.details = `Operational (HTTP 200 OK). Latency: ${service.latencyMs}ms.`;
            }
          } else {
            service.status = 'down';
            service.statusCode = res?.status || 200;
            service.errorMessage = firstErrorMsg || res?.message || res?.error?.message || 'Network error or Hasura request rejected.';
            service.details = hasGraphqlErrors
              ? `Hasura Error (HTTP ${res?.status || 200}): ${firstErrorMsg}`
              : `HTTP Status: ${res?.status || 'Failed'}. Request failed.`;
          }

          this.cdr.markForCheck();
          if (callback) callback();
        });
    }
    // Priority 2: REST Endpoint check
    else if (service.restUrl) {
      const headersConfig: any = {};
      if (service.secretHeaderName && service.secretValue) {
        headersConfig[service.secretHeaderName] = service.secretValue;
      }
      const headers = new HttpHeaders(headersConfig);

      this.http
        .get<any>(service.restUrl, { headers, observe: 'response' })
        .pipe(
          timeout(8000),
          catchError((err) => of(err))
        )
        .subscribe((res: any) => {
          const endTime = performance.now();
          service.latencyMs = Math.round(endTime - startTime);
          service.lastChecked = new Date();

          const body = res?.body || res;
          const restErrors = body?.errors || (body?.error ? [body.error] : null);
          const hasRestErrors = Array.isArray(restErrors) && restErrors.length > 0;
          const restErrMsg = hasRestErrors ? (typeof restErrors[0] === 'string' ? restErrors[0] : restErrors[0]?.message) : null;

          if (res && (res.status >= 200 && res.status < 400 || res.ok) && !hasRestErrors) {
            service.statusCode = res.status || 200;
            service.queryTypeUsed = 'HTTP REST GET';
            service.status = service.latencyMs > 1500 ? 'degraded' : 'healthy';
            service.details = `REST Service active. Latency: ${service.latencyMs}ms.`;
          } else {
            service.status = 'down';
            service.statusCode = res?.status || 0;
            service.errorMessage = restErrMsg || res?.message || 'Service unreachable or returned error payload.';
            service.details = restErrMsg
              ? `API Error (HTTP ${res?.status || 200}): ${restErrMsg}`
              : `Failed to connect to ${service.restUrl}`;
          }

          this.cdr.markForCheck();
          if (callback) callback();
        });
    } else {
      service.status = 'down';
      service.errorMessage = 'No URL specified for check.';
      this.cdr.markForCheck();
      if (callback) callback();
    }
  }

  public refreshClientMetrics(): void {
    const nav = window.navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

    // LocalStorage Test
    let storageStatus: 'ok' | 'warning' | 'error' = 'ok';
    let storageText = 'Available';
    try {
      localStorage.setItem('__health_test__', '1');
      localStorage.removeItem('__health_test__');
      const count = localStorage.length;
      storageText = `Functional (${count} items stored)`;
    } catch (e) {
      storageStatus = 'error';
      storageText = 'LocalStorage Blocked / Full';
    }

    // Service Worker Status
    let swStatus: 'ok' | 'warning' | 'error' = 'warning';
    let swText = 'Not Registered';
    if ('serviceWorker' in navigator) {
      if (navigator.serviceWorker.controller) {
        swStatus = 'ok';
        swText = 'Active & Controlling Page';
      } else {
        swStatus = 'info' as any;
        swText = 'Supported (Pending Activation)';
      }
    } else {
      swStatus = 'error';
      swText = 'Not Supported';
    }

    this.clientMetrics = [
      {
        key: 'online',
        label: 'Network Connectivity',
        value: navigator.onLine ? 'ONLINE' : 'OFFLINE',
        icon: navigator.onLine ? 'bi-wifi' : 'bi-wifi-off',
        status: navigator.onLine ? 'ok' : 'error'
      },
      {
        key: 'net_speed',
        label: 'Network Type / Speed',
        value: conn ? `${conn.effectiveType || 'Unknown'} (${conn.downlink || '?'} Mbps)` : 'Standard Connection',
        icon: 'bi-speedometer2',
        status: 'ok'
      },
      {
        key: 'storage',
        label: 'Browser Local Storage',
        value: storageText,
        icon: 'bi-hdd-network',
        status: storageStatus
      },
      {
        key: 'sw',
        label: 'PWA Service Worker',
        value: swText,
        icon: 'bi-cpu',
        status: swStatus
      },
      {
        key: 'resolution',
        label: 'Screen Viewport',
        value: `${window.innerWidth} x ${window.innerHeight} px`,
        icon: 'bi-aspect-ratio',
        status: 'ok'
      },
      {
        key: 'platform',
        label: 'User Agent Platform',
        value: navigator.platform || 'Web Browser',
        icon: 'bi-display',
        status: 'ok'
      }
    ];
  }

  public setAutoRefreshInterval(seconds: number): void {
    this.autoRefreshIntervalSec = seconds;
    this.autoRefreshCountdown = seconds;
    this.startAutoRefreshTimer();
  }

  private startAutoRefreshTimer(): void {
    this.stopAutoRefreshTimer();

    if (this.autoRefreshIntervalSec <= 0 || !this.isAuthenticated) return;

    this.countdownSub = timer(0, 1000).subscribe(() => {
      if (this.autoRefreshCountdown > 1) {
        this.autoRefreshCountdown--;
      } else {
        this.autoRefreshCountdown = this.autoRefreshIntervalSec;
        this.runAllChecks();
      }
      this.cdr.markForCheck();
    });
  }

  private stopAutoRefreshTimer(): void {
    if (this.countdownSub) {
      this.countdownSub.unsubscribe();
      this.countdownSub = undefined;
    }
  }

  public toggleDetails(service: ServiceItem): void {
    service.showDetails = !service.showDetails;
    this.cdr.markForCheck();
  }

  public VERSION = VERSION;

  get hasVersionMismatch(): boolean {
    return this.versionMatchStatus === 'mismatch' || this.versionMatchStatus === 'error';
  }

  public showErrorModal: boolean = false;

  public openErrorModal(): void {
    this.showErrorModal = true;
    this.cdr.markForCheck();
  }

  public closeErrorModal(): void {
    this.showErrorModal = false;
    this.cdr.markForCheck();
  }

  get downServices(): ServiceItem[] {
    return this.services.filter((s) => s.status === 'down');
  }

  get errorConfigs(): AppConfigItem[] {
    return this.appConfigs.filter((c) => c.status === 'error' && c.key !== 'VERSION');
  }

  get errorClientMetrics(): ClientMetricItem[] {
    return this.clientMetrics.filter((m) => m.status === 'error');
  }

  get servicesDownCount(): number {
    return this.services.filter((s) => s.status === 'down').length;
  }

  // Summary Computations
  get totalServicesCount(): number {
    return this.services.length;
  }

  get healthyCount(): number {
    return this.services.filter((s) => s.status === 'healthy').length;
  }

  get degradedCount(): number {
    return this.services.filter((s) => s.status === 'degraded').length;
  }

  get downCount(): number {
    let count = this.servicesDownCount;
    if (this.hasVersionMismatch) {
      count += 1;
    }
    return count;
  }

  get avgLatencyMs(): number {
    const checked = this.services.filter((s) => s.latencyMs !== undefined && s.latencyMs > 0);
    if (checked.length === 0) return 0;
    const sum = checked.reduce((acc, s) => acc + (s.latencyMs || 0), 0);
    return Math.round(sum / checked.length);
  }

  get overallSystemStatus(): 'healthy' | 'degraded' | 'down' {
    if (this.downCount > 0 || this.hasVersionMismatch) return 'down';
    if (this.degradedCount > 0) return 'degraded';
    return 'healthy';
  }

  get filteredServices(): ServiceItem[] {
    return this.services.filter((service) => {
      const matchCategory =
        this.activeTab === 'all' ||
        (this.activeTab === 'hasura' && service.category === 'hasura') ||
        (this.activeTab === 'backend' && service.category === 'backend');

      const matchQuery =
        !this.searchQuery ||
        service.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        (service.graphqlUrl && service.graphqlUrl.toLowerCase().includes(this.searchQuery.toLowerCase()));

      return matchCategory && matchQuery;
    });
  }

  public copyDiagnosticReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      overallStatus: this.overallSystemStatus,
      version: VERSION,
      metrics: {
        total: this.totalServicesCount,
        healthy: this.healthyCount,
        degraded: this.degradedCount,
        down: this.downCount,
        avgLatencyMs: this.avgLatencyMs
      },
      hasuraInstances: this.services
        .filter((s) => s.category === 'hasura')
        .map((s) => ({
          name: s.name,
          url: s.graphqlUrl,
          status: s.status,
          latencyMs: s.latencyMs,
          statusCode: s.statusCode,
          error: s.errorMessage
        })),
      backendServices: this.services
        .filter((s) => s.category === 'backend')
        .map((s) => ({
          name: s.name,
          url: s.restUrl,
          status: s.status,
          latencyMs: s.latencyMs
        })),
      clientMetrics: this.clientMetrics,
      configs: this.appConfigs.map((c) => ({ key: c.key, value: c.value }))
    };

    const text = JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      this.copiedNotice = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.copiedNotice = false;
        this.cdr.markForCheck();
      }, 3000);
    });
  }
}
