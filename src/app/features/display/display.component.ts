import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { SocketService } from '../../core/services/socket.service';

interface WindowDisplay {
  window_id: number;
  window_number: number;
  window_name: string;
  is_active: boolean;
  queue_code: string;
  queue_name: string;
  current_number: string | null;
  next_up: string[];
}

interface DisplayState {
  success: boolean;
  site_title: string;
  windows: WindowDisplay[];
  current_call: { window_number: number; number: string } | null;
  announcements_enabled: boolean;
}

// Change this to swap the video shown on the right half of the display.
const VIDEO_ID = 'AI2M_YxjciM';
const VIDEO_ASPECT = 16 / 9;

@Component({
  selector: 'app-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="display-page" *ngIf="state as s">
      <header class="display-header">
        <div>
          <div class="title">{{ s.site_title }}</div>
          <div class="subtitle">Queueing System — Now Serving</div>
        </div>
        <div class="clock">
          <div class="date">{{ now | date: 'EEEE, MMMM d, y' }}</div>
          <div class="time">{{ now | date: 'h:mm:ss a' }} PHT</div>
        </div>
      </header>

      <div class="splitrow">
        <div class="hero" [class.offline]="!connected">
          <div class="hero-label">Now Serving</div>
          <div class="hero-number" [class.flash]="flash">{{ s.current_call?.number || '---' }}</div>
          <div class="hero-window" *ngIf="s.current_call">Window {{ s.current_call.window_number }}</div>
          <div class="offline-note" *ngIf="!connected">Reconnecting…</div>
        </div>

        <!-- #videoContainer is the crop window; the iframe inside is deliberately
             oversized and centered by sizeVideoToCover() below, so the video
             fills the box completely with no letterboxing, cropping any excess
             instead of shrinking to fit (same idea as CSS object-fit: cover,
             which iframes don't support natively). -->
        <div class="video-half" #videoContainer>
          <iframe
            #videoFrame
            [src]="videoUrl"
            title="Display video"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen>
          </iframe>
        </div>
      </div>

      <div class="grid-row" *ngIf="topRow.length" [style.grid-template-columns]="'repeat(' + topRow.length + ', 1fr)'">
        <div class="cell" *ngFor="let w of topRow" [class.idle]="!w.current_number">
          <div class="cell-window">{{ w.window_name }}</div>
          <div class="cell-number">{{ w.current_number || '—' }}</div>
          <div class="cell-queue">{{ w.queue_name }}</div>
          <div class="cell-next" *ngIf="w.next_up.length">
            <div class="next-label">Next Up</div>
            <div class="next-numbers">{{ w.next_up.join(', ') }}</div>
          </div>
        </div>
      </div>
      <div class="grid-row" *ngIf="bottomRow.length" [style.grid-template-columns]="'repeat(' + bottomRow.length + ', 1fr)'">
        <div class="cell" *ngFor="let w of bottomRow" [class.idle]="!w.current_number">
          <div class="cell-window">{{ w.window_name }}</div>
          <div class="cell-number">{{ w.current_number || '—' }}</div>
          <div class="cell-queue">{{ w.queue_name }}</div>
          <div class="cell-next" *ngIf="w.next_up.length">
            <div class="next-label">Next Up</div>
            <div class="next-numbers">{{ w.next_up.join(', ') }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .display-page { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; background: var(--primary-dark); color: #fff; font-family: system-ui, sans-serif; }
      .display-header { display: flex; justify-content: space-between; align-items: center; padding: clamp(12px, 2vw, 22px) clamp(16px, 4vw, 40px); border-bottom: 2px solid rgba(255,255,255,0.15); }
      .title { font-size: clamp(18px, 2.6vw, 30px); font-weight: 700; }
      .subtitle { font-size: clamp(12px, 1.2vw, 16px); opacity: 0.75; }
      .clock { text-align: right; font-variant-numeric: tabular-nums; }
      .date { font-size: clamp(12px, 1.2vw, 16px); opacity: 0.85; }
      .time { font-size: clamp(16px, 2.2vw, 28px); font-weight: 700; }

      .splitrow { display: flex; align-items: stretch; border-bottom: 2px solid rgba(255,255,255,0.15); min-height: 300px; }
      .hero, .video-half { flex: 1 1 50%; width: 50%; }

      .hero { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: clamp(16px, 3vw, 24px) 12px; background: linear-gradient(180deg, rgba(255,255,255,0.03), transparent); border-right: 2px solid rgba(255,255,255,0.15); position: relative; }
      .hero-label { font-size: clamp(13px, 1.5vw, 20px); letter-spacing: 0.15em; opacity: 0.8; text-transform: uppercase; }
      .hero-number { font-family: monospace; font-size: clamp(48px, 9vw, 160px); font-weight: 800; line-height: 1; margin: 8px 0; font-variant-numeric: tabular-nums; transition: transform 0.25s ease; }
      .hero-number.flash { animation: flashScale 0.9s ease; }
      @keyframes flashScale { 0% { transform: scale(1); } 25% { transform: scale(1.08); color: #FFD873; } 100% { transform: scale(1); } }
      .hero-window { font-size: clamp(15px, 1.8vw, 28px); font-weight: 700; opacity: 0.95; }
      .offline { opacity: 0.6; }
      .offline-note { position: absolute; bottom: 8px; font-size: 12px; color: #FFD873; }

      .video-half { background: #000; position: relative; overflow: hidden; }
      .video-half iframe { position: absolute; top: 50%; left: 50%; width: 100%; height: 100%; border: 0; display: block; transform: translate(-50%, -50%); }

      .grid-row { flex: 1; display: grid; gap: 2px; background: rgba(255,255,255,0.15); }
      .cell { background: var(--primary-dark); padding: clamp(10px, 1.6vw, 18px) 10px; text-align: center; display: flex; flex-direction: column; justify-content: center; min-height: 150px; }
      .cell.idle { opacity: 0.5; }
      .cell-window { font-size: clamp(14px, 1.4vw, 21px); letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; }
      .cell-number { font-family: monospace; font-size: clamp(32px, 5vw, 68px); font-weight: 700; margin: 6px 0; font-variant-numeric: tabular-nums; }
      .cell-queue { font-size: clamp(11px, 1vw, 15px); }
      .cell-next { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.15); font-size: clamp(11px, 1vw, 15px); }
      .next-label { letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 4px; }
      .next-numbers { font-family: monospace; font-size: clamp(14px, 1.5vw, 22px); font-weight: 600; }

      @media (max-width: 900px) { .grid-row { grid-template-columns: repeat(2, 1fr) !important; } }
      @media (max-width: 640px) {
        .grid-row { grid-template-columns: 1fr !important; }
        .splitrow { flex-direction: column; }
        .hero, .video-half { width: 100%; min-height: 220px; }
        .hero { border-right: none; border-bottom: 2px solid rgba(255,255,255,0.15); }
      }
    `,
  ],
})
export class DisplayComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoContainer') videoContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('videoFrame') videoFrameRef!: ElementRef<HTMLIFrameElement>;

  state: DisplayState | null = null;
  now = new Date();
  flash = false;
  connected = true;
  videoUrl: SafeResourceUrl;

  private speechQueue: string[] = [];
  private speaking = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor(private http: HttpClient, private socket: SocketService, private sanitizer: DomSanitizer, private renderer: Renderer2) {
    const url = `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&playsinline=1&controls=0`;
    this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  ngOnInit(): void {
    this.load();
    setInterval(() => (this.now = new Date()), 1000); // clock tick only — not a data request

    this.socket.queueUpdate$.subscribe(() => this.load());
    this.socket.connected$.subscribe(() => {
      this.connected = true;
      this.load();
    });

    this.socket.ticketCalled$.subscribe((payload) => {
      this.flashHero();
      if (this.state?.announcements_enabled) {
        this.enqueueSpeech(`Number ${payload.number}, please proceed to window ${payload.window_number}.`);
      }
    });
  }

  ngAfterViewInit(): void {
    this.sizeVideoToCover();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.sizeVideoToCover());
      this.resizeObserver.observe(this.videoContainerRef.nativeElement);
    } else {
      window.addEventListener('resize', () => this.sizeVideoToCover());
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  /**
   * Oversizes the iframe so it always fully covers its container (cropping
   * the excess) instead of letterboxing — iframes don't support CSS
   * object-fit, so this has to be computed in JS, same technique as
   * background-size: cover.
   */
  private sizeVideoToCover(): void {
    const container = this.videoContainerRef?.nativeElement;
    const frame = this.videoFrameRef?.nativeElement;
    if (!container || !frame) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;

    const containerAspect = w / h;
    let targetW: number;
    let targetH: number;

    if (containerAspect > VIDEO_ASPECT) {
      // Container is wider than the video — match width, let height overflow.
      targetW = w;
      targetH = w / VIDEO_ASPECT;
    } else {
      // Container is taller/narrower than the video — match height, let width overflow.
      targetH = h;
      targetW = h * VIDEO_ASPECT;
    }

    this.renderer.setStyle(frame, 'width', `${Math.ceil(targetW)}px`);
    this.renderer.setStyle(frame, 'height', `${Math.ceil(targetH)}px`);
  }

  get topRow(): WindowDisplay[] {
    return this.state?.windows.slice(0, 3) || [];
  }

  get bottomRow(): WindowDisplay[] {
    return this.state?.windows.slice(3) || [];
  }

  private load(): void {
    this.http.get<DisplayState>(`${environment.apiUrl}/display`).subscribe({
      next: (s) => {
        this.state = s;
        this.connected = true;
      },
      error: () => {
        this.connected = false;
      },
    });
  }

  private flashHero(): void {
    this.flash = false;
    setTimeout(() => (this.flash = true), 10);
    setTimeout(() => (this.flash = false), 900);
  }

  private enqueueSpeech(text: string): void {
    this.speechQueue.push(text);
    if (!this.speaking) this.drainSpeechQueue();
  }

  private drainSpeechQueue(): void {
    const next = this.speechQueue.shift();
    if (!next || !('speechSynthesis' in window)) {
      this.speaking = false;
      return;
    }
    this.speaking = true;
    const utterance = new SpeechSynthesisUtterance(next);
    utterance.onend = () => this.drainSpeechQueue();
    utterance.onerror = () => this.drainSpeechQueue();
    window.speechSynthesis.speak(utterance);
  }
}
