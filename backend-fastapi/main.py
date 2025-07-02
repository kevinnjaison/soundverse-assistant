from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Enable CORS so frontend can talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev; restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model for incoming audio transcript
class AudioPayload(BaseModel):
    audio: str

@app.get("/")
def read_root():
    return {"message": "✅ FastAPI is working!"}

@app.post("/process-audio")
async def process_audio(payload: AudioPayload):
    user_input = payload.audio.lower()
    print("🎧 Received:", user_input)

    # Intent Matching
    if "reverb" in user_input:
        reply = "Reverb effect added."
    elif "delay" in user_input or "echo" in user_input:
        reply = "Delay effect applied."
    elif "low pass" in user_input:
        reply = "Low-pass filter added."
    elif "high pass" in user_input:
        reply = "High-pass filter applied."
    elif "pitch up" in user_input:
        reply = "Pitch shifted up."
    elif "pitch down" in user_input:
        reply = "Pitch shifted down."
    elif "increase volume" in user_input:
        reply = "Volume increased."
    elif "decrease volume" in user_input:
        reply = "Volume decreased."
    elif "stop" in user_input:
        reply = "All effects stopped."
    else:
        reply = "Sorry, I didn’t understand that. Try saying 'add reverb' or 'stop'."

    return { "text": reply }
