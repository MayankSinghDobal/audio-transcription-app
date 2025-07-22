import React, { useEffect, useState } from 'react';
import axios from 'axios';

const TranscriptionList = () => {
  const [transcriptions, setTranscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTranscriptions = async () => {
      try {
        const res = await axios.get('http://localhost:5000/transcriptions');
        setTranscriptions(res.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching transcriptions:', error);
        setLoading(false);
      }
    };

    fetchTranscriptions();
  }, []);

  if (loading) return <div className="text-center mt-4">Loading...</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Previous Transcriptions</h2>
      <div className="space-y-4">
        {transcriptions.map((item) => (
          <div key={item.id} className="p-4 border rounded shadow">
            <p className="text-gray-700"><strong>Audio URL:</strong> {item.audio_url}</p>
            <p className="text-gray-900"><strong>Transcription:</strong> {item.transcription}</p>
            <p className="text-gray-500 text-sm">Created At: {new Date(item.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
      <a href={item.audio_url} target="_blank" className="text-blue-500 underline">Listen Audio</a>
    </div>
  );
};

export default TranscriptionList;
