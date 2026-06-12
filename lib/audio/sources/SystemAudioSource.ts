import type { AudioSource, AudioSourceType } from '@/types/audio';

export class SystemAudioSource implements AudioSource {
  readonly type: AudioSourceType = 'system';
  isConnected = false;

  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  async connect(context: AudioContext): Promise<AudioNode> {
    // getDisplayMedia with audio: true captures system/tab audio on supported browsers
    this.stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,  // required by spec even though we only want audio
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    // Stop the video track immediately — we only need the audio
    this.stream.getVideoTracks().forEach((t) => t.stop());

    const audioTracks = this.stream.getAudioTracks();
    if (audioTracks.length === 0) {
      throw new Error(
        'No audio track captured. Make sure to enable "Share audio" in the browser dialog.'
      );
    }

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
