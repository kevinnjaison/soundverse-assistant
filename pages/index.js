import { useRef, useState } from "react";

export default function Home() {
  const [transcript, setTranscript] = useState("");
  const [effect, setEffect] = useState("");
  const [isListening, setIsListening] = useState(false);

  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);

  const convolverRef = useRef(null);
  const delayRef = useRef(null);
  const filterRef = useRef(null);
  const pitchSourceRef = useRef(null);
  const gainNodeRef = useRef(null);

  const recognitionRef = useRef(null);

  const speak = (text, callback) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    speechSynthesis.speak(utter);
    utter.onend = () => callback && callback();
  };

  const setupMic = async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    return audioCtxRef.current.createMediaStreamSource(stream);
  };

  const applyReverb = async () => {
    const source = await setupMic();
    const convolver = audioCtxRef.current.createConvolver();
    const ir = audioCtxRef.current.createBuffer(2, audioCtxRef.current.sampleRate / 2, audioCtxRef.current.sampleRate);
    for (let c = 0; c < 2; c++) {
      let buf = ir.getChannelData(c);
      for (let i = 0; i < buf.length; i++) {
        buf[i] = (Math.random() * 2 - 1) * (1 - i / buf.length);
      }
    }
    convolver.buffer = ir;
    source.connect(convolver).connect(audioCtxRef.current.destination);
    convolverRef.current = convolver;
    sourceRef.current = source;
    setEffect("Reverb");
  };

  const applyDelay = async () => {
    const source = await setupMic();
    const delay = audioCtxRef.current.createDelay(5.0);
    delay.delayTime.value = 0.5;
    source.connect(delay).connect(audioCtxRef.current.destination);
    delayRef.current = delay;
    sourceRef.current = source;
    setEffect("Delay");
  };

  const applyFilter = async (type) => {
    const source = await setupMic();
    const filter = audioCtxRef.current.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = type === "lowpass" ? 1000 : 1000;
    source.connect(filter).connect(audioCtxRef.current.destination);
    filterRef.current = filter;
    sourceRef.current = source;
    setEffect(type === "lowpass" ? "Low-pass filter" : "High-pass filter");
  };

  const applyPitchShift = async (up = true) => {
    const buffer = audioCtxRef.current.createBuffer(1, 44100, 44100);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      channelData[i] = Math.sin(i / 10);
    }
    const pitch = audioCtxRef.current.createBufferSource();
    pitch.buffer = buffer;
    pitch.playbackRate.value = up ? 1.5 : 0.7;
    pitch.connect(audioCtxRef.current.destination);
    pitch.start();
    pitchSourceRef.current = pitch;
    setEffect(up ? "Pitch Up" : "Pitch Down");
  };

  const applyGain = async (increase = true) => {
    const source = await setupMic();
    const gainNode = audioCtxRef.current.createGain();
    gainNode.gain.value = increase ? 2.0 : 0.3;
    source.connect(gainNode).connect(audioCtxRef.current.destination);
    gainNodeRef.current = gainNode;
    sourceRef.current = source;
    setEffect(increase ? "Volume Up" : "Volume Down");
  };

  const stopAll = () => {
    [sourceRef, convolverRef, delayRef, filterRef, pitchSourceRef, gainNodeRef].forEach(ref => {
      if (ref.current) try { ref.current.disconnect(); } catch {}
    });
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    setEffect("");
    setTranscript("");
  };

  const continueConversation = () => {
    speak("What would you like to do next?", () => recognitionRef.current?.start());
  };

const parseCommand = async (text) => {
  setTranscript(prev => prev + " " + text);
  speak("Let me process that...");

  try {
    const res = await fetch("http://localhost:8000/process-audio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ audio: text })
    });

    const data = await res.json();
    const reply = data.text;

    // Speak the reply
    speak(reply, () => {
      // Basic logic for triggering local effects
      const lower = text.toLowerCase();
      if (lower.includes("reverb")) applyReverb();
      else if (lower.includes("delay") || lower.includes("echo")) applyDelay();
      else if (lower.includes("low pass")) applyFilter("lowpass");
      else if (lower.includes("high pass")) applyFilter("highpass");
      else if (lower.includes("pitch up")) applyPitchShift(true);
      else if (lower.includes("pitch down")) applyPitchShift(false);
      else if (lower.includes("increase volume")) applyGain(true);
      else if (lower.includes("decrease volume")) applyGain(false);
      else if (lower.includes("stop")) stopAll();

      // Continue the loop unless user said stop
      if (!lower.includes("stop")) {
        setTimeout(() => recognitionRef.current?.start(), 1500);
      }
    });
  } catch (err) {
    console.error("❌ Error contacting backend:", err);
    speak("Sorry, I couldn't process that.");
  }
};
  

  const startAssistant = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Speech recognition not supported");

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "en-US";

    recognition.onresult = (e) => {
      const result = e.results[e.resultIndex][0].transcript;
      setTranscript(prev => prev + " " + result);
      recognition.stop();
      parseCommand(result);
    };

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    speak("Hi Kevin. I'm listening. Say something like add reverb or stop.", () => {
      recognition.start();
    });
  };

  const stopAssistant = () => {
    recognitionRef.current?.stop();
    speak("Goodbye!");
    stopAll();
  };

  return (
    <main style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>🎧 Soundverse Voice Assistant</h1>
      <p>🎙️ Status: {isListening ? "🎧 Listening" : "⏹️ Idle"}</p>
      <p>🎛️ Effect: {effect || "None"}</p>

      <button style={btn} onClick={startAssistant} disabled={isListening}>▶️ Start Assistant</button>
      <button style={{ ...btn, background: "#f43f5e" }} onClick={stopAssistant} disabled={!isListening}>⏹️ Stop</button>

      <div style={{ marginTop: 20, background: "#f0f0f0", padding: 10 }}>
        <h3>📝 Transcript</h3>
        <p>{transcript}</p>
      </div>
    </main>
  );
}

const btn = {
  marginRight: 10,
  padding: "12px 20px",
  background: "#22c55e",
  color: "#fff",
  fontSize: 16,
  border: "none",
  borderRadius: 8,
  cursor: "pointer"
};
