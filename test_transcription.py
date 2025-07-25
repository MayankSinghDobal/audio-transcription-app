import requests

url = "https://audio-transcription-backend-llwb.onrender.com/transcribe"
files = {'file': open('E:\\SpeechToText_Project1\\audio transcription app.mp3', 'rb')}
response = requests.post(url, files=files)
print(response.text)