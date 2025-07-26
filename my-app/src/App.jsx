import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import AuthComponent from './components/AuthComponent';
import TranscriptionControls from './components/TranscriptionControls';
import TranscriptionDisplay from './components/TranscriptionDisplay';
import TranscriptionList from './components/TranscriptionList';
import DragonAnimation from './DragonAnimation';
import './App.css';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

function App() {
  const [user, setUser] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [pastTranscriptions, setPastTranscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      setUser(session?.user && session?.access_token ? { ...session.user, access_token: session.access_token } : null);
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user && session?.access_token ? { ...session.user, access_token: session.access_token } : null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user?.access_token) fetchTranscriptions();
  }, [user, currentPage]);

  const fetchTranscriptions = async () => {
    if (!user?.access_token) return;
    try {
      setLoading(true);
      const response = await axios.get('https://audio-transcription-backend-llwb.onrender.com/transcriptions', {
        headers: { Authorization: `Bearer ${user.access_token}` },
        params: { page: currentPage, limit: itemsPerPage },
      });
      setPastTranscriptions(response.data.data || []);
      setTotalPages(Math.max(1, Math.ceil((response.data.total || 0) / itemsPerPage)));
    } catch (err) {
      setError('Failed to fetch transcriptions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="holo-bg absolute inset-0 animate-holo"></div>
        <div className="grid-bg absolute inset-0"></div>
        {window.innerWidth > 768 && (
          <div className="particle-field absolute inset-0">
            <DragonAnimation />
          </div>
        )}
      </div>
      <div className="container mx-auto px-4 py-8 relative z-10">
        <h1 className="text-5xl md:text-6xl font-bold text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-600 animate-neon-glow">
          Quantum Transcription Nexus
        </h1>
        <AuthComponent supabase={supabase} user={user} setUser={setUser} loading={loading} setError={setError} error={error} /> {/* Added supabase prop */}
        {user && (
          <>
            <TranscriptionControls
              user={user}
              loading={loading}
              setTranscription={setTranscription}
              setError={setError}
              fetchTranscriptions={fetchTranscriptions}
              setCurrentPage={setCurrentPage}
            />
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
            <TranscriptionDisplay transcription={transcription} />
            <TranscriptionList
              user={user}
              pastTranscriptions={pastTranscriptions}
              loading={loading}
              setError={setError}
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;