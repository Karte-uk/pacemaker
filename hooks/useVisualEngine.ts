'use client';
import { useEffect, useRef, useCallback } from 'react';
import { VisualEngine } from '@/lib/visual/VisualEngine';
import type { AudioAnalysisData } from '@/types/audio';
import type { SceneConfig, SceneType } from '@/types/visual';

export function useVisualEngine(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const engineRef = useRef<VisualEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new VisualEngine();
    engineRef.current = engine;
    engine.init(canvas);

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      engine.resize(Math.round(w * dpr), Math.round(h * dpr));
    };
    handleResize();

    const ro = new ResizeObserver(handleResize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      ro.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, [canvasRef]);

  const render = useCallback((analysis: AudioAnalysisData) => {
    engineRef.current?.render(analysis);
  }, []);

  const setScene = useCallback((type: SceneType) => {
    engineRef.current?.setScene(type);
  }, []);

  const updateConfig = useCallback((partial: Partial<SceneConfig>) => {
    engineRef.current?.updateConfig(partial);
  }, []);

  return { render, setScene, updateConfig };
}
