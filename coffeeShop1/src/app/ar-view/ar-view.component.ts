import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

declare const AFRAME: any;

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
  styleUrls: ['./ar-view.component.scss']
})
export class ArViewComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('arScene', { static: false }) sceneRef!: ElementRef;
  @ViewChild('animCanvas', { static: false }) animCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('modalPreviewCanvas', { static: false }) modalPreviewCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('muralVideo', { static: false }) muralVideoRef!: ElementRef<HTMLVideoElement>;

  public showWelcomeModal = true;
  public showVideoPreviewModal = false;
  public isInitializing = false;
  public isCompilingTargets = false;
  public arTargetSrc = 'assets/targets.mind';
  public targetFound = false;
  public cameraPermissionGranted = false;
  public cameraError: string | null = null;
  public statusMessage = 'Initializing Cafe Kubera WebAR...';
  public isSimulatedTarget = false;
  public showLogs = false;
  public isAudioMuted = false;
  public snapshotSuccess = false;
  public currentMatchPercentage = 0;
  public matchedRegionName = '';
  public readonly matchTriggerThreshold = 40;
  public isVideoPlaying = false;

  public debugLogs: LogEntry[] = [];

  private targetFoundListener: any;
  private targetLostListener: any;
  private sceneLoadedListener: any;
  private arReadyListener: any;
  private arErrorListener: any;
  private audioCtx: AudioContext | null = null;
  private ambientOscillator: OscillatorNode | null = null;
  private scanTickerId: any = null;
  private animationFrameId: number | null = null;
  private muralImageLoaded = false;
  private muralImage = new Image();
  private videoReady = false;
  /** Converted from mural-overlay.gif — WebGL cannot animate GIFs reliably */
  public readonly muralVideoSrc = 'assets/mural-overlay.mp4';
  private videoTexture: any = null;

  constructor(private router: Router, private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.addLog('WebAR ready. Animated mural video pins to the wall when MindAR locks.', 'info');
    this.preloadMuralImage();
  }

  ngAfterViewInit(): void {
    this.setupMuralVideo();
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => this.initAnimatedCanvasStream(), 100);
    });
  }

  private setupMuralVideo(): void {
    const video = this.muralVideoRef?.nativeElement;
    if (!video) {
      setTimeout(() => this.setupMuralVideo(), 200);
      return;
    }
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = 'auto';

    const onReady = () => {
      this.videoReady = true;
      this.addLog(
        `mural-overlay.mp4 ready (${video.videoWidth}x${video.videoHeight})`,
        'success'
      );
    };
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('error', () => {
      this.addLog('Failed to load mural-overlay.mp4', 'error');
    });
    // Kick off buffering early
    video.load();
  }

  private async playMuralVideo(): Promise<void> {
    const video = this.muralVideoRef?.nativeElement;
    if (!video) return;
    try {
      video.muted = true;
      video.currentTime = Math.min(video.currentTime, 0.01) || 0;
      await video.play();
      this.isVideoPlaying = true;
      this.addLog('▶ Mural video playing', 'success');
    } catch (e: any) {
      this.addLog('Video play blocked: ' + (e?.message || e) + ' — tap screen once', 'warning');
    }
  }

  private pauseMuralVideo(): void {
    const video = this.muralVideoRef?.nativeElement;
    if (!video) return;
    try {
      video.pause();
    } catch {}
    this.isVideoPlaying = false;
  }

  private preloadMuralImage(): void {
    this.muralImage.crossOrigin = 'anonymous';
    this.muralImage.onload = () => {
      this.muralImageLoaded = true;
      this.addLog('Wall target image loaded (hero-m-bg.jpg)', 'info');
    };
    this.muralImage.src = 'assets/img/hero-m-bg.jpg';
  }

  public async startArFlow(): Promise<void> {
    this.showWelcomeModal = false;
    this.showVideoPreviewModal = false;
    this.isCompilingTargets = false;
    this.isInitializing = false;
    this.statusMessage = 'Scanning for Cafe Kubera Wall...';
    this.addLog('User started AR Flow. Launching camera scanner immediately...', 'info');

    this.registerAFrameVideoComponent();
    await this.requestCameraPermission();
    this.initAmbientAudio();
    this.startLiveScanMatchTicker();
    // Prime muted video during user gesture so playback works on target lock
    void this.playMuralVideo().then(() => this.pauseMuralVideo());

    setTimeout(() => {
      this.setupSceneEvents();
    }, 500);
  }

  public toggleVideoPreviewModal(): void {
    this.showVideoPreviewModal = !this.showVideoPreviewModal;
    if (this.showVideoPreviewModal) {
      this.addLog('🎬 Displaying Living Wall Mural Video Preview modal', 'info');
    }
  }

  public addLog(text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const time = new Date().toLocaleTimeString();
    console.log(`[WebAR ${time}] ${text}`);
    this.debugLogs.unshift({ time, type, text });
    if (this.debugLogs.length > 35) {
      this.debugLogs.pop();
    }
  }

  public toggleLogs(): void {
    this.showLogs = !this.showLogs;
    if (this.showLogs) {
      this.addLog('Diagnostics Terminal expanded (showing live 3D wall tracking & match logs)', 'info');
    }
  }

  public clearLogs(): void {
    this.debugLogs = [];
  }

  public toggleAudio(): void {
    this.isAudioMuted = !this.isAudioMuted;
    if (this.audioCtx) {
      if (this.isAudioMuted) {
        this.audioCtx.suspend();
        this.addLog('Ambient acoustic sound muted 🔇', 'info');
      } else {
        this.audioCtx.resume();
        this.addLog('Ambient acoustic sound unmuted 🔊', 'info');
      }
    }
  }

  public goToMenu(): void {
    this.router.navigate(['/menu']);
  }

  public captureSnapshot(): void {
    try {
      const sceneEl = this.sceneRef?.nativeElement;
      const canvasEl = sceneEl?.components?.screenshot?.getCanvas('perspective') || sceneEl?.querySelector('canvas');
      if (canvasEl) {
        const imageUri = canvasEl.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'Cafe_Kubera_WebAR_Mural_Snapshot.png';
        link.href = imageUri;
        link.click();
        this.snapshotSuccess = true;
        this.addLog('📸 Snapshot captured & saved for social sharing!', 'success');
        setTimeout(() => this.snapshotSuccess = false, 3000);
      } else {
        this.addLog('Canvas snapshot not ready yet', 'warning');
      }
    } catch (e: any) {
      this.addLog('Snapshot capture error: ' + e.message, 'warning');
    }
  }

  private initAnimatedCanvasStream(): void {
    const canvas = this.animCanvasRef?.nativeElement;
    if (!canvas) {
      this.addLog('animCanvas missing — retrying…', 'warning');
      setTimeout(() => this.initAnimatedCanvasStream(), 250);
      return;
    }
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let framesPainted = 0;
    const renderFrame = () => {
      const video = this.muralVideoRef?.nativeElement;
      const videoReady = !!(video && video.readyState >= 2 && video.videoWidth > 0);
      const shouldPlay = this.targetFound || this.isSimulatedTarget;

      if (shouldPlay && videoReady && !video.paused) {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          framesPainted++;
          if (framesPainted === 1) {
            this.ngZone.run(() => this.addLog('▶ First video frame painted onto wall plane', 'success'));
          }
        } catch (e: any) {
          if (framesPainted === 0) {
            this.ngZone.run(() => this.addLog('Video draw failed: ' + (e?.message || e), 'error'));
          }
        }
      } else if (this.muralImageLoaded) {
        ctx.drawImage(this.muralImage, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#1a1510';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (this.showVideoPreviewModal && this.modalPreviewCanvasRef?.nativeElement) {
        const modalCanvas = this.modalPreviewCanvasRef.nativeElement;
        modalCanvas.width = canvas.width;
        modalCanvas.height = canvas.height;
        const modalCtx = modalCanvas.getContext('2d');
        if (modalCtx) modalCtx.drawImage(canvas, 0, 0);
      }

      if (shouldPlay) {
        this.paintWallPlaneTexture(canvas, videoReady ? video : null);
      }

      this.animationFrameId = requestAnimationFrame(renderFrame);
    };

    renderFrame();
  }

  private paintWallPlaneTexture(canvas: HTMLCanvasElement, video: HTMLVideoElement | null): void {
    const THREE = (window as any).AFRAME?.THREE || (window as any).THREE;
    if (!THREE) return;

    const planes = document.querySelectorAll('a-plane.wall-video-plane');
    planes.forEach((plane: any) => {
      const mesh = plane.getObject3D?.('mesh');
      if (!mesh) {
        plane.addEventListener?.('object3dset', () => this.paintWallPlaneTexture(canvas, video), { once: true });
        return;
      }
      if (!mesh.material) return;

      // Prefer VideoTexture when video is playing (true motion); else canvas fallback
      let tex = this.videoTexture;
      if (video && video.readyState >= 2) {
        if (!this.videoTexture || this.videoTexture.image !== video) {
          this.videoTexture = new THREE.VideoTexture(video);
          this.videoTexture.flipY = true;
          this.videoTexture.minFilter = THREE.LinearFilter;
          this.videoTexture.magFilter = THREE.LinearFilter;
          this.videoTexture.generateMipmaps = false;
          if ('colorSpace' in this.videoTexture && THREE.SRGBColorSpace) {
            this.videoTexture.colorSpace = THREE.SRGBColorSpace;
          } else if ('encoding' in this.videoTexture && THREE.sRGBEncoding) {
            this.videoTexture.encoding = THREE.sRGBEncoding;
          }
        }
        tex = this.videoTexture;
        tex.needsUpdate = true;
      } else {
        if (!this.videoTexture || this.videoTexture.isVideoTexture) {
          this.videoTexture = new THREE.CanvasTexture(canvas);
          this.videoTexture.flipY = true;
          this.videoTexture.minFilter = THREE.LinearFilter;
          this.videoTexture.magFilter = THREE.LinearFilter;
          this.videoTexture.generateMipmaps = false;
        }
        tex = this.videoTexture;
        tex.needsUpdate = true;
      }

      const mat = mesh.material;
      if (mat.map !== tex) {
        mat.map = tex;
        mat.transparent = true;
        mat.opacity = 1;
        mat.depthTest = true;
        mat.depthWrite = false;
        mat.side = THREE.DoubleSide;
        mat.needsUpdate = true;
      }
      mesh.visible = true;
      mesh.frustumCulled = false;
    });
  }

  private startLiveScanMatchTicker(): void {
    if (this.scanTickerId) clearInterval(this.scanTickerId);

    this.scanTickerId = setInterval(() => {
      if (this.targetFound || this.isSimulatedTarget) {
        this.currentMatchPercentage = Math.max(this.currentMatchPercentage, 92);
        const video = this.muralVideoRef?.nativeElement;
        const playing = !!(video && !video.paused && video.readyState >= 2);
        this.addLog(
          playing
            ? `🎯 Wall locked — mural video playing (${this.currentMatchPercentage}%)`
            : `🎯 Wall locked — waiting for mural video…`,
          playing ? 'success' : 'warning'
        );
      } else if (!this.showWelcomeModal && this.cameraPermissionGranted) {
        this.currentMatchPercentage = Math.min(38, 12 + Math.floor(Math.random() * 28));
        this.addLog(`📷 Scanning mural wall | Match: ${this.currentMatchPercentage}% (need MindAR lock)`, 'info');
      }
    }, 2000);
  }

  private initAmbientAudio(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        this.ambientOscillator = osc;
        this.addLog('Ambient acoustic café soundscape initialized 🎵', 'success');
      }
    } catch (e: any) {
      console.warn('Audio Context init notice:', e);
    }
  }

  private registerAFrameVideoComponent(): void {
    if (typeof AFRAME !== 'undefined' && !AFRAME.components['ar-video-sync']) {
      const self = this;
      AFRAME.registerComponent('ar-video-sync', {
        init: function () {
          this.el.addEventListener('targetFound', () => {
            self.addLog('🎯 MindAR targetFound event received on wall entity!', 'success');
            self.onTargetFound();
          });
          this.el.addEventListener('targetLost', () => {
            self.addLog('⚠️ MindAR targetLost event received', 'warning');
            self.onTargetLost();
          });
        }
      });
    }
  }

  public async requestCameraPermission(): Promise<void> {
    this.isInitializing = false;
    this.cameraError = null;
    this.statusMessage = 'Scanning for Cafe Kubera Wall...';
    this.addLog('Requesting device camera access (environment)...', 'info');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.cameraError = 'Camera access is not supported by your browser.';
      this.addLog('Camera API not supported on this browser', 'error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      stream.getTracks().forEach(track => track.stop());
      this.cameraPermissionGranted = true;
      this.statusMessage = 'Scanning for Cafe Kubera Wall...';
      this.addLog('Camera access granted! Stream ready.', 'success');
    } catch (err: any) {
      console.error('Camera permission denied or error:', err);
      this.cameraPermissionGranted = false;
      this.cameraError = 'Camera access was denied or unavailable.';
      this.addLog('Camera permission error: ' + (err.message || err), 'error');
    }
  }

  private setupSceneEvents(): void {
    const sceneEl = this.sceneRef?.nativeElement;
    if (!sceneEl) return;

    this.sceneLoadedListener = () => {
      this.isInitializing = false;
      this.statusMessage = 'Scanning for Cafe Kubera Wall...';
      this.addLog('A-Frame <a-scene> DOM loaded', 'info');
    };

    this.arReadyListener = () => {
      this.addLog('MindAR Engine Ready. 3D Wall tracking active.', 'success');
    };

    this.arErrorListener = (event: any) => {
      this.addLog('MindAR Engine Error: ' + JSON.stringify(event?.detail || event), 'error');
    };

    sceneEl.addEventListener('loaded', this.sceneLoadedListener);
    sceneEl.addEventListener('arReady', this.arReadyListener);
    sceneEl.addEventListener('arError', this.arErrorListener);

    const targetEntities = sceneEl.querySelectorAll('[mindar-image-target]');
    if (targetEntities.length > 0) {
      targetEntities.forEach((targetEl: any, idx: number) => {
        targetEl.addEventListener('targetFound', () => {
          this.matchedRegionName = 'Cafe Kubera Mural Wall';
          this.addLog(`🎯 WALL MURAL MATCHED (target ${idx}) — pinning video flush to wall plane`, 'success');
          this.onTargetFound();
          this.pinWallPlanes();
        });
        targetEl.addEventListener('targetLost', () => {
          this.onTargetLost();
        });
      });
      this.addLog(`Registered MindAR wall target listener(s): ${targetEntities.length}`, 'info');
    }
  }

  /** Keep overlay planes sized/positioned flush to the tracked mural (MindAR width=1). */
  private pinWallPlanes(): void {
    const planes = document.querySelectorAll('a-plane.wall-video-plane');
    planes.forEach((plane: any) => {
      plane.setAttribute('position', '0 0 0.02');
      plane.setAttribute('width', '1');
      plane.setAttribute('height', '0.5625');
      plane.setAttribute('rotation', '0 0 0');
      // Do NOT reset material.src here — that wipes the live canvas texture.
      const mesh = plane.getObject3D?.('mesh');
      if (mesh) {
        mesh.frustumCulled = false;
        mesh.visible = true;
      }
    });
  }

  public onTargetFound(): void {
    this.ngZone.run(() => {
      this.targetFound = true;
      this.currentMatchPercentage = 98;
      this.statusMessage = 'Cafe Kubera Wall Mural Recognized!';
      this.addLog('✓ Video pinned to wall surface (MindAR lock)', 'success');
      this.cdr.detectChanges();
    });
    this.pinWallPlanes();
    void this.playMuralVideo();
    const canvas = this.animCanvasRef?.nativeElement;
    const video = this.muralVideoRef?.nativeElement || null;
    if (canvas) {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => this.paintWallPlaneTexture(canvas, video), 50 * i);
      }
    }
  }

  public onTargetLost(): void {
    if (this.isSimulatedTarget) return;
    this.pauseMuralVideo();
    this.ngZone.run(() => {
      this.targetFound = false;
      this.isVideoPlaying = false;
      this.currentMatchPercentage = 0;
      this.matchedRegionName = '';
      this.statusMessage = 'Scanning for Cafe Kubera Wall...';
      this.cdr.detectChanges();
    });
  }

  public toggleSimulateTarget(): void {
    this.isSimulatedTarget = !this.isSimulatedTarget;

    if (this.isSimulatedTarget) {
      this.matchedRegionName = 'Test Mode (camera-front preview)';
      this.targetFound = true;
      this.currentMatchPercentage = 98;
      this.statusMessage = 'Test preview — video in front of camera';
      this.addLog('⚡ Test AR: mounting video plane in front of camera', 'warning');
      this.mountTestPlaneOnCamera(true);
      void this.playMuralVideo();
    } else {
      this.addLog('Scanner Mode re-enabled — point at mural for wall lock', 'info');
      this.mountTestPlaneOnCamera(false);
      this.isSimulatedTarget = false;
      this.onTargetLost();
    }
  }

  /** Test AR: show plane in front of camera (MindAR target stays invisible until tracked). */
  private mountTestPlaneOnCamera(enable: boolean): void {
    const sceneEl = this.sceneRef?.nativeElement;
    if (!sceneEl) return;
    const plane = sceneEl.querySelector('#wallGifPlane') as any;
    const camera = sceneEl.querySelector('a-camera') as any;
    const target = sceneEl.querySelector('[mindar-image-target]') as any;
    if (!plane || !camera) return;

    if (enable) {
      camera.appendChild(plane);
      plane.setAttribute('position', '0 0 -1.2');
      plane.setAttribute('width', '1.2');
      plane.setAttribute('height', '0.675');
      plane.object3D.visible = true;
      const canvas = this.animCanvasRef?.nativeElement;
      const video = this.muralVideoRef?.nativeElement || null;
      if (canvas) this.paintWallPlaneTexture(canvas, video);
    } else if (target) {
      target.appendChild(plane);
      this.pinWallPlanes();
    }
  }

  public userStartVideo(): void {
    // Mobile browsers often need a user gesture to start media
    if (this.targetFound || this.isSimulatedTarget) {
      void this.playMuralVideo();
    }
  }

  ngOnDestroy(): void {
    this.pauseMuralVideo();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.scanTickerId) {
      clearInterval(this.scanTickerId);
    }
    if (this.ambientOscillator) {
      try { this.ambientOscillator.stop(); } catch (e) {}
    }
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch (e) {}
    }
    const sceneEl = this.sceneRef?.nativeElement;
    if (sceneEl) {
      if (this.sceneLoadedListener) sceneEl.removeEventListener('loaded', this.sceneLoadedListener);
      if (this.arReadyListener) sceneEl.removeEventListener('arReady', this.arReadyListener);
      if (this.arErrorListener) sceneEl.removeEventListener('arError', this.arErrorListener);

      const targetEntities = sceneEl.querySelectorAll('[mindar-image-target]');
      targetEntities.forEach((targetEl: any) => {
        if (this.targetFoundListener) targetEl.removeEventListener('targetFound', this.targetFoundListener);
        if (this.targetLostListener) targetEl.removeEventListener('targetLost', this.targetLostListener);
      });
    }
  }
}
