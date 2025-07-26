import React, { useState } from 'react';
import { FaSignInAlt, FaGoogle } from 'react-icons/fa';

const AuthComponent = ({ supabase, user, setUser, loading, setLoading, setError, error }) => { // Added setLoading to props
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    try {
      setError('');
      setLoading(true);
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
      setUser({ ...data.user, access_token: data.session.access_token });
      setEmail('');
      setPassword('');
    } catch (err) {
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
      const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
      if (authError) throw authError;
      setError('Sign-up successful! Check your email to confirm your account.');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError('Sign-up failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'https://audio-transcription-app-one.vercel.app/', queryParams: { prompt: 'select_account' } },
      });
      if (authError) throw authError;
    } catch (err) {
      setError('Google login failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
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
  );
};

export default AuthComponent;