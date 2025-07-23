import assemblyai as aai
import sys
import os

# Set API key from environment variable
aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")
transcriber = aai.Transcriber()

# Transcribe file
transcript = transcriber.transcribe(sys.argv[1])
print(transcript.text or "No speech detected in the audio.")