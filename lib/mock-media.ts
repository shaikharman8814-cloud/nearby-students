export const getMockStream = (): MediaStream => {
    // 1. Create Mock Video Track (Canvas Animation)
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    // Create a stream from the canvas
    const stream = canvas.captureStream(30); // 30 FPS

    // Animate the canvas
    let colorHue = 0;
    const draw = () => {
        if (!ctx) return;

        // Background
        ctx.fillStyle = `hsl(${colorHue}, 50%, 50%)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Text
        ctx.fillStyle = 'white';
        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MOCK VIDEO STREAM', canvas.width / 2, canvas.height / 2);

        // Bouncing Ball or Time
        const time = new Date().toLocaleTimeString();
        ctx.font = '30px monospace';
        ctx.fillText(time, canvas.width / 2, canvas.height / 2 + 50);

        colorHue = (colorHue + 1) % 360;
        requestAnimationFrame(draw);
    };
    draw();

    // 2. Create Mock Audio Track (Oscillator)
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const dest = audioCtx.createMediaStreamDestination();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
    oscillator.connect(dest);
    // oscillator.start(); // Disable audio beep to prevent echo/annoyance

    // 3. Combine Tracks
    const audioTrack = dest.stream.getAudioTracks()[0];
    stream.addTrack(audioTrack);

    return stream;
};
