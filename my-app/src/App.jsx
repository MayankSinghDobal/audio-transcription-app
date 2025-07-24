import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FaMicrophone, FaStop, FaUpload, FaTrash, FaFileExport, FaSignInAlt, FaSignOutAlt, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

function App() {
  const [transcription, setTranscription] = useState('');
  const [pastTranscriptions, setPastTranscriptions] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  // Check and refresh user session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user && session?.access_token) {
          setUser({ ...session.user, access_token: session.access_token });
          console.log('Session checked:', session.user.email, 'Token exists:', !!session.access_token);
        } else {
          console.log('No active session or missing token');
          setUser(null);
        }
      } catch (err) {
        console.error('Session check error:', err.message);
        setError('Failed to check session: ' + err.message);
      }
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      
      if (session?.user && session?.access_token) {
        setUser({ ...session.user, access_token: session.access_token });
        console.log('Auth state changed:', event, session.user.email, 'Token exists:', !!session.access_token);
      } else {
        setUser(null);
        console.log('Auth state changed:', event, 'No user or token');
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Fetch past transcriptions when user changes
  useEffect(() => {
    if (user && user.access_token) {
      fetchTranscriptions();
    } else {
      setPastTranscriptions([]);
    }
  }, [user]);

  const fetchTranscriptions = async () => {
    if (!user?.access_token) return;
    
    try {
      setLoading(true);
      console.log('Fetching transcriptions...');
      const response = await axios.get('http://localhost:3000/transcriptions', {
        headers: { Authorization: `Bearer ${user.access_token}` },
      });
      setPastTranscriptions(response.data.data || []);
      console.log('Transcriptions fetched:', response.data.data?.length || 0);
    } catch (err) {
      console.error('Error fetching transcriptions:', err);
      setError('Failed to fetch past transcriptions: ' + (err.response?.data?.details || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setError('');
      setLoading(true);
      console.log('Attempting login with:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });
      
      if (error) throw error;
      
      console.log('Login successful, User:', data.user.email, 'Token exists:', !!data.session.access_token);
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setError('');
      setLoading(true);
      console.log('Attempting signup with:', email);
      
      const { data, error } = await supabase.auth.signUp({ 
        email: email.trim(), 
        password 
      });
      
      if (error) throw error;
      
      console.log('Signup response:', data);
      setError('Sign-up successful! Check your email to confirm your account.');
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error('Sign-up error:', err);
      setError('Sign-up failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setTranscription('');
      setPastTranscriptions([]);
      setEmail('');
      setPassword('');
      setError('');
      setEditingId(null);
      setEditText('');
      console.log('Logout successful');
    } catch (err) {
      console.error('Logout error:', err);
      setError('Logout failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    if (!user) {
      setError('Please log in to record audio');
      return;
    }

    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Recording stopped, blob size:', audioBlob.size);
        
        if (audioBlob.size === 0) {
          setError('Recording failed - no audio data captured');
          return;
        }

        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
          setLoading(true);
          setTranscription('Processing audio...');
          setError('');
          
          console.log('Uploading recording...');
          const response = await axios.post('http://localhost:3000/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${user.access_token}`,
            },
            timeout: 60000,
          });
          
          setTranscription(response.data.transcription);
          console.log('Upload successful');
          
          await fetchTranscriptions();
        } catch (err) {
          console.error('Upload error:', err);
          setError('Failed to transcribe: ' + (err.response?.data?.details || err.message));
          setTranscription('');
        } finally {
          setLoading(false);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Recording error:', err);
      setError('Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('Stopping recording...');
    }
  };

  const handleFileUpload = async (event) => {
    if (!user) {
      setError('Please log in to upload audio');
      return;
    }

    const file = event.target.files[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('Selected file:', file.name, file.type, 'Size:', file.size);

    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/m4a', 'video/webm', 'video/mp4'];
    if (!validTypes.includes(file.type)) {
      setError(`Unsupported file type: ${file.type}`);
      return;
    }

    const formData = new FormData();
    formData.append('audio', file);

    try {
      setLoading(true);
      setTranscription('Processing audio...');
      setError('');
      
      const response = await axios.post('http://localhost:3000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.access_token}`,
        },
        timeout: 60000,
      });
      
      console.log('Upload response:', response.data);
      setTranscription(response.data.transcription);
      
      await fetchTranscriptions();
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to transcribe: ' + (err.response?.data?.details || err.message));
      setTranscription('');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteTranscription = async (id) => {
    if (!user) {
      setError('Please log in to delete transcriptions');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this transcription?')) {
      return;
    }

    try {
      setLoading(true);
      console.log('Deleting transcription:', id);
      
      await axios.delete(`http://localhost:3000/transcriptions/${id}`, {
        headers: { Authorization: `Bearer ${user.access_token}` },
      });
      
      setPastTranscriptions(pastTranscriptions.filter((t) => t.id !== id));
      console.log('Deleted transcription:', id);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete transcription: ' + (err.response?.data?.details || err.message));
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (id, text) => {
    setEditingId(id);
    setEditText(text);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEditing = async (id) => {
    if (!user) {
      setError('Please log in to edit transcriptions');
      return;
    }

    if (!editText.trim()) {
      setError('Transcription text cannot be empty');
      return;
    }

    try {
      setLoading(true);
      console.log('Updating transcription:', id);
      
      const response = await axios.put(`http://localhost:3000/transcriptions/${id}`, {
        transcription: editText.trim(),
      }, {
        headers: { Authorization: `Bearer ${user.access_token}` },
      });

      setPastTranscriptions(pastTranscriptions.map((t) =>
        t.id === id ? { ...t, transcription: response.data.data.transcription, updated_at: response.data.data.updated_at } : t
      ));
      console.log('Updated transcription:', id);
      setEditingId(null);
      setEditText('');
    } catch (err) {
      console.error('Update error:', err);
      setError('Failed to update transcription: ' + (err.response?.data?.details || err.message));
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    if (!user) {
      setError('Please log in to upload audio');
      return;
    }
    console.log('Triggering file input');
    fileInputRef.current?.click();
  };

  const exportToCSV = () => {
    if (!user) {
      setError('Please log in to export transcriptions');
      return;
    }
    if (pastTranscriptions.length === 0) {
      setError('No transcriptions to export');
      return;
    }

    try {
      const headers = ['ID', 'Filename', 'Transcription', 'Created At', 'Updated At'];
      const csvRows = [headers.join(',')];
      
      pastTranscriptions.forEach((t) => {
        const row = [
          t.id,
          `"${(t.filename || '').replace(/"/g, '""')}"`,
          `"${(t.transcription || '').replace(/"/g, '""')}"`,
          `"${new Date(t.created_at).toLocaleString()}"`,
          `"${t.updated_at ? new Date(t.updated_at).toLocaleString() : ''}"`
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `transcriptions_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Exported transcriptions to CSV');
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export transcriptions');
    }
  };

  return (
    <div className="App">
      <h1>Audio Transcription App</h1>
      
      {user ? (
        <>
          <div className="user-info">
            <p>Welcome, {user.email}</p>
            <button onClick={handleLogout} className="logout-btn" disabled={loading}>
              <FaSignOutAlt /> {loading ? 'Logging out...' : 'Logout'}
            </button>
          </div>

          <div className="controls">
            <input
              type="file"
              accept="audio/*,video/webm,video/mp4"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="audio-upload"
              ref={fileInputRef}
              disabled={loading}
            />
            <button onClick={triggerFileInput} className="upload-btn" disabled={loading}>
              <FaUpload /> Upload Audio
            </button>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={isRecording ? 'stop-btn' : 'record-btn'}
              disabled={loading && !isRecording}
            >
              {isRecording ? <FaStop /> : <FaMicrophone />}
              {isRecording ? ' Stop Recording' : ' Start Recording'}
            </button>
          </div>

          {error && <div className="error">{error}</div>}
          {loading && <div className="loading">Processing...</div>}

          <div className="transcription-section">
            <h2>Current Transcription</h2>
            <div className="transcription-text">
              {transcription || 'No transcription yet. Upload an audio file or start recording.'}
            </div>
          </div>

          <div className="past-transcriptions">
            <h2>Past Transcriptions ({pastTranscriptions.length})</h2>
            {pastTranscriptions.length > 0 ? (
              <>
                <button onClick={exportToCSV} className="export-btn" disabled={loading}>
                  <FaFileExport /> Export as CSV
                </button>
                <ul className="transcriptions-list">
                  {pastTranscriptions.map((t) => (
                    <li key={t.id} className="transcription-item">
                      <div className="transcription-header">
                        <strong>{t.filename}</strong>
                        <span className="transcription-date">
                          {new Date(t.created_at).toLocaleString()}
                          {t.updated_at && ` (Updated: ${new Date(t.updated_at).toLocaleString()})`}
                        </span>
                      </div>
                      {editingId === t.id ? (
                        <div className="edit-container">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="edit-textarea"
                            disabled={loading}
                          />
                          <div className="edit-buttons">
                            <button
                              onClick={() => saveEditing(t.id)}
                              className="save-btn"
                              disabled={loading || !editText.trim()}
                            >
                              <FaSave /> Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="cancel-btn"
                              disabled={loading}
                            >
                              <FaTimes /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="transcription-content">
                          {t.transcription}
                          <button
                            onClick={() => startEditing(t.id, t.transcription)}
                            className="edit-btn"
                            disabled={loading}
                          >
                            <FaEdit /> Edit
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => handleDeleteTranscription(t.id)}
                        className="delete-btn"
                        disabled={loading}
                      >
                        <FaTrash /> Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>No past transcriptions available. Upload an audio file to get started!</p>
            )}
          </div>
        </>
      ) : (
        <div className="auth-form">
          <h2>Login or Sign Up</h2>
          <div className="form-inputs">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <div className="form-buttons">
            <button onClick={handleLogin} className="login-btn" disabled={loading}>
              <FaSignInAlt /> {loading ? 'Logging in...' : 'Login'}
            </button>
            <button onClick={handleSignUp} className="signup-btn" disabled={loading}>
              <FaSignInAlt /> {loading ? 'Signing up...' : 'Sign Up'}
            </button>
          </div>
          {error && <div className="error">{error}</div>}
        </div>
      )}
    </div>
  );
}

export default App;