export class RingtoneManager {
    private audioContext: AudioContext | null = null;
    private oscillator: OscillatorNode | null = null;
    private gainNode: GainNode | null = null;
    private intervalId: NodeJS.Timeout | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.audioContext = new AudioContextClass();
            }
        }
    }

    private initContext() {
        if (!this.audioContext && typeof window !== 'undefined') {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.audioContext = new AudioContextClass();
            }
        }
        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    playOutgoing() {
        this.stop();
        this.initContext();
        if (!this.audioContext) return;

        // Play a "dialing" tone (425Hz + 400Hz for US/EU standard mix, or just 440Hz)
        // Let's do a simple recurring beep
        const playBeep = () => {
            if (!this.audioContext) return;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.frequency.value = 440; // A4
            gain.gain.value = 0.1;

            osc.start();
            osc.stop(this.audioContext.currentTime + 1.0); // 1 second beep
        };

        playBeep();
        this.intervalId = setInterval(playBeep, 4000); // Repeat every 4 seconds
    }

    playIncoming() {
        this.stop();
        this.initContext();
        if (!this.audioContext) return;

        // Classic phone ring effect (two short pulses)
        const playRing = () => {
            if (!this.audioContext) return;
            const now = this.audioContext.currentTime;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.frequency.value = 800; // sharper ring

            // Pulse 1
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
            gain.gain.linearRampToValueAtTime(0, now + 1.0);

            // Pulse 2 (optional, keeping it simple for now)

            osc.start(now);
            osc.stop(now + 2.0);
        };

        playRing();
        this.intervalId = setInterval(playRing, 3000);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator.disconnect();
            this.oscillator = null;
        }
    }
}


export const ringtoneManager = new RingtoneManager();

// --- Phase 3: Audio Visualizer & Filters ---

export class AudioAnalyzer {
    private context: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private dataArray: Uint8Array | null = null;
    private stream: MediaStream | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.context = new AudioContextClass();
            }
        }
    }

    connect(stream: MediaStream) {
        if (!this.context) return;

        // Prevent reconnecting same stream
        if (this.stream === stream) return;
        this.stream = stream;

        try {
            if (this.context.state === 'suspended') {
                this.context.resume();
            }

            // Clean up old graph
            if (this.source) {
                this.source.disconnect();
                this.source = null;
            }

            this.analyser = this.context.createAnalyser();
            this.analyser.fftSize = 64; // 32 bins
            this.analyser.smoothingTimeConstant = 0.5; // Smooth animations

            this.source = this.context.createMediaStreamSource(stream);
            this.source.connect(this.analyser);

            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
        } catch (e) {
            console.error("AudioAnalyzer connect error:", e);
        }
    }

    disconnect() {
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        this.stream = null;
    }

    getFrequencyData(): Uint8Array | null {
        if (!this.analyser || !this.dataArray) return null;
        this.analyser.getByteFrequencyData(this.dataArray as any);
        return this.dataArray;
    }
}

