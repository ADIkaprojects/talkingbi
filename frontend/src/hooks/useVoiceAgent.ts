import { useCallback, useEffect, useRef, useState } from "react";

import { sendVoiceTranscription } from "@/lib/api";

export type VoiceState = "idle" | "listening" | "transcribing" | "processing" | "speaking" | "error";

type VoiceAudio = {
  data: string;
  mimeType: string;
};

interface UseVoiceAgentOptions {
  sessionId: string;
  onTranscript?: (text: string) => void;
}

export function useVoiceAgent({ sessionId, onTranscript }: UseVoiceAgentOptions) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [spokenAudio, setSpokenAudio] = useState<VoiceAudio | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const clearSpokenAudio = useCallback(() => {
    setSpokenAudio(null);
  }, []);

  const resetSpeechState = useCallback(() => {
    setPartialTranscript("");
    clearSpokenAudio();
  }, [clearSpokenAudio]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore stop race conditions.
      }
    }

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    isRecordingRef.current = false;
  }, []);

  const transcribeRecording = useCallback(async () => {
    if (!sessionId) {
      setVoiceState("error");
      setError("No active session available.");
      return;
    }

    const chunks = audioChunksRef.current;
    if (chunks.length === 0) {
      setVoiceState("idle");
      return;
    }

    try {
      const audioBlob = new Blob(chunks, { type: "audio/webm" });
      const response = await sendVoiceTranscription(audioBlob);
      const transcript = response.transcript?.trim() ?? "";
      setPartialTranscript(transcript);
      onTranscript?.(transcript);
      setVoiceState("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Voice transcription failed.";
      setVoiceState("error");
      setError(message);
    }
  }, [onTranscript, sessionId]);

  const startListening = useCallback(async () => {
    if (isRecordingRef.current) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceState("error");
      setError("Voice input is not supported in this browser.");
      return;
    }

    try {
      setError(null);
      resetSpeechState();
      setIsConnected(true);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (!event.data.size) {
          return;
        }

        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        void transcribeRecording();
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      isRecordingRef.current = true;
      setVoiceState("listening");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start voice capture.";
      setVoiceState("error");
      setError(message);
      stopListening();
    }
  }, [resetSpeechState, stopListening, transcribeRecording]);

  const toggleListening = useCallback(() => {
    if (isRecordingRef.current) {
      stopListening();
      setVoiceState("transcribing");
      return;
    }

    void startListening();
  }, [startListening, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopListening]);

  return {
    voiceState,
    isConnected,
    error,
    partialTranscript,
    spokenAudio,
    clearSpokenAudio,
    toggleListening,
    stopListening,
    isListening: isRecordingRef.current,
  };
}