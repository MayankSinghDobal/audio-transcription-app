Quantum Transcription Nexus
Welcome to the Quantum Transcription Nexus, a web application that allows users to transcribe audio files and recordings using advanced speech-to-text technology. This project integrates a React frontend with a Node.js backend, leveraging Supabase for authentication and Render for deployment.
Project Overview

Frontend: Built with React, hosted on Vercel, featuring a sleek UI with dragon animation and real-time transcription capabilities.
Backend: A Node.js server on Render, handling audio processing and API requests, with Supabase for user authentication.
Purpose: Enable users to upload audio, record live, edit transcriptions, and manage past transcriptions with export options.

Prerequisites

Node.js (v16 or later)
npm or yarn
Git
A Supabase account
A Render account
A Vercel account
Google Cloud Console for OAuth setup

Project Setup
1. Clone the Repository
git clone https://github.com/your-username/audio-transcription-app.git
cd audio-transcription-app

2. Set Up Frontend (my-app)

Navigate to the frontend directory:cd my-app


Install dependencies:npm install


Create a .env file in my-app with:VITE_SUPABASE_URL=https://your-supabase-project-url.supabase.co
VITE_SUPABASE_KEY=your-supabase-anon-key


Start the development server:npm start

(Access at http://localhost:3000.)

3. Set Up Backend

Navigate to the backend directory:cd ../backend


Install dependencies:npm install


Create a .env file in backend with:PORT=3000


Start the server locally:node index.js

(Access at http://localhost:3000.)

4. Configure Supabase

Sign up at supabase.com and create a new project.
Enable Google OAuth in Authentication > Providers > Google.
Note the API URL and anon key from Settings > API.
Add the Callback URL https://audio-transcription-app-one.vercel.app/auth/callback in Google Cloud Console under OAuth 2.0 Client IDs.

5. Configure Google OAuth

Go to console.cloud.google.com.
Create a project and enable the Google+ API.
Set up OAuth 2.0 credentials and add:
Supabase Callback URL (e.g., https://xyz123.supabase.co/auth/v1/callback).
https://audio-transcription-app-one.vercel.app/auth/callback.



API Usage
The backend exposes the following endpoints:

GET /transcriptions

Query Params: query, page, limit
Headers: Authorization: Bearer <supabase-token>
Description: Fetch past transcriptions with pagination and search.
Response: { data: [transcriptions], total: number }


POST /upload

Body: multipart/form-data with audio file
Headers: Authorization: Bearer <supabase-token>
Description: Upload an audio file for transcription.
Response: { transcription: string }


DELETE /transcriptions/:id

Headers: Authorization: Bearer <supabase-token>
Description: Delete a specific transcription.
Response: { message: "Transcription deleted" }


PUT /transcriptions/:id

Body: { transcription: string }
Headers: Authorization: Bearer <supabase-token>
Description: Update a transcription’s text.
Response: { data: updatedTranscription }



Deployment Steps
1. Deploy Frontend on Vercel

Push your my-app code to a GitHub repository.
Link the repo to Vercel at vercel.com.
Set environment variables in Vercel dashboard:
VITE_SUPABASE_URL
VITE_SUPABASE_KEY


Deploy automatically on push to master.

2. Deploy Backend on Render

Push your backend code to a GitHub repository.
Link the repo to Render at dashboard.render.com.
Configure as a Web Service:
Build Command: npm install
Start Command: node index.js
Set environment variable: PORT (optional, defaults to Render’s assigned port)


Deploy automatically on push to master.

3. Post-Deployment

Update Supabase with the deployed frontend URL in Google OAuth settings.
Test all features: login, upload, recording, transcription management.
Monitor logs on Vercel and Render for issues.

Troubleshooting

CORS Errors: Ensure index.js CORS origin matches the frontend URL.
Auth Issues: Verify Supabase keys and Google OAuth redirect URIs.
Deployment Failures: Check build logs on Vercel/Render for errors.

Contributing
Fork the repo, create a feature branch, and submit a pull request. Follow the setup steps for local development.
License
MIT License - See LICENSE for details.