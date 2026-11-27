import QRCode from 'qrcode';
import { DogRecord } from '../data/registryData';
import { useState, useEffect } from 'react';

/**
 * Builds the canonical public verification URL for a given dog/pedigree.
 * When scanned, this redirects to the INBR public microchip verification view.
 */
export function getMicrochipVerificationUrl(dog: { microchip?: string; regNumber?: string }): string {
  const code = (dog.microchip || dog.regNumber || '').trim();
  
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    // Keep pathname clean (e.g. '/' or base path)
    const pathname = window.location.pathname || '/';
    const cleanPath = pathname.endsWith('/') ? pathname : `${pathname}/`;
    return `${origin}${cleanPath}?verify=${encodeURIComponent(code)}#verificacion`;
  }
  
  return `https://inbr-registry.org/?verify=${encodeURIComponent(code)}#verificacion`;
}

/**
 * Generates a high-resolution base64 PNG data URL of the QR code.
 */
export async function generateQrCodeDataUrl(
  text: string, 
  options?: QRCode.QRCodeToDataURLOptions
): Promise<string> {
  if (!text) return '';
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 320,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      ...options,
    });
  } catch (err) {
    console.error('Error generating QR code data URL:', err);
    return '';
  }
}

// In-memory cache for fast reuse without re-rendering delays
const qrCodeCache = new Map<string, string>();

/**
 * Synchronous or cached retrieval helper
 */
export function getCachedQrCode(code: string): string | undefined {
  return qrCodeCache.get(code);
}

/**
 * Pre-warms or generates the QR code and stores in cache
 */
export async function ensureQrCodeCached(dog: { microchip?: string; regNumber?: string }): Promise<string> {
  const url = getMicrochipVerificationUrl(dog);
  if (qrCodeCache.has(url)) {
    return qrCodeCache.get(url)!;
  }
  const dataUrl = await generateQrCodeDataUrl(url);
  if (dataUrl) {
    qrCodeCache.set(url, dataUrl);
  }
  return dataUrl;
}

/**
 * Custom React Hook to load and watch a pedigree's unique QR code
 */
export function useDogQrCode(dog?: DogRecord | null) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [verificationUrl, setVerificationUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    if (!dog) {
      setQrDataUrl('');
      setVerificationUrl('');
      setIsLoading(false);
      return;
    }

    const url = getMicrochipVerificationUrl(dog);
    setVerificationUrl(url);

    if (qrCodeCache.has(url)) {
      setQrDataUrl(qrCodeCache.get(url)!);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    generateQrCodeDataUrl(url)
      .then((dataUrl) => {
        if (!isMounted) return;
        if (dataUrl) {
          qrCodeCache.set(url, dataUrl);
          setQrDataUrl(dataUrl);
        }
      })
      .catch((err) => {
        console.error('Failed to generate dog QR code:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dog?.microchip, dog?.regNumber]);

  return { qrDataUrl, verificationUrl, isLoading };
}
