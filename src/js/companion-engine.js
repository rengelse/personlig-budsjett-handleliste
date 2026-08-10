(() => {
  'use strict';

  const SDK_URL = 'https://cdn.jsdelivr.net/gh/steveseguin/ninjasdk@latest/vdoninja-sdk.min.js';
  let sdkPromise = null;

  function loadSdk() {
    if (window.VDONinjaSDK) return Promise.resolve(window.VDONinjaSDK);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => window.VDONinjaSDK
        ? resolve(window.VDONinjaSDK)
        : reject(new Error('Mobilkameratjenesten kunne ikke initialiseres.'));
      script.onerror = () => reject(new Error('Mobilkameratjenesten kunne ikke lastes. Kontroller internettforbindelsen.'));
      document.head.appendChild(script);
    }).catch(error => { sdkPromise = null; throw error; });
    return sdkPromise;
  }

  const randomId = () => {
    const raw = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `pb${raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 30)}`;
  };

  class CompanionEngine {
    constructor({ video, onStatus, onError, onConnected, onDisconnected }) {
      this.video = video;
      this.onStatus = onStatus || (() => {});
      this.onError = onError || (() => {});
      this.onConnected = onConnected || (() => {});
      this.onDisconnected = onDisconnected || (() => {});
      this.sdk = null;
      this.streamId = '';
      this.closed = false;
      this.receivedStream = null;
      this.viewTimer = null;
      this.connected = false;
    }

    async createSession() {
      await this.close();
      this.closed = false;
      this.connected = false;
      this.streamId = randomId();

      const params = new URLSearchParams({
        push: this.streamId,
        webcam: '',
        autostart: '',
        noaudio: '',
        cleanoutput: '',
        quality: '0',
        width: '1920',
        height: '1080',
        fps: '15',
        contenthint: 'detail',
        outboundvideobitrate: '12000',
        maxvideobitrate: '16000',
        scale: '100',
        facing: 'environment',
        label: 'Personal Budget Mobile'
      });
      const pairUrl = `https://vdo.ninja/?${params.toString()}`;

      this.initializeReceiver().catch(error => {
        if (!this.closed) this.onError(error);
      });
      return { pairUrl };
    }

    attachRemoteTrack(event) {
      if (this.closed) return;
      const detail = event?.detail || event || {};
      const track = detail.track;
      if (!track || track.kind !== 'video') return;

      const suppliedStream = Array.isArray(detail.streams) ? detail.streams[0] : null;
      if (suppliedStream instanceof MediaStream) {
        this.receivedStream = suppliedStream;
      } else {
        if (!this.receivedStream) this.receivedStream = new MediaStream();
        if (!this.receivedStream.getTracks().some(existing => existing.id === track.id)) {
          this.receivedStream.addTrack(track);
        }
      }

      this.video.srcObject = this.receivedStream;
      this.video.muted = true;
      this.video.playsInline = true;
      this.video.play().catch(() => {});

      if (!this.connected) {
        this.connected = true;
        clearInterval(this.viewTimer);
        this.viewTimer = null;
        this.onConnected(this.receivedStream);
      }
    }

    async requestView() {
      if (this.closed || !this.sdk || !this.streamId || this.connected) return;
      try {
        await this.sdk.view(this.streamId, {
          audio: false,
          video: true,
          label: 'Personal Budget Desktop'
        });
      } catch (_) {
        // Publisher may not be online yet. The retry loop handles this quietly.
      }
    }

    async initializeReceiver() {
      const SDK = await loadSdk();
      if (this.closed) throw new Error('Kameratilkoblingen ble avbrutt.');

      const sdk = new SDK({ debug: false, autoRecover: true, autoRelay: true });
      this.sdk = sdk;

      sdk.addEventListener('track', event => this.attachRemoteTrack(event));
      sdk.addEventListener('peerDisconnected', () => {
        if (this.closed) return;
        this.connected = false;
        this.resetVideo();
        this.onDisconnected();
        this.startViewRetries();
      });
      sdk.addEventListener('error', event => {
        const error = event?.detail?.error || event?.detail;
        const message = String(error?.message || error || '');
        if (!this.closed && !/not found|no publisher|timeout/i.test(message)) {
          this.onError(error || new Error('Kunne ikke koble til mobilkamera.'));
        }
      });

      this.onStatus('Oppretter sikker kameratilkobling …');
      await sdk.connect();
      if (this.closed) throw new Error('Kameratilkoblingen ble avbrutt.');
      this.startViewRetries();
    }

    startViewRetries() {
      clearInterval(this.viewTimer);
      this.viewTimer = null;
      this.requestView();
      this.viewTimer = setInterval(() => this.requestView(), 2000);
    }

    resetVideo() {
      if (this.video) {
        this.video.pause?.();
        this.video.srcObject = null;
      }
      this.receivedStream = null;
    }

    async close() {
      this.closed = true;
      this.connected = false;
      clearInterval(this.viewTimer);
      this.viewTimer = null;
      this.resetVideo();
      const sdk = this.sdk;
      const streamId = this.streamId;
      this.sdk = null;
      this.streamId = '';
      if (sdk) {
        try { await sdk.stopViewing?.(streamId); } catch (_) {}
        try { await sdk.disconnect?.(); } catch (_) {}
      }
    }
  }

  window.CompanionEngine = CompanionEngine;
})();
