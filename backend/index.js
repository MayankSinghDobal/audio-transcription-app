const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = 3000;

// Initialize Supabase with service role key for backend operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_KEY;

// Create two Supabase clients
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Enable CORS with specific headers
app.use(cors({
  origin: 'https://audio-transcription-app-one.vercel.app',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Middleware to verify JWT using Supabase
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('Auth Header:', authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No token provided');
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  console.log('Token received, length:', token.length);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Supabase auth error:', error);
      return res.status(401).json({ 
        error: 'Unauthorized: Invalid token', 
        details: error?.message || 'User not found' 
      });
    }
    
    console.log('Authenticated user:', user.id, user.email);
    req.user = { sub: user.id, email: user.email };
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401).json({ 
      error: 'Unauthorized: Token verification failed', 
      details: error.message 
    });
  }
};

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
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Create uploads folder
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
    const { data, error } = await supabaseAdmin.from('transcriptions').select('count');
    if (error) throw error;
    res.json({ message: 'Connected to Supabase', data });
  } catch (error) {
    console.error('Supabase test error:', error);
    res.status(500).json({ error: 'Failed to connect to Supabase', details: error.message });
  }
});

// Fetch user's transcriptions with optional search and pagination
app.get('/transcriptions', authenticate, async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    console.log('Fetching transcriptions for user:', req.user.sub, 'with query:', query, 'page:', pageNum, 'limit:', limitNum);
    
    // Calculate offset
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let supabaseQuery = supabaseAdmin
      .from('transcriptions')
      .select('id, filename, transcription, created_at, updated_at', { count: 'exact' })
      .eq('user_id', req.user.sub)
      .order('created_at', { ascending: false });

    if (query && query.trim()) {
      const searchPattern = `%${query.trim()}%`;
      supabaseQuery = supabaseQuery.or(`filename.ilike.${searchPattern},transcription.ilike.${searchPattern}`);
    }

    // Apply pagination
    supabaseQuery = supabaseQuery.range(offset, offset + limitNum - 1);

    const { data, error, count } = await supabaseQuery;
    
    if (error) throw error;
    
    console.log('Fetched transcriptions count:', data?.length || 0, 'Total count:', count);
    res.json({ 
      message: 'Transcriptions fetched successfully', 
      data: data || [], 
      total: count || 0 
    });
  } catch (error) {
    console.error('Error fetching transcriptions:', error);
    res.status(500).json({ error: 'Failed to fetch transcriptions', details: error.message });
  }
});

// Update transcription
app.put('/transcriptions/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { transcription } = req.body;
    console.log('Updating transcription:', id, 'for user:', req.user.sub);

    if (!transcription || typeof transcription !== 'string') {
      return res.status(400).json({ error: 'Invalid transcription text' });
    }

    const { data, error } = await supabaseAdmin
      .from('transcriptions')
      .update({ transcription, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', req.user.sub)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Transcription not found or not owned by user' });
    }

    console.log('Successfully updated transcription:', id);
    res.json({ message: 'Transcription updated successfully', data: data[0] });
  } catch (error) {
    console.error('Error updating transcription:', error);
    res.status(500).json({ error: 'Failed to update transcription', details: error.message });
  }
});

// Delete user's transcription
app.delete('/transcriptions/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Deleting transcription:', id, 'for user:', req.user.sub);
    
    const { error } = await supabaseAdmin
      .from('transcriptions')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.sub);
    
    if (error) throw error;
    
    console.log('Successfully deleted transcription:', id);
    res.json({ message: `Transcription with id ${id} deleted successfully` });
  } catch (error) {
    console.error('Error deleting transcription:', error);
    res.status(500).json({ error: 'Failed to delete transcription', details: error.message });
  }
});

// File upload and transcription
app.post('/upload', authenticate, upload.single('audio'), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', req.file.filename, 'Size:', req.file.size, 'Type:', req.file.mimetype);
    filePath = path.join(__dirname, 'Uploads', req.file.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: 'File not found after upload' });
    }

    const mimeType = req.file.mimetype || 'audio/webm';
    console.log('Processing file with MIME Type:', mimeType);

    const allowedMimeTypes = [
      'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4',
      'audio/ogg', 'audio/flac', 'audio/aac', 'audio/m4a',
      'video/webm', 'video/mp4'
    ];
    
    if (!allowedMimeTypes.includes(mimeType)) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({
        error: 'Unsupported audio format',
        details: `MIME type ${mimeType} not allowed. Supported: ${allowedMimeTypes.join(', ')}`,
      });
    }

    console.log('Starting transcription process...');
    let transcription = '';
    
    try {
      if (!process.env.ASSEMBLYAI_API_KEY) {
        throw new Error('ASSEMBLYAI_API_KEY is not set');
      }
      
      transcription = execSync(`python transcribe.py "${filePath}"`, { 
        timeout: 60000,
        encoding: 'utf8' 
      }).toString().trim();
      
      if (!transcription) {
        transcription = 'No speech detected in the audio.';
      }
      console.log('Transcription completed successfully');
    } catch (error) {
      console.error('Transcription error:', error.message);
      transcription = `Transcription failed: ${error.message}. Please try again with a different audio file.`;
    }

    console.log('Transcription result:', transcription.substring(0, 100) + '...');

    console.log('Saving to database for user:', req.user.sub);
    const { data, error: dbError } = await supabaseAdmin
      .from('transcriptions')
      .insert([
        {
          filename: req.file.originalname || req.file.filename,
          transcription: transcription,
          created_at: new Date().toISOString(),
          user_id: req.user.sub,
        },
      ])
      .select();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('Successfully saved transcription to database');

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Cleaned up uploaded file');
    }

    res.json({
      message: 'File uploaded and transcribed successfully',
      transcription: transcription,
      id: data?.[0]?.id
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Environment variables check:');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
  console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Set' : 'Not set');
  console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Not set');
  console.log('ASSEMBLYAI_API_KEY:', process.env.ASSEMBLYAI_API_KEY ? 'Set' : 'Not set');
});