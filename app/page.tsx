"use client";
import React, { useState, useEffect, useRef } from "react";

const HomePage: React.FC = () => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [mic1Id, setMic1Id] = useState<string>("");
  const [mic2Id, setMic2Id] = useState<string>("");
  const [recording, setRecording] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const mergerRef = useRef<ChannelMergerNode | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const senderRef = useRef<RTCRtpSender | null>(null);

  useEffect(() => {
    (async () => {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(allDevices.filter(d => d.kind === "audioinput"));
    })();
  }, []);

  const startTracks = async () => {
    if (!mic1Id || !mic2Id) return;

    // Create streams
    const mic1Stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: mic1Id } },
    });
    const mic2Stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: mic2Id } },
    });

    // Merge both into a stereo for recording
    audioCtxRef.current = new AudioContext();
    const source1 = audioCtxRef.current.createMediaStreamSource(mic1Stream);
    const source2 = audioCtxRef.current.createMediaStreamSource(mic2Stream);
    mergerRef.current = audioCtxRef.current.createChannelMerger(2);
    destRef.current = audioCtxRef.current.createMediaStreamDestination();

    source1.connect(mergerRef.current, 0, 0);
    source2.connect(mergerRef.current, 0, 1);
    mergerRef.current.connect(destRef.current);

    // Start recording
    recorderRef.current = new MediaRecorder(destRef.current.stream);
    recorderRef.current.ondataavailable = e => {
      if (e.data.size > 0) {
        // Handle chunks (e.g. upload or download)
        console.log("Recording chunk:", e.data);
      }
    };
    recorderRef.current.start();

    // Setup WebRTC
    pcRef.current = new RTCPeerConnection();
    senderRef.current = pcRef.current.addTrack(
      mic1Stream.getAudioTracks()[0],
      mic1Stream
    );
    // Normally you'd do createOffer, setLocalDescription, etc.
    setRecording(true);
  };

  const stopAll = () => {
    recorderRef.current?.stop();
    pcRef.current?.close();
    audioCtxRef.current?.close();
    setRecording(false);
  };

  const switchToMic2 = async () => {
    if (!mic2Id || !senderRef.current) return;
    const mic2Stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: mic2Id } },
    });
    senderRef.current.replaceTrack(mic2Stream.getAudioTracks()[0]);
  };

  const switchToMic1 = async () => {
    if (!mic1Id || !senderRef.current) return;
    const mic1Stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: mic1Id } },
    });
    senderRef.current.replaceTrack(mic1Stream.getAudioTracks()[0]);
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Mic Selection</h2>
      <select onChange={e => setMic1Id(e.target.value)} value={mic1Id}>
        <option value="">-- Mic1 --</option>
        {devices.map(d => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || d.deviceId}
          </option>
        ))}
      </select>
      <select onChange={e => setMic2Id(e.target.value)} value={mic2Id}>
        <option value="">-- Mic2 --</option>
        {devices.map(d => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || d.deviceId}
          </option>
        ))}
      </select>

      <div style={{ marginTop: "1rem" }}>
        {!recording ? (
          <button onClick={startTracks}>Start</button>
        ) : (
          <button onClick={stopAll}>Stop</button>
        )}
      </div>

      {recording && (
        <div style={{ marginTop: "1rem" }}>
          <button onMouseDown={switchToMic2} onMouseUp={switchToMic1}>
            Hold to switch mic
          </button>
        </div>
      )}
    </div>
  );
};

export default HomePage;
