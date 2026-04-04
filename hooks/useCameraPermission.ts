import { useState, useEffect, useCallback } from 'react';

type PermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

interface UseCameraPermissionReturn {
  isIos: boolean;
  permissionState: PermissionState;
  requestPermission: () => Promise<void>;
}

export function useCameraPermission(): UseCameraPermissionReturn {
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const isIos = typeof DeviceMotionEvent !== 'undefined'
    && typeof (DeviceMotionEvent as unknown as { requestPermission?: unknown }).requestPermission === 'function';

  const requestPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState('unsupported');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Immediately stop the stream — we only needed the permission prompt
      stream.getTracks().forEach(track => track.stop());
      setPermissionState('granted');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setPermissionState('denied');
      } else {
        setPermissionState('unsupported');
      }
    }
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState('unsupported');
      return;
    }
    // On non-iOS, request permission automatically on mount
    if (!isIos) {
      requestPermission();
    }
  }, [isIos, requestPermission]);

  return { isIos, permissionState, requestPermission };
}
