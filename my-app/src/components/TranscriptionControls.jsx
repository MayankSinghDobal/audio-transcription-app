import React, { useState, useRef } from 'react';
import { FaMicrophone, FaUpload } from 'react-icons/fa';

const TranscriptionControls = ({ user, loading, setLoading, setTranscription, setError, fetchTranscriptions, setCurrentPage }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    if (!user?.access_token) {
      setError('Please log in to record.');
      return;
    }
    try {
      setLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');

        try {
          const response = await fetch('https://audio-transcription-backend-llwb.onrender.com/transcribe', {
            method: 'POST',
            headers: { Authorization: `Bearer ${user.access_token}` },
            body: formData,
          });
          if (!response.ok) throw new Error(`Transcription failed: ${response.statusText}`);
          const data = await response.json();
          setTranscription(data.transcription || 'No transcription returned');
          fetchTranscriptions();
          setCurrentPage(1);
        } catch (err) {
          setError('Failed to transcribe audio: ' + err.message);
          console.error('Transcription error:', err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Microphone access denied or recording failed: ' + err.message);
      console.error('Recording error:', err);
    } finally {
      setLoading(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleFileUpload = async (event) => {
    if (!user?.access_token) {
      setError('Please log in to upload.');
      return;
    }
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch('https://audio-transcription-backend-llwb.onrender.com/transcribe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.access_token}` },
        body: formData,
      });
      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
      const data = await response.json();
      setTranscription(data.transcription || 'No transcription returned');
      fetchTranscriptions();
      setCurrentPage(1);
    } catch (err) {
      setError('Failed to upload audio: ' + err.message);
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="controls max-w-lg mx-auto p-6 bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-xl border border-cyan-500/20 backdrop-blur-lg mb-8">
      <div className="flex flex-col md:flex-row gap-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className="holo-btn flex-1 flex items-center justify-center px-6 py-4 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !user}
        >
          <FaMicrophone className="mr-2 animate-pulse" />
          {isRecording ? 'Stop Recording' : 'Record Audio'}
        </button>
        <label className="holo-btn flex-1 flex items-center justify-center px-6 py-4 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/20 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading || !user}>
          <FaUpload className="mr-2 animate-pulse" />
          Upload Audio
          <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" disabled={loading || !user} />
        </label>
      </div>
    </div>
  );
};

export default TranscriptionControls;