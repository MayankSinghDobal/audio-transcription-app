const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const Replicate = require('replicate');
require('dotenv').config();

const app = express();
const port = 3000;

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY,
});

// Enable CORS
app.use(cors());

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Create uploads folder if it doesn't exist
const fs = require('fs');
const uploadDir = 'uploads';
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
    res.status(500).json({ error: 'Failed to connect to Supabase', details: error.message });
  }
});

// File upload and transcription route
app.post('/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Read the uploaded file
    const filePath = path.join(__dirname, 'uploads', req.file.filename);
    const fileBuffer = fs.readFileSync(filePath);

    // Convert buffer to base64 for Replicate API
    const base64Audio = fileBuffer.toString('base64');
    const mimeType = req.file.mimetype; // e.g., audio/m午

    // Send to Replicate for transcription
    const output = await replicate.run(
      'openai/whisper:ea14436766137b3a2633236b9661b7d28f79ac10',
      {
        input: {
          audio: `data:${mimeType};base64,${base64Audio}`,
          model: 'large-v3',
        },
      }
    );

    const transcription = output.output;

    // Save to Supabase
    const { error: dbError } = await supabase
      .from('transcriptions')
      .insert([{ filename: req.file.filename, transcription }]);

    if (dbError) throw dbError;

    // Delete the file from server (optional, to save space)
    fs.unlinkSync(filePath);

    res.json({ message: 'File uploaded and transcribed', transcription });
  } catch (error) {
    res.status(500).json({ error: 'Transcription failed', details: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});