'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './auth-context';
import { db } from './firebase';
import {
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from 'firebase/firestore';

export type CallState = 'idle' | 'calling' | 'incoming' | 'incall';

interface CallContextType {
    callState: CallState;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    callerInfo: { uid: string, name: string, isAnonymous?: boolean } | null;
    isAnonymousMode: boolean;
    startCall: (targetUserId: string, targetName: string, isVideo?: boolean, isAnonymous?: boolean) => void;
    acceptCall: () => void;
    rejectCall: () => void;
    endCall: () => void;
    emergencyEndCall: () => void;
    sendWhisper: (text: string) => void;
    toggleMute: () => void;
    toggleVideo: () => void;
    isMuted: boolean;
    isVideoEnabled: boolean;
    error: string | null;
}

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();

    // State
    const [callState, setCallState] = useState<CallState>('idle');
    const [callerInfo, setCallerInfo] = useState<{ uid: string, name: string, isAnonymous?: boolean } | null>(null);
    const [isAnonymousMode, setIsAnonymousMode] = useState(false); // Local state for "Am I Anonymous?"

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    // Refs
    const peerRef = useRef<any>(null);
    const activeCallRef = useRef<any>(null);
    const dataConnectionRef = useRef<any>(null); // For Whisper Mode
    const currentCallDocId = useRef<string | null>(null);
    const unsubRef = useRef<(() => void) | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null); // Sync with state
    const callStateRef = useRef<CallState>('idle'); // Sync with state

    const callMetadataRef = useRef<{
        callId: string;
        callerId: string;
        receiverId: string;
        isVideo: boolean;
        isIncoming: boolean;
        isAnonymous: boolean;
    } | null>(null);

    // Sync Refs
    useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
    useEffect(() => { callStateRef.current = callState; }, [callState]);

    // 1. PeerJS Initialization (Runs ONCE per user)
    useEffect(() => {
        if (!user) return;

        let isMounted = true;
        let createdPeer: any = null;

        const initPeer = async (retryWithRandomId = false) => {
            try {
                // Dynamic import
                const { default: Peer } = await import('peerjs');

                // Check mount status after await
                if (!isMounted) return;

                // Safety check: if ref already exists, don't create another
                if (peerRef.current && !peerRef.current.destroyed) return;

                console.log("[CallSystem] Initializing Peer for:", user.uid);

                // If simple retry failed, use random suffix to bypass "ID taken"
                const peerId = retryWithRandomId
                    ? `${user.uid}_${Math.random().toString(36).substr(2, 5)}`
                    : user.uid;

                if (!window.isSecureContext && window.location.hostname !== 'localhost') {
                    console.warn("[CallSystem] App is not running in a Secure Context (HTTPS). WebRTC may fail.");
                }

                try {
                    createdPeer = new Peer(peerId, {
                        config: {
                            iceServers: [
                                { urls: 'stun:stun.l.google.com:19302' },
                                { urls: 'stun:global.stun.twilio.com:3478' }
                            ]
                        },
                        debug: 0 // Disable all internal logs
                    });
                } catch (peerError: any) {
                    console.warn("[CallSystem] Peer Constructor Failed:", peerError);
                    if (peerError.name === 'SecurityError') {
                        setError("Video calls require a secure connection (HTTPS).");
                    } else {
                        setError("Failed to initialize video calling service.");
                    }
                    return;
                }

                createdPeer.on('open', (id: string) => {
                    if (isMounted) console.log("[CallSystem] Peer Ready:", id);
                });

                createdPeer.on('disconnected', () => {
                    // Only reconnect if we haven't explicitly destroyed it
                    if (createdPeer && !createdPeer.destroyed) {
                        createdPeer.reconnect();
                    }
                });

                createdPeer.on('connection', (conn: any) => {
                    if (!isMounted) return;
                    console.log("[CallSystem] Incoming Data Connection");
                    setupDataHandlers(conn);
                });

                createdPeer.on('call', async (call: any) => {
                    if (!isMounted) return;
                    console.log("[CallSystem] Receiving Media Connection (Incoming Call)...");

                    try {
                        let stream = localStreamRef.current;
                        if (!stream) {
                            console.log("[CallSystem] No local stream found in ref, requesting access...");
                            stream = await navigator.mediaDevices.getUserMedia({
                                video: true,
                                audio: { echoCancellation: true, noiseSuppression: true }
                            });

                            // Check mount again after async media request
                            if (!isMounted) {
                                stream.getTracks().forEach(t => t.stop());
                                return;
                            }

                            setLocalStream(stream);
                            localStreamRef.current = stream;
                        } else {
                            console.log("[CallSystem] Using existing local stream to answer");
                        }

                        call.answer(stream);
                        setupMediaHandlers(call);
                        setCallState('incall');
                    } catch (e) {
                        console.warn("[CallSystem] Answer failed", e);
                        setError("Could not answer call.");
                    }
                });

                createdPeer.on('error', (err: any) => {
                    // Suppress "Lost connection", "Could not connect", "peer-unavailable" noise
                    if (
                        err?.type === 'network' ||
                        err?.type === 'peer-unavailable' ||
                        err?.message?.includes('Lost connection') ||
                        err?.message?.includes('Could not connect to peer')
                    ) {
                        console.warn("[CallSystem] Ignored expected PeerJS error:", err.type || err.message);
                        return;
                    }

                    // Handle "ID Taken" gracefully without crashing the UI
                    if (err.type === 'unavailable-id') {
                        console.warn("[CallSystem] ID Taken. Retrying with random suffix...");

                        // Prevent this error from showing up in the user's UI as a crash
                        // We do this by not re-throwing and handling it locally
                        if (createdPeer) {
                            createdPeer.destroy();
                        }
                        peerRef.current = null;

                        // Recursive retry with random flag
                        setTimeout(() => initPeer(true), 200);
                        return;
                    }

                    console.warn("[CallSystem] Peer Error:", err);
                    setError(err.message || "Connection error occurred.");
                });

                // Assign to ref only if still mounted
                if (isMounted) {
                    peerRef.current = createdPeer;
                } else {
                    // Cleanup if unmounted during setup
                    createdPeer.destroy();
                }

            } catch (e) {
                console.warn("[CallSystem] Peer init failed", e);
            }
        };

        initPeer();

        return () => {
            isMounted = false;
            // Cleanup existing peer
            if (peerRef.current) {
                console.log("[CallSystem] Destroying Peer (Cleanup)");
                peerRef.current.destroy();
                peerRef.current = null;
            }
        };
    }, [user?.uid]);

    // 2. Signaling Listener (Dynamic)
    useEffect(() => {
        if (!user) return;

        const listenForSignals = () => {
            // Listen for 'offering' calls where I am the receiver
            const q = query(
                collection(db, 'calls'),
                where('receiverId', '==', user.uid),
                where('status', '==', 'offering')
            );

            const unsub = onSnapshot(q, (snapshot) => {
                let newestCallDoc: any = null;
                let newestCallData: any = null;
                let newestCallTimestamp = 0;

                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added' || change.type === 'modified') {
                        const data = change.doc.data();

                        const now = Date.now();
                        let callTimeMillis = now;
                        if (data.createdAt && typeof data.createdAt.toMillis === 'function') {
                            callTimeMillis = data.createdAt.toMillis();
                        } else if (data.createdAt && typeof data.createdAt === 'number') {
                            callTimeMillis = data.createdAt;
                        }

                        // Ignore calls older than 60 seconds
                        if (now - callTimeMillis > 60000) return;

                        if (callTimeMillis >= newestCallTimestamp) {
                            newestCallTimestamp = callTimeMillis;
                            newestCallDoc = change.doc;
                            newestCallData = data;
                        }
                    }
                });

                // Check ref for current state
                if (newestCallDoc && newestCallData && callStateRef.current === 'idle') {
                    console.log("[CallSystem] Incoming Signal:", newestCallData);
                    currentCallDocId.current = newestCallDoc.id;

                    const isAnonymous = newestCallData.isAnonymous === true;
                    // MASK NAME IF ANONYMOUS
                    const displayName = isAnonymous
                        ? `Student #${newestCallData.callerId.slice(-4)}`
                        : (newestCallData.callerName || 'Unknown User');

                    setCallerInfo({
                        uid: newestCallData.callerId,
                        name: displayName,
                        isAnonymous
                    });

                    callMetadataRef.current = {
                        callId: newestCallDoc.id,
                        callerId: newestCallData.callerId,
                        receiverId: user.uid,
                        isVideo: newestCallData.isVideo !== false,
                        isIncoming: true,
                        isAnonymous
                    };

                    setCallState('incoming');
                    setIsVideoEnabled(newestCallData.isVideo !== false);
                }
            }, (err) => {
                console.warn("[CallSystem] Messaging signal error:", err);
            });
            return unsub;
        };

        const unsubSignals = listenForSignals();
        return () => unsubSignals();
    }, [user?.uid]); // Only restart if user changes

    // 2. Helpers
    const setupMediaHandlers = (call: any) => {
        activeCallRef.current = call;
        startTimeRef.current = Date.now();
        console.log("[CallSystem] Media Handlers Setup for Call:", call.peer);

        call.on('stream', (remote: MediaStream) => {
            console.log("[CallSystem] Got Remote Stream with tracks:", remote.getTracks().map(t => t.kind));
            if (remote.getVideoTracks().length === 0) {
                console.warn("[CallSystem] WARNING: Remote stream has no video tracks!");
            }
            setRemoteStream(remote);
        });

        call.on('close', () => {
            console.log("[CallSystem] Call Closed by Peer");
            cleanup();
        });

        call.on('error', (err: any) => {
            console.warn("[CallSystem] Call Error:", err);
            cleanup();
        });
    };

    const setupDataHandlers = (conn: any) => {
        dataConnectionRef.current = conn;
        conn.on('open', () => {
            console.log("[CallSystem] Data Channel Open");
        });
        conn.on('data', (data: any) => {
            console.log("[CallSystem] Received Data:", data);

            // WHISPER HANDLING
            if (data.type === 'whisper' && data.text) {
                // Speak it out!
                const utterance = new SpeechSynthesisUtterance(data.text);
                window.speechSynthesis.speak(utterance);
            }
        });
        conn.on('close', () => { dataConnectionRef.current = null; });
        conn.on('error', () => { dataConnectionRef.current = null; });
    };

    const cleanup = async () => { // Changed to async
        console.log("[CallSystem] Cleaning up...");

        const now = Date.now();
        const duration = startTimeRef.current ? (now - startTimeRef.current) / 1000 : 0;
        const meta = callMetadataRef.current;

        // Logging Logic
        if (user && meta && duration > 0) {
            try {
                // 1. Update stats (already done)
                const { updateUserCallStats, logCallHistory, logCallEvent } = await import('./db');
                if (duration > 5) {
                    await updateUserCallStats(user.uid, duration);
                }

                // 2. Log to Chat (Visible History)
                const connectionId = [meta.callerId, meta.receiverId].sort().join('_');
                // Only log if I am the "caller" to avoid double logging?
                // Or just let both try and Firestore handles idempotency if ID is same?
                // logCallHistory adds a new doc, so we should duplicate check or only one party logs.
                // Convention: Caller logs it.
                if (user.uid === meta.callerId) {
                    await logCallHistory(connectionId, meta.callerId, duration, false, meta.isVideo);
                }

                // 3. Log to Global History (Schema Match)
                await logCallEvent({
                    callId: currentCallDocId.current || `call_${Date.now()}`,
                    fromUser: meta.callerId,
                    toUser: meta.receiverId,
                    type: meta.isVideo ? 'video' : 'voice',
                    direction: meta.isIncoming ? 'incoming' : 'outgoing',
                    status: 'completed',
                    startedAt: new Date(now - duration * 1000).toISOString(),
                    endedAt: new Date(now).toISOString(),
                    duration: Math.ceil(duration)
                });

            } catch (e) {
                console.warn("[CallSystem] Logging error:", e);
            }
        }

        startTimeRef.current = null;
        callMetadataRef.current = null; // Clear meta

        if (activeCallRef.current) activeCallRef.current.close();
        if (dataConnectionRef.current) dataConnectionRef.current.close(); // Close data channel
        if (localStream) localStream.getTracks().forEach(t => t.stop());

        // Cancel Firestore listener if any
        if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }

        setLocalStream(null);
        setRemoteStream(null);
        setCallState('idle');
        setCallerInfo(null);
        setIsAnonymousMode(false);
        currentCallDocId.current = null;
        activeCallRef.current = null;
        dataConnectionRef.current = null;
        setError(null);
    };

    // 3. Actions

    // START CALL
    const startCall = async (targetUserId: string, targetName: string, isVideo: boolean = true, isAnonymous: boolean = false) => {
        if (!user) return;

        try {
            console.log("[CallSystem] Starting Call Signal...");
            setCallState('calling');
            setCallerInfo({ uid: targetUserId, name: targetName });
            setIsAnonymousMode(isAnonymous);
            setIsVideoEnabled(isVideo);
            setIsMuted(false);

            // Set Metadata so we can log it later
            callMetadataRef.current = {
                callId: '', // Will update
                callerId: user.uid,
                receiverId: targetUserId,
                isVideo,
                isIncoming: false,
                isAnonymous
            };

            // 1. Get Media First (Preview)
            const stream = await navigator.mediaDevices.getUserMedia({
                video: isVideo,
                audio: { echoCancellation: true, noiseSuppression: true }
            });
            setLocalStream(stream);

            // CRITICAL: Re-assert video state after stream acquisition
            // This prevents state drift if the async prompt took a while
            setIsVideoEnabled(isVideo);

            // Connect Data Channel (Whisper)
            if (peerRef.current) {
                const conn = peerRef.current.connect(targetUserId);
                setupDataHandlers(conn);
            }

            // 2. Create Signal Doc
            const callDoc = await addDoc(collection(db, 'calls'), {
                callerId: user.uid,
                callerName: isAnonymous ? null : user.displayName, // Hide name if anon
                receiverId: targetUserId,
                status: 'offering',
                isVideo,
                isAnonymous, // Signal anon flag
                createdAt: serverTimestamp()
            });
            currentCallDocId.current = callDoc.id;
            if (callMetadataRef.current) callMetadataRef.current.callId = callDoc.id;

            // 3. Listen for Acceptance
            const unsub = onSnapshot(doc(db, 'calls', callDoc.id), (snap) => {
                const data = snap.data();
                if (!data) return;

                if (data.status === 'accepted') {
                    console.log("[CallSystem] Call Accepted! Connecting Media...");
                    // Initiate PeerJS Call
                    if (peerRef.current) {
                        // Use the responder's actual Peer ID if they provided it (fallback flow), otherwise targetUserId
                        const destPeerId = data.responderPeerId || targetUserId;
                        console.log(`[CallSystem] Calling Peer: ${destPeerId}`);

                        const call = peerRef.current.call(destPeerId, stream);
                        setupMediaHandlers(call);
                        setCallState('incall');
                    }
                } else if (data.status === 'rejected' || data.status === 'ended' || data.status === 'ended_emergency') {
                    console.log("[CallSystem] Call Rejected/Ended");
                    setError(data.status === 'rejected' ? "Call Rejected" : "Call Ended");
                    setTimeout(cleanup, 2000);
                }
            }, (err) => {
                console.warn("[CallSystem] Call acceptance listener error:", err);
            });
            unsubRef.current = unsub;

        } catch (e) {
            console.warn("[CallSystem] Start Call Failed", e);
            setError("Failed to start call.");
            cleanup();
        }
    };

    // ACCEPT CALL
    const acceptCall = async () => {
        if (!currentCallDocId.current) return;

        try {
            const requestedVideo = callMetadataRef.current?.isVideo ?? isVideoEnabled;
            console.log("[CallSystem] Accepting Call. Requested Video:", requestedVideo);

            // Get Media
            const stream = await navigator.mediaDevices.getUserMedia({
                video: requestedVideo,
                audio: { echoCancellation: true, noiseSuppression: true }
            });

            // Force Sync Ref to avoid race condition with PeerJS answer
            localStreamRef.current = stream;
            setLocalStream(stream);

            // CRITICAL FIX: Explicitly set video state to match request
            // This ensures the UI shows the camera is ON immediately
            setIsVideoEnabled(requestedVideo);

            // Update Signal
            // Update Signal with my ACTUAL peer ID (in case I couldn't get my uid)
            try {
                await updateDoc(doc(db, 'calls', currentCallDocId.current), {
                    status: 'accepted',
                    responderPeerId: peerRef.current?.id || user?.uid // Crucial for handshake if ID changed
                });
            } catch (firestoreError) {
                console.warn("[CallSystem] Firestore signal update failed:", firestoreError);
                setError("Failed to accept call signal.");
                cleanup();
            }

            // Wait for incoming Peer Connection (handled in useEffect)

        } catch (e) {
            console.warn("[CallSystem] Accept Failed", e);
            setError("Failed to access media.");
        }
    };

    // REJECT CALL
    const rejectCall = async () => {
        try {
            if (currentCallDocId.current) {
                await updateDoc(doc(db, 'calls', currentCallDocId.current), {
                    status: 'rejected'
                });
            }
        } catch (e) {
            console.warn("[CallSystem] Reject call failed:", e);
        } finally {
            cleanup();
        }
    };

    // END CALL
    const endCall = async () => {
        try {
            if (currentCallDocId.current) {
                // Try-catch just in case doc is gone
                try {
                    await updateDoc(doc(db, 'calls', currentCallDocId.current), {
                        status: 'ended'
                    });
                } catch (e) { }
            }
        } catch (e) {
            console.warn("[CallSystem] End call failed:", e);
        } finally {
            cleanup();
        }
    };

    const emergencyEndCall = async () => {
        try {
            console.log("🚨 EMERGENCY END CALL TRIGGERED 🚨");
            // 1. Instant cleanup locally
            if (activeCallRef.current) activeCallRef.current.close();
            if (localStream) localStream.getTracks().forEach(t => t.stop());
            setCallState('idle'); // Instant UI hide

            // 2. Kill Firestore doc to cut off other side
            if (currentCallDocId.current) {
                try {
                    await updateDoc(doc(db, 'calls', currentCallDocId.current), {
                        status: 'ended_emergency'
                    });
                } catch (e) { }
            }

            // 3. Reset all refs
            startTimeRef.current = null;
            currentCallDocId.current = null;
            activeCallRef.current = null;
        } catch (e) {
            console.warn("[CallSystem] Emergency end failed:", e);
        }
    };

    // WHISPER ACTION
    const sendWhisper = (text: string) => {
        if (dataConnectionRef.current) {
            dataConnectionRef.current.send({ type: 'whisper', text });
        } else {
            console.warn("No data connection for whisper");
        }
    };

    // Toggles
    const toggleMute = () => {
        if (localStream) {
            const track = localStream.getAudioTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setIsMuted(!track.enabled);
            }
        }
    };
    const toggleVideo = async () => {
        if (!localStream) return;

        const videoTrack = localStream.getVideoTracks()[0];

        if (videoTrack) {
            // Case 1: Track exists, just toggle
            videoTrack.enabled = !videoTrack.enabled;
            setIsVideoEnabled(videoTrack.enabled);
        } else {
            // Case 2: No video track (Audio-only start), try to upgrade
            try {
                console.log("[CallSystem] Upgrading to Video...");
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const newTrack = videoStream.getVideoTracks()[0];

                // Add to local stream (for preview)
                localStream.addTrack(newTrack);
                setLocalStream(new MediaStream(localStream.getTracks())); // Trigger visual update
                setIsVideoEnabled(true);

                // Add to Peer Connection (send to remote)
                if (activeCallRef.current && activeCallRef.current.peerConnection) {
                    const sender = activeCallRef.current.peerConnection.getSenders().find((s: any) => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(newTrack);
                    } else {
                        activeCallRef.current.peerConnection.addTrack(newTrack, localStream);
                    }
                }
            } catch (e) {
                console.warn("[CallSystem] Failed to enable video:", e);
                setError("Camera access failed");
            }
        }
    };


    return (
        <CallContext.Provider value={{
            callState,
            localStream,
            remoteStream,
            callerInfo,
            isAnonymousMode,
            startCall,
            acceptCall,
            rejectCall,
            endCall,
            emergencyEndCall,
            toggleMute,
            toggleVideo,
            sendWhisper,
            isMuted,
            isVideoEnabled,
            error
        }}>
            {children}
        </CallContext.Provider>
    );
}

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) throw new Error("useCall must be within Provider");
    return context;
};
