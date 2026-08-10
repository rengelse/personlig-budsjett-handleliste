(() => {
  'use strict';

  const EAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
  const clean = value => String(value || '').replace(/\D/g, '');

  function isValid(value) {
    return [8, 12, 13].includes(clean(value).length);
  }

  function toStandardProduct(product = {}) {
    return {
      productId: product.id ?? product.productId ?? null,
      ean: clean(product.ean),
      name: product.eName || product.name || 'Ukjent produkt',
      brand: product.brand || '',
      category: product.category || 'Dagligvare',
      image: product.image || '',
      store: product.store || '',
      storeCode: product.storeCode || '',
      price: Number(product.price) || 0,
      unitPrice: Number(product.unitPrice) || 0,
      packageQuantity: Number(product.packageSize || product.packageQuantity) || 1,
      packageUnit: product.unit || product.packageUnit || 'stk',
      raw: product
    };
  }

  async function lookup(ean) {
    const code = clean(ean);
    if (!isValid(code)) throw new Error('Ugyldig strekkode.');

    const raw = await window.budgetApp.kassal.getProductByEan(code);
    const products = PricingEngine.normalizeProducts(raw);
    let product = products[0] || null;
    if (!product) throw new Error('Produktet ble ikke funnet i Kassalapp.');

    if (!(PricingEngine.number(product.price) > 0)) {
      product = (await PricingEngine.enrichProducts([product], {
        pricesBulk: payload => window.budgetApp.kassal.pricesBulk(payload),
        getProductById: id => window.budgetApp.kassal.getProductById(id),
        normalize: payload => PricingEngine.normalizeProducts(payload)
      }))[0] || product;
    }

    const standard = toStandardProduct(product);
    standard.priceOptions = products
      .map(toStandardProduct)
      .filter(option => option.store || option.price > 0)
      .sort((a, b) => {
        const ap = a.price > 0 ? a.price : Number.POSITIVE_INFINITY;
        const bp = b.price > 0 ? b.price : Number.POSITIVE_INFINITY;
        return ap - bp || String(a.store).localeCompare(String(b.store), 'nb');
      });
    return standard;
  }

  function hasZxing() {
    return Boolean(window.ZXingBrowser?.BrowserMultiFormatReader);
  }

  function hasNativeDetector() {
    return Boolean(window.BarcodeDetector);
  }

  function supported() {
    return Boolean(navigator.mediaDevices?.getUserMedia && (hasZxing() || hasNativeDetector()));
  }

  function isRoutineDecodeMiss(error) {
    const name = String(error?.name || '');
    const message = String(error?.message || error || '').toLowerCase();
    return ['NotFoundException', 'ChecksumException', 'FormatException'].includes(name)
      || message.includes('no multiformat readers were able to detect the code')
      || message.includes('not found')
      || message.includes('checksum')
      || message.includes('format exception');
  }

  async function improveCameraFocus(video) {
    const track = video?.srcObject?.getVideoTracks?.()[0];
    if (!track?.applyConstraints) return;
    const capabilities = track.getCapabilities?.() || {};
    const advanced = [];
    if (Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) {
      advanced.push({ focusMode: 'continuous' });
    }
    if (Array.isArray(capabilities.exposureMode) && capabilities.exposureMode.includes('continuous')) {
      advanced.push({ exposureMode: 'continuous' });
    }
    if (advanced.length) await track.applyConstraints({ advanced }).catch(() => {});
  }

  async function startWithZxing(video, onCode, onError) {
    const reader = new window.ZXingBrowser.BrowserMultiFormatReader(undefined, {
      delayBetweenScanAttempts: 90,
      delayBetweenScanSuccess: 700
    });
    let controls = null;
    let stopped = false;
    let last = '';
    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920, min: 640 },
        height: { ideal: 1080, min: 480 }
      }
    };

    controls = await reader.decodeFromConstraints(constraints, video, (result, error) => {
      if (stopped) return;
      if (result) {
        const code = clean(result.getText ? result.getText() : result.text);
        if (code && code !== last && isValid(code)) {
          last = code;
          onCode(code);
        }
      } else if (error && !isRoutineDecodeMiss(error)) {
        onError?.(error);
      }
    });
    await improveCameraFocus(video);

    return () => {
      stopped = true;
      try { controls?.stop?.(); } catch (_) {}
      try { reader?.reset?.(); } catch (_) {}
      const stream = video.srcObject;
      if (stream?.getTracks) stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    };
  }

  async function startWithNativeDetector(video, onCode, onError) {
    const available = await window.BarcodeDetector.getSupportedFormats().catch(() => EAN_FORMATS);
    const detector = new window.BarcodeDetector({ formats: EAN_FORMATS.filter(format => available.includes(format)) });
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    video.srcObject = stream;
    await video.play();

    let stopped = false;
    let last = '';
    const tick = async () => {
      if (stopped) return;
      try {
        const codes = await detector.detect(video);
        const code = clean(codes?.[0]?.rawValue);
        if (code && code !== last && isValid(code)) {
          last = code;
          onCode(code);
          return;
        }
      } catch (error) {
        onError?.(error);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    return () => {
      stopped = true;
      stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    };
  }

  async function start(video, onCode, onError) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Kamera er ikke tilgjengelig på denne enheten.');
    }
    if (hasZxing()) return startWithZxing(video, onCode, onError);
    if (hasNativeDetector()) return startWithNativeDetector(video, onCode, onError);
    throw new Error('Strekkodeleseren kunne ikke lastes. Kontroller nettilkoblingen eller bruk EAN-feltet.');
  }

  async function startFromVideo(video, onCode, onError, options = {}) {
    if (!video) throw new Error('Videostrøm mangler.');
    let stopped = false;
    let last = '';
    let reader = null;
    let detector = null;
    let timer = null;
    let canvas = null;
    let context = null;

    const region = {
      widthRatio: Math.min(0.92, Math.max(0.35, Number(options.widthRatio) || 0.82)),
      heightRatio: Math.min(0.65, Math.max(0.18, Number(options.heightRatio) || 0.34))
    };

    if (hasZxing()) reader = new window.ZXingBrowser.BrowserMultiFormatReader(undefined, {
      delayBetweenScanAttempts: 70,
      delayBetweenScanSuccess: 700
    });
    else if (hasNativeDetector()) {
      const available = await window.BarcodeDetector.getSupportedFormats().catch(() => EAN_FORMATS);
      detector = new window.BarcodeDetector({ formats: EAN_FORMATS.filter(format => available.includes(format)) });
    } else throw new Error('Strekkodeleseren kunne ikke lastes.');

    function prepareScanRegion(scale = 1, fullFrame = false) {
      const sourceWidth = video.videoWidth || 0;
      const sourceHeight = video.videoHeight || 0;
      if (!sourceWidth || !sourceHeight) return null;

      const cropWidth = fullFrame ? sourceWidth : Math.max(320, Math.floor(sourceWidth * region.widthRatio));
      const cropHeight = fullFrame ? sourceHeight : Math.max(120, Math.floor(sourceHeight * region.heightRatio));
      const sourceX = fullFrame ? 0 : Math.max(0, Math.floor((sourceWidth - cropWidth) / 2));
      const sourceY = fullFrame ? 0 : Math.max(0, Math.floor((sourceHeight - cropHeight) / 2));
      const targetWidth = Math.max(320, Math.floor(cropWidth * scale));
      const targetHeight = Math.max(120, Math.floor(cropHeight * scale));

      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        context = canvas.getContext('2d', { willReadFrequently: true });
      }
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      context.imageSmoothingEnabled = false;
      context.drawImage(video, sourceX, sourceY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);

      const imageData = context.getImageData(0, 0, targetWidth, targetHeight);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
        const contrasted = Math.max(0, Math.min(255, ((gray - 128) * 1.65) + 128));
        data[i] = contrasted;
        data[i + 1] = contrasted;
        data[i + 2] = contrasted;
      }
      context.putImageData(imageData, 0, 0);
      return canvas;
    }

    async function decodeCanvas(scanCanvas) {
      if (reader) {
        if (typeof reader.decodeFromCanvas === 'function') return reader.decodeFromCanvas(scanCanvas);
        if (typeof reader.decodeFromCanvasElement === 'function') return reader.decodeFromCanvasElement(scanCanvas);
        if (typeof reader.decodeFromImageElement === 'function') {
          const image = new Image();
          image.src = scanCanvas.toDataURL('image/jpeg', 0.92);
          await image.decode();
          return reader.decodeFromImageElement(image);
        }
      }
      if (detector) return (await detector.detect(scanCanvas))?.[0] || null;
      return null;
    }

    const scan = async () => {
      if (stopped) return;
      try {
        let code = '';
        if (video.readyState >= 2) {
          const passes = [
            prepareScanRegion(2.4, false),
            prepareScanRegion(1.5, false),
            prepareScanRegion(1, false),
            prepareScanRegion(0.75, true)
          ].filter(Boolean);
          for (const scanCanvas of passes) {
            const result = await decodeCanvas(scanCanvas).catch(error => {
              if (!isRoutineDecodeMiss(error)) throw error;
              return null;
            });
            code = clean(result?.getText ? result.getText() : result?.text || result?.rawValue);
            if (code && isValid(code)) break;
          }
        }
        if (code && code !== last && isValid(code)) {
          last = code;
          onCode(code);
          return;
        }
      } catch (error) {
        if (!isRoutineDecodeMiss(error)) onError?.(error);
      }
      if (!stopped) timer = setTimeout(scan, 90);
    };
    timer = setTimeout(scan, 200);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      try { reader?.reset?.(); } catch (_) {}
      canvas = null;
      context = null;
    };
  }

  async function startQr(video, onText, onError, options = {}) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Kamera er ikke tilgjengelig på denne PC-en.');
    let stopped = false;
    let last = '';
    let reader = null;
    let detector = null;
    let controls = null;
    let stream = null;
    const selectedDeviceId = String(options?.deviceId || '').trim();
    const videoConstraints = selectedDeviceId
      ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
      : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } };

    const emit = value => {
      const text = String(value || '').trim();
      if (!text || text === last) return;
      last = text;
      onText?.(text);
    };

    if (hasZxing()) {
      reader = new window.ZXingBrowser.BrowserMultiFormatReader(undefined, {
        delayBetweenScanAttempts: 90,
        delayBetweenScanSuccess: 900
      });
      controls = await reader.decodeFromConstraints({
        audio: false,
        video: videoConstraints
      }, video, (result, error) => {
        if (stopped) return;
        if (result) emit(result.getText ? result.getText() : result.text);
        else if (error && !isRoutineDecodeMiss(error)) onError?.(error);
      });
      await improveCameraFocus(video);
      return () => {
        stopped = true;
        try { controls?.stop?.(); } catch (_) {}
        try { reader?.reset?.(); } catch (_) {}
        const active = video.srcObject;
        if (active?.getTracks) active.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      };
    }

    if (hasNativeDetector()) {
      const available = await window.BarcodeDetector.getSupportedFormats().catch(() => []);
      if (!available.includes('qr_code')) throw new Error('QR-lesing støttes ikke av kameraet/nettlesermotoren på denne PC-en.');
      detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
      video.srcObject = stream;
      await video.play();
      const tick = async () => {
        if (stopped) return;
        try {
          const codes = await detector.detect(video);
          if (codes?.[0]?.rawValue) emit(codes[0].rawValue);
        } catch (error) { onError?.(error); }
        if (!stopped) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      return () => {
        stopped = true;
        stream?.getTracks?.().forEach(track => track.stop());
        video.srcObject = null;
      };
    }

    throw new Error('QR-leseren kunne ikke startes.');
  }

  window.BarcodeEngine = { clean, isValid, toStandardProduct, lookup, supported, start, startFromVideo, startQr };
})();
