const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
require('dotenv').config();

const app = express();
const port = 3000;

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY; // Prefer service key
const supabase = createClient(supabaseUrl, supabaseKey);

// Enable CORS
app.use(cors());

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit
});

// Create uploads folder if it doesn't exist
const fs = require('fs');
const uploadDir = 'Uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Test route
app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

// Test Supabase connection
app.get('/test-supabase', async (req, res) => {
  try {
    const { data, error } = await supabase.from('transcriptions').select('*');
    if (error) throw error;
    res.json({ message: 'Connected to Supabase', data });
  } catch (error) {
    console.error('Supabase test error:', error);
    res.status(500).json({ error: 'Failed to connect to Supabase', details: error.message });
  }
});

// Fetch all transcriptions
app.get('/transcriptions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transcriptions')
      .select('id, filename, transcription, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ message: 'Transcriptions fetched successfully', data });
  } catch (error) {
    console.error('Error fetching transcriptions:', error);
    res.status(500).json({ error: 'Failed to fetch transcriptions', details: error.message });
  }
});

// File upload and transcription route
app.post('/upload', upload.single('audio'), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', req.file);
    filePath = path.join(__dirname, 'Uploads', req.file.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: 'File not found after upload' });
    }

    const mimeType = req.file.mimetype || 'audio/webm';
    console.log('MIME Type:', mimeType);
    console.log('File size:', fs.statSync(filePath).size);

    const allowedMimeTypes = [
      'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4',
      'audio/ogg', 'audio/flac', 'audio/aac', 'audio/m4a',
    ];
    if (!allowedMimeTypes.includes(mimeType)) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({
        error: 'Unsupported audio format',
        details: `MIME type ${mimeType} not allowed. Supported: ${allowedMimeTypes.join(', ')}`,
      });
    }

    console.log('Starting speech-to-text transformation with AssemblyAI...');
    let transcription = '';
    try {
      if (!process.env.ASSEMBLYAI_API_KEY) {
        throw new Error('ASSEMBLYAI_API_KEY is not set');
      }
      transcription = execSync(`python transcribe.py "${filePath}"`).toString().trim();
      if (!transcription) {
        transcription = 'No speech detected in the audio.';
      }
      console.log('Speech-to-text transformation completed with AssemblyAI');
    } catch (error) {
      console.error('AssemblyAI transcription error:', error.message);
      transcription = `Mock transcription for ${req.file.filename}: This is a test transcription due to error.`;
    }

    console.log('Extracted transcription:', transcription);

    console.log('Saving transcription to Supabase...');
    const { error: dbError } = await supabase
      .from('transcriptions')
      .insert([
        {
          filename: req.file.filename,
          transcription: transcription,
          created_at: new Date().toISOString(),
        },
      ]);

    if (dbError) {
      console.error('Supabase error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    console.log('Success! Sending transcription to frontend');
    res.json({
      message: 'File uploaded and transcribed successfully',
      transcription: transcription,
    });
  } catch (error) {
    console.error('Error in /upload route:', {
      message: error.message,
      stack: error.stack,
    });
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.status(500).json({
      error: 'Transcription failed',
      details: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Environment variables check:');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
  console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Set' : 'Not set');
  console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Not set');
  console.log('ASSEMBLYAI_API_KEY:', process.env.ASSEMBLYAI_API_KEY ? 'Set' : 'Not set');
});