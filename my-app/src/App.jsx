import React, { useState, useRef } from 'react';
import { FaUpload, FaMicrophone, FaStop } from 'react-icons/fa';
import axios from 'axios';
import './index.css';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('File selected:', file.name, file.type, file.size);

    setIsLoading(true);
    setError('');
    setTranscription('');

    const formData = new FormData();
    formData.append('audio', file);

    try {
      console.log('Uploading file...');
      const response = await axios.post('http://localhost:3000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes timeout
      });
      
      console.log('Upload response:', response.data);
      setTranscription(response.data.transcription);
    } catch (err) {
      console.error('Upload error:', err);
      
      let errorMessage = 'Failed to transcribe';
      
      if (err.response?.data?.details) {
        errorMessage += ': ' + err.response.data.details;
      } else if (err.response?.data?.error) {
        errorMessage += ': ' + err.response.data.error;
      } else if (err.message) {
        errorMessage += ': ' + err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      console.log('Requesting microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      console.log('Microphone access granted');
      
      // Check for MediaRecorder support and choose best format
      let options = { mimeType: 'audio/webm' };
      
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options.mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          options.mimeType = 'audio/wav';
        } else {
          options = {}; // Use default
        }
      }
      
      console.log('Using MIME type:', options.mimeType || 'default');
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log('Recording stopped, processing...');
        
        const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        console.log('Audio blob created:', audioBlob.size, 'bytes, type:', mimeType);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        setIsLoading(true);
        setError('');
        setTranscription('');

        const formData = new FormData();
        const filename = `recording_${Date.now()}.${mimeType.split('/')[1]}`;
        formData.append('audio', audioBlob, filename);

        try {
          console.log('Uploading recording...');
          const response = await axios.post('http://localhost:3000/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 120000, // 2 minutes timeout
          });
          
          console.log('Recording upload response:', response.data);
          setTranscription(response.data.transcription);
        } catch (err) {
          console.error('Recording upload error:', err);
          
          let errorMessage = 'Failed to transcribe recording';
          
          if (err.response?.data?.details) {
            errorMessage += ': ' + err.response.data.details;
          } else if (err.response?.data?.error) {
            errorMessage += ': ' + err.response.data.error;
          } else if (err.message) {
            errorMessage += ': ' + err.message;
          }
          
          setError(errorMessage);
        } finally {
          setIsLoading(false);
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError('Recording error: ' + event.error);
        setIsRecording(false);
      };

      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      console.log('Recording started');
      
    } catch (error) {
      console.error('Microphone access error:', error);
      setError('Error accessing microphone: ' + error.message);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping recording...');
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
            disabled={isLoading}
          />
        </label>
      </div>

      {/* Recording Section */}
      <div className="mb-6">
        {isRecording ? (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition animate-pulse"
            disabled={isLoading}
          >
            <FaStop />
            Stop Recording
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition"
            disabled={isLoading}
          >
            <FaMicrophone />
            Start Recording
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mb-6 text-gray-600 animate-pulse flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          Processing audio...
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 text-red-500 bg-red-50 p-3 rounded-md border border-red-200 max-w-md">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Transcription Display */}
      <div className="w-full max-w-2xl bg-white p-6 rounded-md shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">
          Transcription
        </h2>
        <div className="text-gray-600 bg-gray-50 p-4 rounded-md min-h-[100px]">
          {transcription || 'No transcription yet. Upload an audio file or record something to get started.'}
        </div>
      </div>
    </div>
  );
}

export default App;