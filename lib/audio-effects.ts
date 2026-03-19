export class AudioProcessor {
    private audioContext: AudioContext | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private filter: BiquadFilterNode | null = null;
    private destination: MediaStreamAudioDestinationNode | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.audioContext = new AudioContextClass();
            }
        }
    }

    processStream(stream: MediaStream, enableLofi: boolean): MediaStream {
        if (!this.audioContext || !stream.getAudioTracks().length) return stream;

        // Clean up previous nodes if re-processing
        this.cleanup();

        try {
            this.source = this.audioContext.createMediaStreamSource(stream);
            this.destination = this.audioContext.createMediaStreamDestination();

            if (enableLofi) {
                // Create Lofi Filter (Low-pass)
                this.filter = this.audioContext.createBiquadFilter();
                this.filter.type = 'lowpass';
                this.filter.frequency.value = 1000; // 1kHz cutoff for muffled sound
                this.filter.Q.value = 0.5; // Smooth rolloff

                // Connect: Source -> Filter -> Destination
                this.source.connect(this.filter);
                this.filter.connect(this.destination);
            } else {
                // Passthrough: Source -> Destination
                this.source.connect(this.destination);
            }

            // Combine processed audio with original video
            const processedAudioTracks = this.destination.stream.getAudioTracks();
            const originalVideoTracks = stream.getVideoTracks();

            const finalStream = new MediaStream([
                ...processedAudioTracks,
                ...originalVideoTracks
            ]);

            return finalStream;
        } catch (error) {
            console.warn("Audio processing failed", error);
            return stream;
        }
    }

    cleanup() {
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        if (this.filter) {
            this.filter.disconnect();
            this.filter = null;
        }
        // Don't close context typically, just disconnect nodes
    }
}
