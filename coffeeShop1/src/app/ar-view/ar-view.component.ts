import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild, ChangeDetectorRef, NgZone, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface LogEntry {
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
  text: string;
}

@Component({
  selector: 'app-ar-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './ar-view.component.html',
  styleUrls: ['./ar-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArViewComponent implements OnInit, OnDestroy {
  @ViewChild('arScene', { static: false }) sceneRef!: ElementRef;

  public showWelcomeModal = true;
  public showVideoPreviewModal = false;
  public arStarted = false;
  public targetFound = false;
  public cameraPermissionGranted = false;
  public cameraError: string | null = null;
  public showLogs = false;
  public snapshotSuccess = false;
  public isSimulatedTarget = false;
  public isAudioMuted = true;
  public currentMatchPercentage = 0;
  public matchTriggerThreshold = 40;

  public readonly muralVideoSrc = 'assets/mural-overlay.mp4';
  /**
   * targets.mind compiled size 800×390 → height/width = 0.4875
   * MindAR target plane is always width=1 in local space.
   */
  public readonly wallPlaneWidth = 1;
  public readonly wallPlaneHeight = 0.4875;
  public readonly wallPlanePosition = '0 0 0';

  /**
   * Anti-shake OneEuroFilter (MindAR maintainer recommendation).
   * Default beta=1000 barely filters → shaky on wall.
   * 0.001 / 0.001 smooths jitter while still following the mural.
   */
  public readonly mindarAttr =
    'imageTargetSrc: ./assets/targets.mind; maxTrack: 1; filterMinCF: 0.001; filterBeta: 0.001; warmupTolerance: 5; missTolerance: 10; uiLoading: no; uiError: no; uiScanning: no; autoStart: true';

  public debugLogs: LogEntry[] = [];

  private sceneEventsBound = false;
  private muralVideoEl: HTMLVideoElement | null = null;
  private onWinResize: (() => void) | null = null;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.addLog('AR ready — point at mural for wall lock', 'info');
  }

  /** Load A-Frame + MindAR only when user opens AR (not on every site visit). */
  private loadArScripts(): Promise<void> {
    const load = (src: string) =>
      new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load ' + src));
        document.head.appendChild(s);
      });

    return (async () => {
      // A-Frame must load before MindAR
      if (typeof (window as any).AFRAME === 'undefined') {
        await load('https://aframe.io/releases/1.4.2/aframe.min.js');
      }
      if (!(window as any).MINDAR && !document.querySelector('script[src*="mindar-image-aframe"]')) {
        await load('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js');
      }
    })();
  }

  public async startArFlow(): Promise<void> {
    this.showWelcomeModal = false;
    this.showVideoPreviewModal = false;
    this.cameraError = null;
    this.addLog('Starting AR…', 'info');

    try {
      await this.loadArScripts();
      this.addLog('AR libraries ready', 'success');
    } catch (e: any) {
      this.cameraError = 'Failed to load AR libraries. Check network and retry.';
      this.addLog(String(e?.message || e), 'error');
      this.cdr.markForCheck();
      return;
    }

    await this.requestCameraPermission();
    if (this.cameraError) return;

    this.arStarted = true;
    this.cdr.detectChanges();

    // Bind after a-scene exists in DOM
    setTimeout(() => this.bindScene(), 200);
    setTimeout(() => this.bindScene(), 800);
  }

  public toggleVideoPreviewModal(): void {
    this.showVideoPreviewModal = !this.showVideoPreviewModal;
    this.cdr.markForCheck();
  }

  public toggleLogs(): void {
    this.showLogs = !this.showLogs;
    this.cdr.markForCheck();
  }

  public clearLogs(): void {
    this.debugLogs = [];
    this.cdr.markForCheck();
  }

  public toggleAudio(): void {}
  public toggleSimulateTarget(): void {
    this.addLog('Point at the physical mural — wait for WALL LOCKED', 'info');
  }

  public userStartVideo(): void {
    if (this.targetFound) this.playWallVideo();
  }

  public addLog(text: string, type: LogEntry['type'] = 'info'): void {
    const time = new Date().toLocaleTimeString();
    console.log(`[WebAR ${time}] ${text}`);
    this.debugLogs = [{ time, type, text }, ...this.debugLogs].slice(0, 40);
    this.cdr.markForCheck();
  }

  public async requestCameraPermission(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError = 'Camera not supported in this browser.';
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      stream.getTracks().forEach(t => t.stop());
      this.cameraPermissionGranted = true;
      this.addLog('Camera permission OK', 'success');
    } catch (e: any) {
      this.cameraError = 'Camera access denied.';
      this.addLog('Camera error: ' + (e?.message || e), 'error');
    }
  }

  public captureSnapshot(): void {
    try {
      const sceneEl = this.sceneRef?.nativeElement;
      const canvasEl =
        sceneEl?.components?.screenshot?.getCanvas?.('perspective') ||
        sceneEl?.querySelector?.('canvas');
      if (!canvasEl) {
        this.addLog('Snapshot not ready', 'warning');
        return;
      }
      const link = document.createElement('a');
      link.download = 'Cafe_Kubera_WallAR.png';
      link.href = canvasEl.toDataURL('image/png');
      link.click();
      this.snapshotSuccess = true;
      setTimeout(() => (this.snapshotSuccess = false), 2500);
      this.addLog('Snapshot saved', 'success');
    } catch (e: any) {
      this.addLog('Snapshot error: ' + e.message, 'warning');
    }
  }

  private bindScene(): void {
    const sceneEl = this.sceneRef?.nativeElement as any;
    if (!sceneEl || this.sceneEventsBound) return;
    this.sceneEventsBound = true;

    this.muralVideoEl = sceneEl.querySelector('#muralVid') as HTMLVideoElement | null;
    if (this.muralVideoEl) {
      this.muralVideoEl.muted = true;
      this.muralVideoEl.playsInline = true;
      this.muralVideoEl.loop = true;
      this.muralVideoEl.setAttribute('playsinline', 'true');
      this.muralVideoEl.setAttribute('webkit-playsinline', 'true');
    }

    sceneEl.addEventListener('arReady', () => {
      this.addLog('MindAR ready — fill frame with mural', 'success');
      this.syncMindarLayout(sceneEl);
    });

    sceneEl.addEventListener('arError', (ev: any) => {
      this.addLog('MindAR error: ' + JSON.stringify(ev?.detail || ev), 'error');
    });

    const target = sceneEl.querySelector('#wallTarget');
    if (!target) {
      this.addLog('wallTarget missing', 'error');
      this.sceneEventsBound = false;
      return;
    }

    target.addEventListener('targetFound', () => {
      this.ngZone.run(() => {
        this.targetFound = true;
        this.currentMatchPercentage = 100;
        this.addLog('WALL LOCKED', 'success');
        // markForCheck avoids full CD that can thrash MindAR layout
        this.cdr.markForCheck();
      });
      this.playWallVideo();
    });

    target.addEventListener('targetLost', () => {
      this.ngZone.run(() => {
        this.targetFound = false;
        this.currentMatchPercentage = 0;
        this.addLog('Lost — hold mural steady in frame', 'warning');
        this.cdr.markForCheck();
      });
      this.pauseWallVideo();
    });

    this.addLog('Target listeners OK', 'info');
  }

  /**
   * MindAR letterboxes camera video to match WebGL.
   * Only sync once on ready + debounced orientation — ResizeObserver every frame = shake.
   */
  private syncMindarLayout(sceneEl: any): void {
    const run = () => {
      try {
        sceneEl.systems?.['mindar-image-system']?._resize?.();
      } catch {}
    };
    run();
    setTimeout(run, 300);

    if (!this.onWinResize) {
      this.onWinResize = () => {
        if (this.resizeTimer) clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(run, 150);
      };
      window.addEventListener('resize', this.onWinResize);
      window.addEventListener('orientationchange', this.onWinResize);
    }
  }

  private playWallVideo(): void {
    const sceneEl = this.sceneRef?.nativeElement;
    const vid =
      this.muralVideoEl ||
      (sceneEl?.querySelector?.('#muralVid') as HTMLVideoElement | null);
    if (!vid) {
      this.addLog('Video element missing', 'error');
      return;
    }
    this.muralVideoEl = vid;
    vid.muted = true;
    vid.loop = true;
    const p = vid.play();
    if (p?.then) {
      p.then(() => this.addLog('Video playing on wall plane', 'success')).catch((e: any) =>
        this.addLog('Play blocked: ' + (e?.message || e), 'warning')
      );
    }
    sceneEl?.querySelector?.('#wallGifPlane')?.setAttribute?.('play', 'true');
  }

  private pauseWallVideo(): void {
    try {
      this.muralVideoEl?.pause();
    } catch {}
    this.sceneRef?.nativeElement?.querySelector?.('#wallGifPlane')?.setAttribute?.('play', 'false');
  }

  ngOnDestroy(): void {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    if (this.onWinResize) {
      window.removeEventListener('resize', this.onWinResize);
      window.removeEventListener('orientationchange', this.onWinResize);
      this.onWinResize = null;
    }
    this.pauseWallVideo();
    this.sceneEventsBound = false;
    this.arStarted = false;
  }
}
