import type { AudioSource, AudioSourceType } from '@/types/audio';

export class MicrophoneSource implements AudioSource {
  readonly type: AudioSourceType = 'microphone';
  isConnected = false;

  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  async connect(context: AudioContext): Promise<AudioNode> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    this.sourceNode = context.createMediaStreamSource(this.stream);
    this.isConnected = true;
    return this.sourceNode;
  }

  disconnect() {
    this.sourceNode?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.isConnected = false;
  }
}
