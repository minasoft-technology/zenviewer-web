/**
 * Voice Recorder Panel — floating right-side panel
 *
 * Matches ZenViewer's AudioRecorderPanel.java:
 * - Record/Pause/Stop controls
 * - Timer display (MM:SS)
 * - Playback local recording
 * - Upload to ZenPACS API
 * - List server recordings with play/delete
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import {
  getVoiceFiles,
  deleteVoiceFile,
  getPatientCaseIds,
  type VoiceFile,
} from '../api/zenpacs-client';

function VoiceRecorderPanel({ servicesManager }: { servicesManager: any }) {
  const recorder = useVoiceRecorder();
  const [serverVoices, setServerVoices] = useState<VoiceFile[]>([]);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const caseIds = getPatientCaseIds();
  const currentCaseId = caseIds[0];

  // Fetch server recordings on mount and after upload
  const fetchServerVoices = useCallback(async () => {
    if (!currentCaseId) return;
    try {
      const data = await getVoiceFiles(currentCaseId);
      setServerVoices(data.voices || []);
    } catch {
      // Silent — server recordings are optional
    }
  }, [currentCaseId]);

  useEffect(() => {
    fetchServerVoices();
  }, [fetchServerVoices]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleUpload = async () => {
    if (!currentCaseId || !recorder.audioBlob) return;
    setUploading(true);
    setUploadError(null);
    try {
      await recorder.uploadRecording(currentCaseId);
      await fetchServerVoices();
    } catch (err: any) {
      setUploadError(err.message || 'Yükleme başarısız');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteServerVoice = async (voice: VoiceFile) => {
    if (!currentCaseId) return;
    try {
      await deleteVoiceFile(currentCaseId, voice.key);
      setServerVoices(prev => prev.filter(v => v.key !== voice.key));
    } catch (err: any) {
      console.error('Delete voice failed:', err);
    }
  };

  return (
    <div className="flex flex-col h-full text-sm" style={{ backgroundColor: '#282A2E' }}>
      {/* Recording Controls */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          {/* Record / Stop */}
          {recorder.state === 'idle' || recorder.state === 'stopped' ? (
            <button
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-medium"
              onClick={recorder.startRecording}
            >
              ● Kayıt
            </button>
          ) : (
            <button
              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs font-medium"
              onClick={recorder.stopRecording}
            >
              ■ Durdur
            </button>
          )}

          {/* Pause / Resume */}
          {(recorder.state === 'recording' || recorder.state === 'paused') && (
            <button
              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-xs font-medium"
              onClick={recorder.pauseResume}
            >
              {recorder.state === 'paused' ? '▶ Devam' : '⏸ Duraklat'}
            </button>
          )}

          {/* Timer */}
          <span className="text-white font-mono text-base ml-auto">
            {formatDuration(recorder.duration)}
          </span>
        </div>

        {/* Recording state indicator */}
        {recorder.state === 'recording' && (
          <div className="flex items-center gap-1 text-red-400 text-xs">
            <span className="animate-pulse">●</span> Kayıt yapılıyor...
          </div>
        )}
        {recorder.state === 'paused' && (
          <div className="text-yellow-400 text-xs">⏸ Duraklatıldı</div>
        )}

        {/* Error */}
        {recorder.error && (
          <div className="text-red-400 text-xs mt-1">{recorder.error}</div>
        )}
      </div>

      {/* Local recording playback + upload */}
      {recorder.audioUrl && (
        <div className="p-3 border-b border-gray-700 bg-gray-800/50">
          <div className="text-gray-400 text-xs mb-2">Kaydedilen ses:</div>
          <audio src={recorder.audioUrl} controls className="w-full h-8 mb-2" />
          <button
            className="w-full px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-medium disabled:opacity-50"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? 'Yükleniyor...' : '↑ Yükle'}
          </button>
          {uploadError && (
            <div className="text-red-400 text-xs mt-1">{uploadError}</div>
          )}
        </div>
      )}

      {/* Server recordings */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="text-gray-400 text-xs mb-2">
          Sunucu kayıtları ({serverVoices.length})
        </div>
        {serverVoices.length === 0 ? (
          <div className="text-gray-600 text-xs">Kayıt bulunamadı</div>
        ) : (
          serverVoices.map((voice) => (
            <div
              key={voice.key}
              className="mb-2 p-2 bg-gray-800/50 rounded flex items-center gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="text-gray-300 text-xs truncate">{voice.filename}</div>
                <div className="text-gray-500 text-xs">
                  {voice.uploaded_by} • {voice.uploaded_at}
                </div>
              </div>
              <button
                className="text-blue-400 hover:text-blue-300 text-xs"
                onClick={() => setPlayingUrl(playingUrl === voice.url ? null : voice.url)}
              >
                {playingUrl === voice.url ? '⏸' : '▶'}
              </button>
              <button
                className="text-red-400 hover:text-red-300 text-xs"
                onClick={() => handleDeleteServerVoice(voice)}
              >
                ✕
              </button>
            </div>
          ))
        )}

        {/* Playing server audio */}
        {playingUrl && (
          <audio
            src={playingUrl}
            controls
            autoPlay
            className="w-full h-8 mt-2"
            onEnded={() => setPlayingUrl(null)}
          />
        )}
      </div>
    </div>
  );
}

export default VoiceRecorderPanel;
