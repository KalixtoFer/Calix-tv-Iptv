import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativePlayOptions {
  url: string;
  title?: string;
  /** posición inicial en milisegundos */
  startTime?: number;
}

export interface NativePlayResult {
  /** posición al cerrar, en milisegundos */
  position: number;
  /** duración total, en milisegundos */
  duration: number;
}

export interface NativePlayerPlugin {
  play(options: NativePlayOptions): Promise<NativePlayResult>;
  installApk?(options: { url: string; filename?: string }): Promise<{ success: boolean; downloadId?: number; message?: string }>;
}

export const NativePlayer = registerPlugin<NativePlayerPlugin>('NativePlayer');

/** true solo dentro del APK, cuando el plugin nativo está instalado */
export const canUseNativePlayer = (): boolean => {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('NativePlayer');
  } catch {
    return false;
  }
};
