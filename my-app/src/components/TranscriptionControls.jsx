import React, { useRef } from 'react';
import axios from 'axios';
import { FaMicrophone, FaStop, FaUpload } from 'react-icons/fa';

const TranscriptionControls = ({ user, loading, setTranscription, setError, fetchTranscriptions, setCurrentPage }) => {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  const startRecording = async () => {
    if (!user) {
      setError('Please log in to record audio');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size === 0) {
          setError('Recording failed - no audio data captured');
          return;
        }
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        try {
          setLoading(true);
          setTranscription('Processing audio...');
          const response = await axios.post('https://audio-transcription-backend-llwb.onrender.com/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${user.access_token}` },
            timeout: 60000,
          });
          setTranscription(response.data.transcription);
          setCurrentPage(1);
          await fetchTranscriptions();
        } catch (err) {
          setError('Failed to transcribe: ' + err.message);
          setTranscription('');
        } finally {
          setLoading(false);
        }
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start(1000);
    } catch (err) {
      setError('Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
  };

  const handleFileUpload = async (event) => {
    if (!user) {
      setError('Please log in to upload audio');
      return;
    }
    const file = event.target.files[0];
    if (!file || file.size > 10 * 1024 * 1024 || !['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/m4a', 'video/webm', 'video/mp4'].includes(file.type)) {
      setError(file ? 'File too large or unsupported type' : 'No file selected');
      return;
    }
    const formData = new FormData();
    formData.append('audio', file);
    try {
      setLoading(true);
      setTranscription('Processing audio...');
      const response = await axios.post('https://audio-transcription-backend-llwb.onrender.com/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${user.access_token}` },
        timeout: 60000,
      });
      setTranscription(response.data.transcription);
      setCurrentPage(1);
      await fetchTranscriptions();
    } catch (err) {
      setError('Failed to transcribe: ' + err.message);
      setTranscription('');
    } finally {
      setLoading(false);
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  return (
    <div className="controls grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
      <input
        type="file"
        accept="audio/*,video/webm,video/mp4"
        onChange={handleFileUpload}
        className="hidden"
        id="audio-upload"
        ref={fileInputRef}
        disabled={loading}
      />
      <button
        onClick={triggerFileInput}
        className="holo-btn flex items-center justify-center px-8 py-4 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/50 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={loading}
      >
        <FaUpload className="mr-2 animate-pulse" /> Upload Data Stream
      </button>
      <button
        onClick={loading && !mediaRecorderRef.current?.state === 'recording' ? undefined : (mediaRecorderRef.current?.state === 'recording' ? stopRecording : startRecording)}
        className={`holo-btn flex items-center justify-center px-8 py-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${mediaRecorderRef.current?.state === 'recording' ? 'bg-red-600/20 hover:bg-red-600/40 border-red-500/50 hover:shadow-red-500/30' : 'bg-green-600/20 hover:bg-green-600/40 border-green-500/50 hover:shadow-green-500/30'}`}
        disabled={loading && !mediaRecorderRef.current?.state === 'recording'}
      >
        {mediaRecorderRef.current?.state === 'recording' ? <FaStop className="mr-2 animate-pulse" /> : <FaMicrophone className="mr-2 animate-pulse" />}
        {mediaRecorderRef.current?.state === 'recording' ? 'Terminate Stream' : 'Initiate Audio Capture'}
      </button>
    </div>
  );
};

export default TranscriptionControls;