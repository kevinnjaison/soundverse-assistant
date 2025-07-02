Tech Stack I Used
Frontend
Next.js (React) for the UI and mic control

Web APIs:

Web Audio API – for real-time audio manipulation

SpeechRecognition – to understand what you say

SpeechSynthesis – to talk back to you

Backend
FastAPI (Python) to process audio intent text and return smart responses

(No paid APIs used — it’s all open source and browser-powered!)







 
What the Experience Feels Like


Click the Start Assistant button.

It says: “Hi Kevin, I’m listening. Say something like add reverb or stop.”

You say: “Add delay” → and boom! 🎉 The delay effect is added to your voice.

Assistant: “Adding delay. What would you like to do next?”

You say: “Pitch shift up” → done.

You say: “Stop” → it shuts everything down smooth


🗂️ Project Structure

soundverse-assistant/
├── backend-fastapi/
│   └── main.py        # FastAPI logic
├── frontend/
│   └── pages/
│       └── index.js   # Main assistant UI

How to run

Frontend (Next.js)

cd soundverse-assistant
npm install
npm run dev

Backend (FastAPI)

cd backend-fastapi
python -m venv venv
venv\Scripts\activate  # Windows
pip install fastapi uvicorn
uvicorn main:app --reload --port 8000
