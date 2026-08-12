import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

/**
 * One shared socket connection for the whole app. Components subscribe to
 * queueUpdate$ / ticketCalled$ instead of running their own setInterval —
 * this is what eliminates the "request every few seconds" pattern from the
 * old PHP version entirely. A REST fetch only happens once on initial load
 * and once again whenever the socket reconnects after a drop (to catch up
 * on anything missed while disconnected) — never on a fixed timer.
 */
@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket;

  /** Emits whenever ANY ticket/window state changes — components re-fetch their small state payload in response. */
  queueUpdate$ = new Subject<void>();
  /** Emits immediately when a ticket is called/recalled, carrying enough detail to announce it without a round trip. */
  ticketCalled$ = new Subject<{ window_number: number; number: string }>();
  /** True right after a (re)connect — the signal to do a one-off catch-up fetch. */
  connected$ = new Subject<void>();

  constructor() {
    this.socket = io(environment.socketUrl, {
      transports: ['websocket', 'polling'], // websocket first; polling only as a connection-establishment fallback, not a data-fetch mechanism
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    this.socket.on('connect', () => this.connected$.next());
    this.socket.on('queue:update', () => this.queueUpdate$.next());
    this.socket.on('ticket:called', (payload) => this.ticketCalled$.next(payload));
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}
