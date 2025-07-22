const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // if using OpenAI Whisper
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    // ✅ Upload audio file to Supabase Storage
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileName = `${Date.now()}_${req.file.originalname}`;

    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('audios')
      .upload(fileName, fileBuffer, {
        contentType: req.file.mimetype,
      });

    if (storageError) {
      console.error('Error uploading to Supabase Storage:', storageError);
      return res.status(500).json({ message: 'File upload failed' });
    }

    // ✅ Get public URL of the uploaded file
    const { data: publicUrlData } = supabase
      .storage
      .from('audios')
      .getPublicUrl(fileName);

    const audioUrl = publicUrlData.publicUrl;

    // ✅ Transcribe audio using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-1",
    });

    const text = transcription.text;

    // ✅ Insert transcription data into Supabase table
    const { data, error } = await supabase
      .from('transcriptions')
      .insert([
        {
          audio_url: audioUrl,
          transcription: text,
        }
      ]);

    if (error) {
      console.error('Error inserting into Supabase:', error);
      return res.status(500).json({ message: 'Database insert failed' });
    }

    // ✅ Send success response
    res.json({ transcription: text, audio_url: audioUrl, dbInsert: data });

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Transcription failed' });
  }
});

app.get('/transcriptions', async (req, res) => {
  try {
    // ✅ Fetch all transcriptions from Supabase table
    const { data, error } = await supabase
      .from('transcriptions')
      .select('*')
      .order('created_at', { ascending: false }); // latest first

    if (error) {
      console.error('Error fetching from Supabase:', error);
      return res.status(500).json({ message: 'Database fetch failed' });
    }

    // ✅ Send fetched data as JSON
    res.json(data);

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error while fetching transcriptions' });
  }
});

app.listen(5000, () => {
  console.log('Server running on port 5000');
});