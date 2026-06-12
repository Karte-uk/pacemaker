'use client';
import { useEffect, useRef } from 'react';
import { useVisualEngine } from '@/hooks/useVisualEngine';
import type { AudioAnalysisData } from '@/types/audio';
import type { SceneConfig, SceneType } from '@/types/visual';

interface Props {
  analysis: AudioAnalysisData;
  scene: SceneType;
  config: SceneConfig;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export function Visualizer({ analysis, scene, config, canvasRef: externalRef }: Props) {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalRef ?? internalRef;

  const { render, setScene, updateConfig } = useVisualEngine(canvasRef);

  useEffect(() => { setScene(scene); }, [scene, setScene]);
  useEffect(() => { updateConfig(config); }, [config, updateConfig]);
  useEffect(() => { render(analysis); }, [analysis, render]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ display: 'block' }}
    />
  );
}
