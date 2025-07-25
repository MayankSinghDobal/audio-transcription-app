import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FaMicrophone, FaStop, FaUpload, FaTrash, FaFileExport, FaSignInAlt, FaSignOutAlt, FaEdit, FaSave, FaTimes, FaSearch, FaArrowLeft, FaArrowRight, FaGoogle } from 'react-icons/fa';
import { createClient } from '@supabase/supabase-js';
import DragonAnimation from './DragonAnimation';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
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

  // Fetch past transcriptions when user, search query, or page changes
  useEffect(() => {
    if (user && user.access_token) {
      fetchTranscriptions();
    } else {
      setPastTranscriptions([]);
      setCurrentPage(1);
      setTotalPages(1);
    }
  }, [user, searchQuery, currentPage]);

  const fetchTranscriptions = async () => {
    if (!user?.access_token) return;
    
    try {
      setLoading(true);
      console.log('Fetching transcriptions with query:', searchQuery, 'page:', currentPage);
      const response = await axios.get('https://audio-transcription-backend-llwb.onrender.com/transcriptions', {
        headers: { Authorization: `Bearer ${user.access_token}` },
        params: { 
          query: searchQuery,
          page: currentPage,
          limit: itemsPerPage
        },
      });
      setPastTranscriptions(response.data.data || []);
      setTotalPages(Math.max(1, Math.ceil((response.data.total || 0) / itemsPerPage)));
      console.log('Transcriptions fetched:', response.data.data?.length || 0, 'Total:', response.data.total, 'Pages:', totalPages);
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

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      console.log('Attempting Google login');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://audio-transcription-app-one.vercel.app/'
        }
      });
      
      if (error) throw error;
      console.log('Google login initiated');
    } catch (err) {
      console.error('Google login error:', err);
      setError('Google login failed: ' + err.message);
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
      setSearchQuery('');
      setCurrentPage(1);
      setTotalPages(1);
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
          const response = await axios.post('https://audio-transcription-backend-llwb.onrender.com/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${user.access_token}`,
            },
            timeout: 60000,
          });
          
          setTranscription(response.data.transcription);
          console.log('Upload successful');
          setCurrentPage(1); // Reset to first page after new transcription
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
      
      const response = await axios.post('https://audio-transcription-backend-llwb.onrender.com/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.access_token}`,
        },
        timeout: 60000,
      });
      
      console.log('Upload response:', response.data);
      setTranscription(response.data.transcription);
      setCurrentPage(1); // Reset to first page after new transcription
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
      
      await axios.delete(`https://audio-transcription-backend-llwb.onrender.com/transcriptions/${id}`, {
        headers: { Authorization: `Bearer ${user.access_token}` },
      });
      
      setPastTranscriptions(pastTranscriptions.filter((t) => t.id !== id));
      console.log('Deleted transcription:', id);
      if (pastTranscriptions.length <= 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1); // Go to previous page if current page is empty
      }
      await fetchTranscriptions();
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
      
      const response = await axios.put(`https://audio-transcription-backend-llwb.onrender.com/transcriptions/${id}`, {
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
      await fetchTranscriptions(); // Refresh to ensure pagination consistency
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

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="holo-bg absolute inset-0 animate-holo"></div>
        <div className="grid-bg absolute inset-0"></div>
        <div className="particle-field absolute inset-0">
          <DragonAnimation />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <h1 className="text-5xl md:text-6xl font-bold text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-600 animate-neon-glow">
          Quantum Transcription Nexus
        </h1>

        {user ? (
          <>
            <div className="user-panel mb-12 p-6 bg-gradient-to-r from-gray-900/80 to-gray-800/80 rounded-xl border border-cyan-500/20 backdrop-blur-lg hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500">
              <div className="flex justify-between items-center">
                <p className="text-lg text-cyan-300">Neural Operative: {user.email}</p>
                <button
                  onClick={handleLogout}
                  className="holo-btn flex items-center px-6 py-3 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  <FaSignOutAlt className="mr-2" />
                  {loading ? 'Disconnecting...' : 'Disconnect Nexus'}
                </button>
              </div>
            </div>

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
                onClick={isRecording ? stopRecording : startRecording}
                className={`holo-btn flex items-center justify-center px-8 py-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${isRecording ? 'bg-red-600/20 hover:bg-red-600/40 border-red-500/50 hover:shadow-red-500/30' : 'bg-green-600/20 hover:bg-green-600/40 border-green-500/50 hover:shadow-green-500/30'}`}
                disabled={loading && !isRecording}
              >
                {isRecording ? <FaStop className="mr-2 animate-pulse" /> : <FaMicrophone className="mr-2 animate-pulse" />}
                {isRecording ? 'Terminate Stream' : 'Initiate Audio Capture'}
              </button>
            </div>

            {error && (
              <div className="mb-12 p-6 bg-red-900/20 border border-red-500/50 rounded-xl text-red-300 animate-error-pulse backdrop-blur-lg">
                {error}
              </div>
            )}
            {loading && (
              <div className="mb-12 p-6 bg-cyan-900/20 border border-cyan-500/50 rounded-xl text-cyan-300 flex items-center justify-center backdrop-blur-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mr-3"></div>
                Processing Data Stream...
              </div>
            )}

            <div className="transcription-section mb-16">
              <h2 className="text-3xl font-semibold mb-6 text-cyan-400 animate-neon-glow">Active Data Transcription</h2>
              <div className="p-8 bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-xl border border-cyan-500/20 backdrop-blur-lg min-h-[200px] transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10 transform hover:-translate-y-1">
                {transcription || 'No transcription data. Initialize capture or upload stream.'}
              </div>
            </div>

            <div className="past-transcriptions">
              <h2 className="text-3xl font-semibold mb-6 text-cyan-400 animate-neon-glow">Data Archives ({pastTranscriptions.length})</h2>
              <div className="flex flex-col md:flex-row gap-6 mb-8">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    placeholder="Query Data Archives..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="search-input w-full p-4 pl-12 bg-gray-900/50 border border-cyan-500/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-400 transition-all duration-300"
                    disabled={loading}
                  />
                  <FaSearch className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-cyan-400 ${loading ? 'animate-spin' : 'animate-pulse'}`} />
                </div>
                <button
                  onClick={exportToCSV}
                  className="holo-btn flex items-center px-8 py-4 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  <FaFileExport className="mr-2 animate-pulse" /> Export Data Matrix
                </button>
              </div>
              {pastTranscriptions.length > 0 ? (
                <>
                  <ul className="space-y-6">
                    {pastTranscriptions.map((t) => (
                      <li
                        key={t.id}
                        className="p-8 bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-xl border border-cyan-500/20 backdrop-blur-lg transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10 transform hover:-translate-y-1"
                      >
                        <div className="transcription-header flex justify-between items-center mb-6">
                          <strong className="text-cyan-400 text-lg">{t.filename}</strong>
                          <span className="text-gray-400 text-sm">
                            {new Date(t.created_at).toLocaleString()}
                            {t.updated_at && ` (Updated: ${new Date(t.updated_at).toLocaleString()})`}
                          </span>
                        </div>
                        {editingId === t.id ? (
                          <div className="edit-container">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full p-4 bg-gray-900/50 border border-cyan-500/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white min-h-[120px] transition-all duration-300"
                              disabled={loading}
                            />
                            <div className="edit-buttons flex gap-4 mt-6">
                              <button
                                onClick={() => saveEditing(t.id)}
                                className="holo-btn flex items-center px-6 py-3 bg-green-600/20 hover:bg-green-600/40 border border-green-500/50 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading || !editText.trim()}
                              >
                                <FaSave className="mr-2 animate-pulse" /> Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="holo-btn flex items-center px-6 py-3 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading}
                              >
                                <FaTimes className="mr-2 animate-pulse" /> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="transcription-content flex justify-between items-start">
                            <div className="flex-1 text-gray-200">{t.transcription}</div>
                            <button
                              onClick={() => startEditing(t.id, t.transcription)}
                              className="holo-btn flex items-center px-6 py-3 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/50 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed ml-4"
                              disabled={loading}
                            >
                              <FaEdit className="mr-2 animate-pulse" /> Modify
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteTranscription(t.id)}
                          className="holo-btn flex items-center px-6 py-3 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={loading}
                        >
                          <FaTrash className="mr-2 animate-pulse" /> Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="pagination flex justify-center items-center gap-6 mt-12">
                    <button
                      onClick={goToPreviousPage}
                      className="holo-btn flex items-center px-6 py-3 bg-gray-800/50 hover:bg-gray-800/70 border border-cyan-500/20 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading || currentPage === 1}
                    >
                      <FaArrowLeft className="mr-2 animate-pulse" /> Previous Node
                    </button>
                    <span className="text-cyan-400 animate-neon-glow">
                      Node {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={goToNextPage}
                      className="holo-btn flex items-center px-6 py-3 bg-gray-800/50 hover:bg-gray-800/70 border border-cyan-500/20 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading || currentPage === totalPages}
                    >
                      Next Node <FaArrowRight className="ml-2 animate-pulse" />
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-gray-400 animate-pulse">No archived data streams. Initialize capture or upload to begin.</p>
              )}
            </div>
          </>
        ) : (
          <div className="auth-form max-w-lg mx-auto p-8 bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-xl border border-cyan-500/20 backdrop-blur-lg transform hover:-translate-y-2 transition-all duration-500">
            <h2 className="text-3xl font-semibold mb-8 text-cyan-400 animate-neon-glow">Access Quantum Nexus</h2>
            <div className="form-inputs space-y-6">
              <input
                type="email"
                placeholder="Neural Id (Email)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-gray-900/50 border border-cyan-500/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-400 transition-all duration-300 transform hover:-translate-y-1"
                disabled={loading}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-gray-900/50 border border-cyan-500/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-400 transition-all duration-300 transform hover:-translate-y-1"
                disabled={loading}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="form-buttons flex flex-col gap-4 mt-8">
              <button
                onClick={handleLogin}
                className="holo-btn flex items-center justify-center px-8 py-4 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/20 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                <FaSignInAlt className="mr-2 animate-pulse" />
                {loading ? 'Accessing...' : 'Login Nexus'}
              </button>
              <button
                onClick={handleSignUp}
                className="holo-btn flex items-center justify-center px-8 py-4 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                <FaSignInAlt className="mr-2 animate-pulse" />
                {loading ? 'Registering...' : 'Register Operative'}
              </button>
              <button
                onClick={handleGoogleLogin}
                className="holo-btn flex items-center justify-center px-8 py-4 bg-gray-700/50 hover:bg-gray-700/70 border border-gray-500/50 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-gray-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                <FaGoogle className="mr-2 animate-pulse" />
                {loading ? 'Accessing...' : 'Access via Google'}
              </button>
            </div>
            {error && (
              <div className="mt-8 p-6 bg-red-900/20 border border-red-500/50 rounded-xl text-red-300 animate-error-pulse backdrop-blur-lg">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;