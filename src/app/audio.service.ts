import { Injectable } from '@angular/core';
import { NativeAudio } from '@capgo/native-audio';
import { Platform } from '@ionic/angular';

enum MediaStatus {
  MEDIA_NONE = 0,
  MEDIA_STARTING = 1,
  MEDIA_RUNNING = 2,
  MEDIA_PAUSED = 3,
  MEDIA_STOPPED = 4
}

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private currentAudioId: string | null = null;
  currentSelected: number = 0;
  nowPlaying = MediaStatus.MEDIA_NONE;
  private preloadedAudios = new Set<string>();

  // MediaStatus enum을 외부에서 접근할 수 있도록 public 속성으로 노출
  readonly MEDIA_NONE = MediaStatus.MEDIA_NONE;
  readonly MEDIA_STARTING = MediaStatus.MEDIA_STARTING;
  readonly MEDIA_RUNNING = MediaStatus.MEDIA_RUNNING;
  readonly MEDIA_PAUSED = MediaStatus.MEDIA_PAUSED;
  readonly MEDIA_STOPPED = MediaStatus.MEDIA_STOPPED;

  constructor(private platform: Platform) { }

  createMediaUrl(folderName: string, fileName: string): string {
    let retValue: string;

    if (this.platform.is('ios') || this.platform.is('android')) {
      // For Capacitor, use relative path from public/assets
      retValue = `public/assets/audio/${folderName}/${fileName}`;
    } else {
      // For web/browser
      retValue = `assets/audio/${folderName}/${fileName}`;
    }

    console.log('mediaPath', retValue);
    return retValue;
  }

  private generateAudioId(url: string): string {
    return url.replace(/[^a-zA-Z0-9]/g, '_');
  }

  async play(url: string): Promise<void> {
    console.log('Playing audio:', url);

    try {
      // Stop current audio if playing
      if (this.currentAudioId) {
        await this.stop();
      }

      const audioId = this.generateAudioId(url);

      // Preload audio if not already preloaded
      if (!this.preloadedAudios.has(audioId)) {
        await NativeAudio.preload({
          assetId: audioId,
          assetPath: url,
          audioChannelNum: 1,
          isUrl: false
        });
        this.preloadedAudios.add(audioId);
      }

      // Play with loop
      await NativeAudio.loop({
        assetId: audioId
      });

      this.currentAudioId = audioId;
      this.nowPlaying = MediaStatus.MEDIA_RUNNING;
      console.log('Sound playing:', url);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.nowPlaying = MediaStatus.MEDIA_NONE;
    }
  }

  async stop(): Promise<void> {
    if (this.currentAudioId) {
      try {
        await NativeAudio.stop({
          assetId: this.currentAudioId
        });

        // Unload the audio to free resources
        await NativeAudio.unload({
          assetId: this.currentAudioId
        });

        this.preloadedAudios.delete(this.currentAudioId);
        this.nowPlaying = MediaStatus.MEDIA_STOPPED;
        console.log('Sound stopped.');

        this.currentAudioId = null;
        this.nowPlaying = MediaStatus.MEDIA_NONE;
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
    }
  }

  async pause(): Promise<void> {
    if (this.currentAudioId) {
      try {
        await NativeAudio.pause({
          assetId: this.currentAudioId
        });
        this.nowPlaying = MediaStatus.MEDIA_PAUSED;
        console.log('Sound paused.');
      } catch (error) {
        console.error('Error pausing audio:', error);
      }
    }
  }

  async resume(): Promise<void> {
    if (this.currentAudioId) {
      try {
        await NativeAudio.resume({
          assetId: this.currentAudioId
        });
        this.nowPlaying = MediaStatus.MEDIA_RUNNING;
        console.log('Sound resumed.');
      } catch (error) {
        console.error('Error resuming audio:', error);
      }
    }
  }
}
