import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FaMicrophone, FaStop, FaUpload, FaTrash, FaFileExport } from 'react-icons/fa';
import './App.css';

function App() {
  const [transcription, setTranscription] = useState('');
  const [pastTranscriptions, setPastTranscriptions] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  // Fetch past transcriptions on mount
  useEffect(() => {
    const fetchTranscriptions = async () => {
      try {
        const response = await axios.get('http://localhost:3000/transcriptions');
        setPastTranscriptions(response.data.data || []);
      } catch (err) {
        console.error('Error fetching transcriptions:', err);
        setError('Failed to fetch past transcriptions: ' + err.message);
      }
    };
    fetchTranscriptions();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
          setTranscription('Processing audio...');
          setError('');
          const response = await axios.post('http://localhost:3000/upload', formData);
          setTranscription(response.data.transcription);
          const transcriptionsResponse = await axios.get('http://localhost:3000/transcriptions');
          setPastTranscriptions(transcriptionsResponse.data.data || []);
        } catch (err) {
          console.error('Upload error:', err);
          setError('Failed to transcribe: ' + (err.response?.data?.details || err.message));
          setTranscription('');
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Recording error:', err);
      setError('Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.log('No file selected');
      setError('No file selected');
      return;
    }

    console.log('Selected file:', file.name, file.type, file.size);
    const formData = new FormData();
    formData.append('audio', file);

    try {
      setTranscription('Processing audio...');
      setError('');
      const response = await axios.post('http://localhost:3000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Upload response:', response.data);
      setTranscription(response.data.transcription);
      const transcriptionsResponse = await axios.get('http://localhost:3000/transcriptions');
      setPastTranscriptions(transcriptionsResponse.data.data || []);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to transcribe: ' + (err.response?.data?.details || err.message));
      setTranscription('');
    }
  };

  const handleDeleteTranscription = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/transcriptions/${id}`);
      setPastTranscriptions(pastTranscriptions.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete transcription: ' + (err.response?.data?.details || err.message));
    }
  };

  const triggerFileInput = () => {
    console.log('Triggering file input');
    fileInputRef.current.click();
  };

  const exportToCSV = () => {
    if (pastTranscriptions.length === 0) {
      setError('No transcriptions to export');
      return;
    }

    // Create CSV content
    const headers = ['ID,Filename,Transcription,Created At'];
    const rows = pastTranscriptions.map((t) =>
      `${t.id},"${t.filename.replace(/"/g, '""')}","${t.transcription.replace(/"/g, '""')}",${t.created_at}`
    );
    const csvContent = [...headers, ...rows].join('\n');

    // Create downloadable file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'transcriptions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('Exported transcriptions to CSV');
  };

  return (
    <div className="App">
      <h1>Audio Transcription App</h1>
      <div>
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          id="audio-upload"
          ref={fileInputRef}
        />
        <button onClick={triggerFileInput} className="upload-btn">
          <FaUpload /> Upload Audio
        </button>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={isRecording ? 'stop-btn' : 'record-btn'}
        >
          {isRecording ? <FaStop /> : <FaMicrophone />}
          {isRecording ? ' Stop Recording' : ' Start Recording'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <h2>Transcription</h2>
      <p>{transcription || 'No transcription yet'}</p>
      <h2>Past Transcriptions</h2>
      {pastTranscriptions.length > 0 ? (
        <>
          <button onClick={exportToCSV} className="export-btn">
            <FaFileExport /> Export as CSV
          </button>
          <ul>
            {pastTranscriptions.map((t) => (
              <li key={t.id}>
                <strong>{t.filename}</strong> ({new Date(t.created_at).toLocaleString()}): {t.transcription}
                <button
                  onClick={() => handleDeleteTranscription(t.id)}
                  className="delete-btn"
                >
                  <FaTrash /> Delete
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>No past transcriptions available</p>
      )}
    </div>
  );
}

export default App;