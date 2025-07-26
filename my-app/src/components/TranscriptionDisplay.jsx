import React from 'react';

const TranscriptionDisplay = ({ transcription }) => (
  <div className="transcription-section mb-16">
    <h2 className="text-3xl font-semibold mb-6 text-cyan-400 animate-neon-glow">Active Data Transcription</h2>
    <div className="p-8 bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-xl border border-cyan-500/20 backdrop-blur-lg min-h-[200px] transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10 transform hover:-translate-y-1">
      {transcription || 'No transcription data. Initialize capture or upload stream.'}
    </div>
  </div>
);

export default TranscriptionDisplay;