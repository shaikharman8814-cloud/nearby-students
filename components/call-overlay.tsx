import { useEffect, useRef, useState, useMemo } from 'react';
import { useCall } from '@/lib/call-context';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Phone, ShieldAlert, MessageSquareDashed, Send, VenetianMask, Minimize2, Maximize2, Music, Waves } from 'lucide-react';
import { CallRating } from './call-rating';
import { AudioVisualizer } from './audio-visualizer';
import { AudioProcessor } from '@/lib/audio-effects';

export function CallOverlay() {
    const {
        callState,
        callerInfo,
        localStream,
        remoteStream,
        acceptCall,
        rejectCall,
        endCall,
        emergencyEndCall,
        sendWhisper,
        toggleMute,
        toggleVideo,
        isMuted,
        isVideoEnabled,
        isAnonymousMode,
        error
    } = useCall();

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const [showRating, setShowRating] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [showWhisper, setShowWhisper] = useState(false);
    const [whisperText, setWhisperText] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [isLofiMode, setIsLofiMode] = useState(false); // Lofi State
    const startTimeRef = useRef<number>(0);

    const audioProcessor = useMemo(() => new AudioProcessor(), []);

    // Sync refs - Force Play for Safari
    useEffect(() => {
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(e => console.warn("Local video play failed:", e));
        }
    }, [localStream, isVideoEnabled]);

    // Remote Stream + Lofi Processing
    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            // Process the stream based on Lofi Mode
            try {
                const finalStream = audioProcessor.processStream(remoteStream, isLofiMode);
                remoteVideoRef.current.srcObject = finalStream;
                remoteVideoRef.current.play().catch(e => {
                    if (e.name === 'AbortError') return;
                    console.warn("Remote play error:", e);
                });
            } catch (err) {
                console.warn("Error setting up audio stream:", err);
                remoteVideoRef.current.srcObject = remoteStream; // Fallback
            }
        }
        return () => audioProcessor.cleanup();
    }, [remoteStream, isLofiMode]);

    // Track duration start when connected
    useEffect(() => {
        if (callState === 'incall') {
            startTimeRef.current = Date.now();
        }
    }, [callState]);

    const handleEndCall = () => {
        audioProcessor.cleanup();
        const duration = (Date.now() - startTimeRef.current) / 1000;
        setCallDuration(duration);
        endCall();

        if (duration > 15) {
            setShowRating(true);
        }
    };

    const handleEmergency = () => {
        if (confirm("End call immediately and report?")) {
            emergencyEndCall();
        }
    };

    const handleSendWhisper = (e: React.FormEvent) => {
        e.preventDefault();
        if (!whisperText.trim()) return;
        sendWhisper(whisperText);
        setWhisperText('');
        setShowWhisper(false);
    };

    if (showRating) {
        return <CallRating duration={callDuration} onClose={() => setShowRating(false)} />;
    }

    if (callState === 'idle') return null;

    if (callState === 'incoming') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in">
                <div className="flex flex-col items-center gap-8 text-white">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-zinc-800 shadow-2xl animate-pulse bg-zinc-800 flex items-center justify-center">
                            {callerInfo?.isAnonymous ? (
                                <VenetianMask className="w-16 h-16 text-zinc-500" />
                            ) : (
                                <img
                                    src={`https://api.dicebear.com/7.x/notionists/svg?seed=${callerInfo?.name || 'User'}`}
                                    alt="Caller"
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold">{callerInfo?.name || 'Unknown Caller'}</h2>
                        <p className="text-zinc-400">Incoming {callerInfo?.isAnonymous ? 'Anonymous ' : ''}Video Call...</p>
                    </div>
                    <div className="flex items-center gap-8 mt-4">
                        <button onClick={rejectCall} className="flex flex-col items-center gap-2 group">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center group-hover:bg-red-500/40 transition-colors border border-red-500/50">
                                <PhoneOff className="w-8 h-8 text-red-500 fill-current" />
                            </div>
                            <span className="text-sm font-medium text-zinc-400">Decline</span>
                        </button>

                        <button onClick={acceptCall} className="flex flex-col items-center gap-2 group">
                            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform animate-bounce">
                                <Phone className="w-10 h-10 text-white fill-current" />
                            </div>
                            <span className="text-sm font-medium text-white">Accept</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (callState === 'calling') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
                <div className="flex flex-col items-center gap-10 text-white animate-in zoom-in-50 duration-300">
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center relative">
                            {/* Pulse Effect */}
                            <div className="absolute inset-0 rounded-full border-4 border-zinc-700 animate-ping opacity-20"></div>

                            {callerInfo?.isAnonymous ? (
                                <VenetianMask className="w-12 h-12 text-zinc-500 relative z-10" />
                            ) : (
                                <img
                                    src={`https://api.dicebear.com/7.x/notionists/svg?seed=${callerInfo?.name || 'User'}`}
                                    alt="Caller"
                                    className="w-full h-full object-cover rounded-full relative z-10"
                                />
                            )}
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-xl font-medium">Calling {callerInfo?.name}...</p>
                            <p className="text-sm text-zinc-500">Waiting for response</p>
                        </div>
                    </div>

                    {/* Cancel Button */}
                    <button
                        onClick={endCall}
                        className="flex flex-col items-center gap-2 group cursor-pointer"
                    >
                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-600/20 group-hover:bg-red-700 group-active:scale-95 transition-all">
                            <PhoneOff className="w-8 h-8 text-white fill-current" />
                        </div>
                        <span className="text-sm font-medium text-zinc-400 group-hover:text-white transition-colors">Cancel</span>
                    </button>
                </div>
            </div>
        );
    }

    const remoteHasVideo = remoteStream && remoteStream.getVideoTracks().length > 0 && remoteStream.getVideoTracks()[0].enabled;

    if (isMinimized) {
        return (
            <div className="fixed bottom-24 right-4 z-50 w-48 h-64 bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden group transition-all hover:scale-105">
                <video
                    ref={remoteVideoRef}
                    className={`absolute inset-0 w-full h-full object-cover ${!remoteHasVideo ? 'hidden' : ''}`}
                    autoPlay
                    playsInline
                />
                {!remoteHasVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                        {callerInfo?.isAnonymous ? (
                            <VenetianMask className="w-12 h-12 text-zinc-600" />
                        ) : (
                            <img
                                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${callerInfo?.name || 'User'}`}
                                alt="Caller"
                                className="w-20 h-20 rounded-full object-cover"
                            />
                        )}
                        <div className="absolute bottom-0 w-full h-12 opacity-50">
                            <AudioVisualizer stream={remoteStream} />
                        </div>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                    <button onClick={() => setIsMinimized(false)} className="p-2 bg-white/20 rounded-full hover:bg-white/40 backdrop-blur-md">
                        <Maximize2 className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex gap-2">
                        <button onClick={toggleMute} className={`p-2 rounded-full ${isMuted ? 'bg-white text-black' : 'bg-zinc-800 text-white'}`}>
                            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                        <button onClick={handleEndCall} className="p-2 rounded-full bg-red-600 text-white">
                            <PhoneOff className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="absolute top-6 right-6 z-20">
                <button
                    onClick={() => setIsMinimized(true)}
                    className="p-3 bg-zinc-900/50 backdrop-blur-md rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5 transition-colors"
                >
                    <Minimize2 className="w-6 h-6" />
                </button>
            </div>

            {error && (
                <div className="absolute top-10 bg-red-600 p-4 rounded-xl z-50 animate-bounce">
                    {error}
                    <button onClick={endCall} className="text-xs underline mt-2">Close</button>
                </div>
            )}

            <video
                ref={remoteVideoRef}
                className={`absolute inset-0 w-full h-full object-cover ${!remoteHasVideo ? 'hidden' : ''}`}
                autoPlay
                playsInline
            />

            {!remoteHasVideo && (
                <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-zinc-950">
                    <div className="w-48 h-48 rounded-full bg-zinc-900 border-4 border-zinc-800 flex items-center justify-center mb-8 relative overflow-hidden">
                        {callerInfo?.isAnonymous ? (
                            <VenetianMask className="w-24 h-24 text-zinc-600 relative z-10" />
                        ) : (
                            <img
                                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${callerInfo?.name || 'User'}`}
                                alt="Caller"
                                className="w-full h-full object-cover relative z-10"
                            />
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-1/2 opacity-50 z-0">
                            <AudioVisualizer stream={remoteStream} />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-zinc-300">{callerInfo?.name}</h3>
                    <div className="flex items-center gap-2 mb-8">
                        <span className="text-zinc-500">{(remoteHasVideo || isVideoEnabled) ? 'Video Call' : 'Voice Call'}</span>
                        {isLofiMode ? (
                            <span className="text-purple-400 flex items-center gap-1 text-sm bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                                <Waves className="w-3 h-3" /> Lofi Vibe
                            </span>
                        ) : (
                            <span className="text-purple-400 flex items-center gap-1 text-sm bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" /> Focus Mode
                            </span>
                        )}
                    </div>

                    <div className="w-full max-w-md h-32 px-8">
                        <AudioVisualizer stream={remoteStream} />
                    </div>
                </div>
            )}

            <div className="absolute top-4 right-4 w-32 h-48 bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group mt-16">
                <video
                    ref={localVideoRef}
                    muted
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                />
                {!isVideoEnabled && (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                        <VideoOff className="w-8 h-8 text-zinc-500" />
                    </div>
                )}

                {isAnonymousMode && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-2 border-2 border-purple-500/50 rounded-2xl">
                        <VenetianMask className="w-8 h-8 text-purple-400 mb-1" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">You are Hidden</span>
                    </div>
                )}

                {isMuted && (
                    <div className="absolute bottom-2 right-2 bg-red-500 p-1.5 rounded-full">
                        <MicOff className="w-3 h-3 text-white" />
                    </div>
                )}
            </div>

            <div className="absolute top-6 left-6 z-10 flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
                {callerInfo?.isAnonymous && <VenetianMask className="w-4 h-4 text-zinc-400" />}
                <span className="font-medium text-white shadow-sm">{callerInfo?.name}</span>
            </div>

            {showWhisper && (
                <div className="absolute bottom-32 left-0 right-0 px-8 flex justify-center z-30 animate-in slide-in-from-bottom-5">
                    <form onSubmit={handleSendWhisper} className="w-full max-w-md flex gap-2">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Type to whisper..."
                            value={whisperText}
                            onChange={(e) => setWhisperText(e.target.value)}
                            className="flex-1 bg-black/60 backdrop-blur-md text-white px-4 py-3 rounded-2xl border border-white/20 focus:outline-none focus:border-primary placeholder:text-zinc-500"
                        />
                        <button
                            type="submit"
                            className="bg-primary text-primary-foreground p-3 rounded-xl hover:bg-primary/90 transition-colors"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                    <div className="fixed inset-0 z-[-1]" onClick={() => setShowWhisper(false)} />
                </div>
            )}

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6 px-8 py-4 bg-zinc-900/90 backdrop-blur-xl rounded-full border border-zinc-800 shadow-2xl">
                <button
                    onClick={toggleMute}
                    className={`p-4 rounded-full transition-all ${isMuted ? 'bg-white text-black' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}
                >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                <div className="flex bg-red-600 rounded-full shadow-lg shadow-red-600/20 overflow-hidden">
                    <button
                        onClick={handleEndCall}
                        className="p-4 hover:bg-red-700 active:scale-95 transition-transform border-r border-red-700"
                        title="End Call"
                    >
                        <PhoneOff className="w-8 h-8 fill-current text-white" />
                    </button>
                    <button
                        onClick={handleEmergency}
                        className="p-4 hover:bg-red-800 active:scale-95 transition-transform bg-red-700 flex flex-col items-center justify-center"
                        title="Emergency Exit"
                    >
                        <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowWhisper(!showWhisper)}
                        className={`p-4 rounded-full transition-all ${showWhisper ? 'bg-primary text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}
                        title="Whisper Mode"
                    >
                        <MessageSquareDashed className="w-6 h-6" />
                    </button>

                    <button
                        onClick={() => setIsLofiMode(!isLofiMode)}
                        className={`p-4 rounded-full transition-all ${isLofiMode ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}
                        title="Lofi Mode (Muffled Audio)"
                    >
                        {isLofiMode ? <Waves className="w-6 h-6" /> : <Music className="w-6 h-6" />}
                    </button>
                </div>


                <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full transition-all ${!isVideoEnabled ? 'bg-white text-black' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}
                >
                    {!isVideoEnabled ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
            </div>
        </div>
    );
}
