/**
 * Voice recorder hook — browser MediaRecorder API.
 * Matches ZenViewer's AudioRecorderService.java behavior:
 * - WAV-like recording (browser uses webm/opus natively)
 * - Pause/resume
 * - Timer display
 * - Upload via ZenPACS API
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadVoice } from '../api/zenpacs-client';

export type RecorderState = 'idle' | 'recording' | 'paused' | 'stopped';

interface UseVoiceRecorderReturn {
  state: RecorderState;
  duration: number;          // seconds
  startRecording: () => void;
  pauseResume: () => void;
  stopRecording: () => void;
  uploadRecording: (patientCaseId: number) => Promise<void>;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000) + pausedDurationRef.current;
      setDuration(elapsed);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      setDuration(0);
      pausedDurationRef.current = 0;
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Prefer WAV-compatible format, fall back to webm
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // Collect data every 1s
      setState('recording');
      startTimer();
    } catch (err: any) {
      setError(err.message || 'Mikrofon erişimi reddedildi');
      setState('idle');
    }
  }, [audioUrl, startTimer]);

  const pauseResume = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (state === 'recording') {
      recorder.pause();
      pausedDurationRef.current = duration;
      stopTimer();
      setState('paused');
    } else if (state === 'paused') {
      recorder.resume();
      startTimer();
      setState('recording');
    }
  }, [state, duration, startTimer, stopTimer]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    stopTimer();
    recorder.stop();
    setState('stopped');
  }, [stopTimer]);

  const uploadRecording = useCallback(async (patientCaseId: number) => {
    if (!audioBlob) throw new Error('No recording to upload');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const filename = `voice_${timestamp}.webm`;

    await uploadVoice(patientCaseId, audioBlob, filename);

    // Clear after successful upload
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setDuration(0);
    setState('idle');
  }, [audioBlob, audioUrl]);

  return {
    state,
    duration,
    startRecording,
    pauseResume,
    stopRecording,
    uploadRecording,
    audioBlob,
    audioUrl,
    error,
  };
}
