import sys
import os
import requests
import json
import time
from pathlib import Path

def transcribe_audio(file_path):
    """
    Transcribe audio file using AssemblyAI API
    """
    try:
        # Get API key from environment
        api_key = os.getenv('ASSEMBLYAI_API_KEY')
        if not api_key:
            raise Exception("ASSEMBLYAI_API_KEY environment variable not set")
        
        # Check if file exists
        if not os.path.exists(file_path):
            raise Exception(f"Audio file not found: {file_path}")
        
        # Upload file to AssemblyAI
        upload_url = "https://api.assemblyai.com/v2/upload"
        headers = {"authorization": api_key}
        
        print(f"Uploading file: {file_path}", file=sys.stderr)
        
        with open(file_path, 'rb') as f:
            response = requests.post(upload_url, headers=headers, files={'file': f})
        
        if response.status_code != 200:
            raise Exception(f"Upload failed: {response.status_code} - {response.text}")
        
        upload_response = response.json()
        audio_url = upload_response.get('upload_url')
        
        if not audio_url:
            raise Exception("Failed to get upload URL from response")
        
        print(f"File uploaded successfully: {audio_url}", file=sys.stderr)
        
        # Submit transcription request
        transcript_url = "https://api.assemblyai.com/v2/transcript"
        transcript_request = {
            "audio_url": audio_url,
            "language_detection": True,  # Enable automatic language detection
            "punctuate": True,
            "format_text": True
        }
        
        response = requests.post(transcript_url, json=transcript_request, headers=headers)
        
        if response.status_code != 200:
            raise Exception(f"Transcription request failed: {response.status_code} - {response.text}")
        
        transcript_response = response.json()
        transcript_id = transcript_response.get('id')
        
        if not transcript_id:
            raise Exception("Failed to get transcript ID from response")
        
        print(f"Transcription submitted with ID: {transcript_id}", file=sys.stderr)
        
        # Poll for completion
        polling_url = f"https://api.assemblyai.com/v2/transcript/{transcript_id}"
        max_attempts = 60  # Maximum 10 minutes (60 * 10 seconds)
        attempt = 0
        
        while attempt < max_attempts:
            response = requests.get(polling_url, headers=headers)
            
            if response.status_code != 200:
                raise Exception(f"Polling failed: {response.status_code} - {response.text}")
            
            result = response.json()
            status = result.get('status')
            
            print(f"Transcription status: {status} (attempt {attempt + 1}/{max_attempts})", file=sys.stderr)
            
            if status == 'completed':
                transcription_text = result.get('text', '')
                if not transcription_text or transcription_text.strip() == '':
                    return "No speech detected in the audio file."
                return transcription_text.strip()
            
            elif status == 'error':
                error_message = result.get('error', 'Unknown error occurred during transcription')
                raise Exception(f"Transcription failed: {error_message}")
            
            # Wait before next poll
            time.sleep(10)
            attempt += 1
        
        raise Exception("Transcription timed out - please try with a shorter audio file")
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"Network error during transcription: {str(e)}")
    except json.JSONDecodeError as e:
        raise Exception(f"Invalid JSON response from API: {str(e)}")
    except Exception as e:
        raise Exception(f"Transcription error: {str(e)}")

def main():
    if len(sys.argv) != 2:
        print("Usage: python transcribe.py <audio_file_path>", file=sys.stderr)
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        transcription = transcribe_audio(file_path)
        print(transcription)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()