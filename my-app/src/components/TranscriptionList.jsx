import React, { useState } from 'react';
import axios from 'axios';
import { FaSearch, FaFileExport, FaEdit, FaTrash, FaSave, FaTimes, FaArrowLeft, FaArrowRight } from 'react-icons/fa';

const TranscriptionList = ({ user, pastTranscriptions, loading, setError, currentPage, totalPages, setCurrentPage }) => {
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleDeleteTranscription = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transcription?')) return;
    try {
      setLoading(true);
      await axios.delete(`https://audio-transcription-backend-llwb.onrender.com/transcriptions/${id}`, { headers: { Authorization: `Bearer ${user.access_token}` } });
      setPastTranscriptions(pastTranscriptions.filter(t => t.id !== id));
      if (pastTranscriptions.length <= 1 && currentPage > 1) setCurrentPage(currentPage - 1);
    } catch (err) {
      setError('Failed to delete transcription: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (id, text) => { setEditingId(id); setEditText(text); };
  const cancelEditing = () => { setEditingId(null); setEditText(''); };
  const saveEditing = async (id) => {
    if (!editText.trim()) {
      setError('Transcription text cannot be empty');
      return;
    }
    try {
      setLoading(true);
      const response = await axios.put(`https://audio-transcription-backend-llwb.onrender.com/transcriptions/${id}`, { transcription: editText.trim() }, { headers: { Authorization: `Bearer ${user.access_token}` } });
      setPastTranscriptions(pastTranscriptions.map(t => t.id === id ? { ...t, transcription: response.data.data.transcription, updated_at: response.data.data.updated_at } : t));
      setEditingId(null);
      setEditText('');
    } catch (err) {
      setError('Failed to update transcription: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (pastTranscriptions.length === 0) {
      setError('No transcriptions to export');
      return;
    }
    const headers = ['ID', 'Filename', 'Transcription', 'Created At', 'Updated At'];
    const csvRows = [headers.join(',')];
    pastTranscriptions.forEach(t => {
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
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const filteredTranscriptions = pastTranscriptions.filter(t =>
    t.transcription?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.filename?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const goToPreviousPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const goToNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  return (
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
      {filteredTranscriptions.length > 0 ? (
        <>
          <ul className="space-y-6">
            {filteredTranscriptions.map(t => (
              <li key={t.id} className="p-8 bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-xl border border-cyan-500/20 backdrop-blur-lg transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10 transform hover:-translate-y-1">
                <div className="transcription-header flex justify-between items-center mb-6">
                  <strong className="text-cyan-400 text-lg">{t.filename}</strong>
                  <span className="text-gray-400 text-sm">{new Date(t.created_at).toLocaleString()}{t.updated_at && ` (Updated: ${new Date(t.updated_at).toLocaleString()})`}</span>
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
            <span className="text-cyan-400 animate-neon-glow">Node {currentPage} / {totalPages}</span>
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
  );
};

export default TranscriptionList;