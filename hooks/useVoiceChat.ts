"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Socket } from "socket.io-client";

export interface VoicePeer {
  socketId: string;
  name: string;
  isMuted: boolean;
  isSpeaking: boolean;
  stream: MediaStream | null;
}

export function useVoiceChat(
  socket: Socket | null,
  roomCode: string,
  isInRoom: boolean
) {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicePeers, setVoicePeers] = useState<VoicePeer[]>([]);
  const [micPermission, setMicPermission] = useState<
    "unknown" | "granted" | "denied"
  >("unknown");

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceConfigRef = useRef<RTCConfiguration | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const speakingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const prevSpeakingRef = useRef(false);

  // Stable refs for values used inside callbacks
  const isVoiceEnabledRef = useRef(false);
  const socketRef = useRef(socket);
  const roomCodeRef = useRef(roomCode);

  useEffect(() => {
    isVoiceEnabledRef.current = isVoiceEnabled;
  }, [isVoiceEnabled]);
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);
  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  // ── Fetch TURN config once ──────────────────────────────────
  useEffect(() => {
    fetch("/api/turn-config")
      .then((r) => r.json())
      .then((config) => {
        iceConfigRef.current = config;
        console.log("[Voice] TURN config loaded");
      })
      .catch((err) => console.error("[Voice] Failed to load TURN config:", err));
  }, []);

  // ── Create a peer connection for a specific peer ────────────
  const createPeerConnection = useCallback(
    (peerId: string, peerName: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(iceConfigRef.current || {});

      // Add local audio tracks to the connection
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // When we receive remote audio
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        // Play remote audio via a hidden Audio element
        let audioEl = audioElementsRef.current.get(peerId);
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          audioElementsRef.current.set(peerId, audioEl);
        }
        audioEl.srcObject = remoteStream;

        // Update peer stream ref
        setVoicePeers((prev) =>
          prev.map((p) =>
            p.socketId === peerId ? { ...p, stream: remoteStream } : p
          )
        );
      };

      // ICE candidate found — send to peer via Socket.io
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("webrtc-ice-candidate", {
            roomCode: roomCodeRef.current,
            targetSocketId: peerId,
            candidate: event.candidate,
          });
        }
      };

      // Log connection state changes
      pc.onconnectionstatechange = () => {
        console.log(
          `[Voice] Peer ${peerName} connection: ${pc.connectionState}`
        );
        if (pc.connectionState === "failed") {
          pc.close();
          peerConnectionsRef.current.delete(peerId);
        }
      };

      peerConnectionsRef.current.set(peerId, pc);
      return pc;
    },
    []
  );

  // ── Speaking detection setup ────────────────────────────────
  const startSpeakingDetection = useCallback(
    (stream: MediaStream) => {
      try {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 512;

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        speakingIntervalRef.current = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          const average =
            dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const speaking = average > 15;

          setIsSpeaking(speaking);

          if (speaking !== prevSpeakingRef.current) {
            prevSpeakingRef.current = speaking;
            socketRef.current?.emit("voice-speaking", {
              roomCode: roomCodeRef.current,
              isSpeaking: speaking,
            });
          }
        }, 100);
      } catch (err) {
        console.error("[Voice] Speaking detection failed:", err);
      }
    },
    []
  );

  const stopSpeakingDetection = useCallback(() => {
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsSpeaking(false);
    prevSpeakingRef.current = false;
  }, []);

  // ── Join voice chat ─────────────────────────────────────────
  const joinVoice = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
        video: false,
      });

      localStreamRef.current = stream;
      setMicPermission("granted");
      setIsVoiceEnabled(true);
      isVoiceEnabledRef.current = true;

      // Start speaking detection
      startSpeakingDetection(stream);

      // Tell other members we joined voice
      socketRef.current?.emit("voice-joined", {
        roomCode: roomCodeRef.current,
      });

      console.log("[Voice] Joined voice chat, mic active");
    } catch (err) {
      console.error("[Voice] Mic permission denied:", err);
      setMicPermission("denied");
    }
  }, [startSpeakingDetection]);

  // ── Leave voice chat ────────────────────────────────────────
  const leaveVoice = useCallback(() => {
    // Stop local stream
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Stop all remote audio
    audioElementsRef.current.forEach((el) => {
      el.srcObject = null;
    });
    audioElementsRef.current.clear();

    // Stop speaking detection
    stopSpeakingDetection();

    setIsVoiceEnabled(false);
    isVoiceEnabledRef.current = false;
    setVoicePeers([]);
    setIsMuted(false);
    socketRef.current?.emit("voice-left", { roomCode: roomCodeRef.current });

    console.log("[Voice] Left voice chat");
  }, [stopSpeakingDetection]);

  // ── Toggle mute ─────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const newMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !newMuted;
    });
    setIsMuted(newMuted);
    socketRef.current?.emit("voice-mute-changed", {
      roomCode: roomCodeRef.current,
      isMuted: newMuted,
    });
  }, [isMuted]);

  // ── Handle incoming WebRTC signals via socket ───────────────
  useEffect(() => {
    if (!socket || !isInRoom) return;

    // A new peer joined voice — WE initiate the connection to them
    const onPeerJoined = async ({
      socketId,
      name,
    }: {
      socketId: string;
      name: string;
    }) => {
      if (!isVoiceEnabledRef.current) return;
      console.log(`[Voice] ${name} joined voice — creating offer`);

      const pc = createPeerConnection(socketId, name);
      setVoicePeers((prev) => [
        ...prev.filter((p) => p.socketId !== socketId),
        {
          socketId,
          name,
          isMuted: false,
          isSpeaking: false,
          stream: null,
        },
      ]);

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc-offer", {
        roomCode,
        targetSocketId: socketId,
        offer,
      });
    };

    // We received an offer — send answer
    const onOffer = async ({
      fromSocketId,
      fromName,
      offer,
    }: {
      fromSocketId: string;
      fromName: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      if (!isVoiceEnabledRef.current) return;
      console.log(`[Voice] Received offer from ${fromName}`);

      const pc = createPeerConnection(fromSocketId, fromName);
      setVoicePeers((prev) => [
        ...prev.filter((p) => p.socketId !== fromSocketId),
        {
          socketId: fromSocketId,
          name: fromName,
          isMuted: false,
          isSpeaking: false,
          stream: null,
        },
      ]);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", {
        roomCode,
        targetSocketId: fromSocketId,
        answer,
      });
    };

    // We received an answer
    const onAnswer = async ({
      fromSocketId,
      answer,
    }: {
      fromSocketId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      const pc = peerConnectionsRef.current.get(fromSocketId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`[Voice] Answer received from ${fromSocketId}`);
      }
    };

    // ICE candidate received
    const onIceCandidate = async ({
      fromSocketId,
      candidate,
    }: {
      fromSocketId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const pc = peerConnectionsRef.current.get(fromSocketId);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("[Voice] Failed to add ICE candidate:", err);
        }
      }
    };

    // Peer mute status changed
    const onMuteChanged = ({
      socketId,
      isMuted: peerMuted,
    }: {
      socketId: string;
      name: string;
      isMuted: boolean;
    }) => {
      setVoicePeers((prev) =>
        prev.map((p) =>
          p.socketId === socketId ? { ...p, isMuted: peerMuted } : p
        )
      );
    };

    // Peer speaking state changed
    const onSpeaking = ({
      socketId,
      isSpeaking: peerSpeaking,
    }: {
      socketId: string;
      isSpeaking: boolean;
    }) => {
      setVoicePeers((prev) =>
        prev.map((p) =>
          p.socketId === socketId ? { ...p, isSpeaking: peerSpeaking } : p
        )
      );
    };

    // Peer left voice
    const onPeerLeft = ({
      socketId,
      name,
    }: {
      socketId: string;
      name: string;
    }) => {
      console.log(`[Voice] ${name} left voice`);
      const pc = peerConnectionsRef.current.get(socketId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(socketId);
      }
      const audioEl = audioElementsRef.current.get(socketId);
      if (audioEl) {
        audioEl.srcObject = null;
        audioElementsRef.current.delete(socketId);
      }
      setVoicePeers((prev) => prev.filter((p) => p.socketId !== socketId));
    };

    socket.on("voice-peer-joined", onPeerJoined);
    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-answer", onAnswer);
    socket.on("webrtc-ice-candidate", onIceCandidate);
    socket.on("voice-mute-changed", onMuteChanged);
    socket.on("voice-speaking", onSpeaking);
    socket.on("voice-peer-left", onPeerLeft);

    return () => {
      socket.off("voice-peer-joined", onPeerJoined);
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-answer", onAnswer);
      socket.off("webrtc-ice-candidate", onIceCandidate);
      socket.off("voice-mute-changed", onMuteChanged);
      socket.off("voice-speaking", onSpeaking);
      socket.off("voice-peer-left", onPeerLeft);
    };
  }, [socket, isInRoom, roomCode, createPeerConnection]);

  // ── Cleanup on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (isVoiceEnabledRef.current) {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        peerConnectionsRef.current.forEach((pc) => pc.close());
        peerConnectionsRef.current.clear();
        audioElementsRef.current.forEach((el) => {
          el.srcObject = null;
        });
        audioElementsRef.current.clear();
        if (speakingIntervalRef.current) {
          clearInterval(speakingIntervalRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
        }
      }
    };
  }, []);

  return {
    isVoiceEnabled,
    isMuted,
    isSpeaking,
    micPermission,
    voicePeers,
    joinVoice,
    leaveVoice,
    toggleMute,
  };
}
