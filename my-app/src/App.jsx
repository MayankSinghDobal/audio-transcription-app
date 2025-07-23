import React, { useState, useRef } from 'react';
import { FaUpload, FaMicrophone, FaStop } from 'react-icons/fa';
import './index.css';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setTranscription('Selected file: ' + file.name);
      // We'll send to backend on Day 6
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setTranscription('Recording stopped. Ready to send.');
        // We'll send to backend on Day 6
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setTranscription('Error: Could not access microphone.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-blue-600 mb-6">
        Audio Transcription App
      </h1>

      {/* File Upload Section */}
      <div className="mb-6">
        <label className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-blue-600 transition">
          <FaUpload />
          <span>Upload Audio</span>
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      {/* Recording Section */}
      <div className="mb-6">
        {isRecording ? (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
          >
            <FaStop />
            Stop Recording
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition"
          >
            <FaMicrophone />
            Start Recording
          </button>
        )}
      </div>

      {/* Transcription Display */}
      <div className="w-full max-w-md bg-white p-4 rounded-md shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Transcription
        </h2>
        <p className="text-gray-600">{transcription || 'No transcription yet.'}</p>
      </div>
    </div>
  );
}

export default App;