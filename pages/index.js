import { useRef, useState, useEffect } from "react";

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

  // ✅ Use speech synthesis
  const speak = (text, callback) => {
    console.log("🗣️ Speaking:", text);
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
      const buf = ir.getChannelData(c);
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
    delay.delayTime.value = 0.4;
    source.connect(delay).connect(audioCtxRef.current.destination);
    delayRef.current = delay;
    sourceRef.current = source;
    setEffect("Delay");
  };

  const applyFilter = async (type) => {
    const source = await setupMic();
    const filter = audioCtxRef.current.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = type === "lowpass" ? 800 : 1200;
    source.connect(filter).connect(audioCtxRef.current.destination);
    filterRef.current = filter;
    sourceRef.current = source;
    setEffect(type === "lowpass" ? "Low-pass filter" : "High-pass filter");
  };

  const applyPitchShift = async (up = true) => {
    const buffer = audioCtxRef.current.createBuffer(1, 44100, 44100);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      data[i] = Math.sin(i / 20);
    }
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = up ? 1.5 : 0.7;
    source.connect(audioCtxRef.current.destination);
    source.start();
    pitchSourceRef.current = source;
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
    console.log("🛑 Stopping all effects");
    [sourceRef, convolverRef, delayRef, filterRef, pitchSourceRef, gainNodeRef].forEach((ref) => {
      if (ref.current) {
        try {
          ref.current.disconnect();
        } catch {}
      }
    });
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setEffect("");
    setTranscript("");
  };

  const parseCommand = (text) => {
    const command = text.toLowerCase();
    console.log("🧠 Interpreted:", command);

    if (command.includes("reverb")) speak("Adding reverb.", () => applyReverb());
    else if (command.includes("delay") || command.includes("echo")) speak("Adding delay.", () => applyDelay());
    else if (command.includes("low pass")) speak("Applying low-pass filter.", () => applyFilter("lowpass"));
    else if (command.includes("high pass")) speak("Applying high-pass filter.", () => applyFilter("highpass"));
    else if (command.includes("pitch up")) speak("Shifting pitch up.", () => applyPitchShift(true));
    else if (command.includes("pitch down")) speak("Shifting pitch down.", () => applyPitchShift(false));
    else if (command.includes("increase volume")) speak("Increasing volume.", () => applyGain(true));
    else if (command.includes("decrease volume")) speak("Decreasing volume.", () => applyGain(false));
    else if (command.includes("stop")) speak("Stopping all effects.", () => stopAll());
    else speak("Sorry, I didn’t understand that.");

    setTimeout(() => {
      speak("What would you like to do next?", () => recognitionRef.current?.start());
    }, 2500);
  };

  const startAssistant = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Speech recognition not supported");

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("✅ Listening...");
      setIsListening(true);
    };

    recognition.onerror = (event) => {
      console.error("❌ Recognition error:", event.error);
    };

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      console.log("🎤 You said:", result);
      setTranscript((prev) => prev + " " + result);
      recognition.stop();
      parseCommand(result);
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log("🛑 Recognition ended");
    };

    recognitionRef.current = recognition;

    speak("Hi Kevin. I’m ready. Say something like add reverb or stop.", () => {
      recognition.start();
    });
  };

  const stopAssistant = () => {
    recognitionRef.current?.stop();
    speak("Okay, goodbye!");
    stopAll();
  };

  return (
    <main style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>🎧 Soundverse Voice Assistant</h1>
      <p>Status: {isListening ? "🎧 Listening" : "⏹️ Idle"}</p>
      <p>Effect: {effect || "None"}</p>

      <button style={btn} onClick={startAssistant} disabled={isListening}>▶️ Start</button>
      <button style={{ ...btn, background: "#ef4444" }} onClick={stopAssistant} disabled={!isListening}>⏹️ Stop</button>

      <div style={{ marginTop: 20 }}>
        <h3>📝 Transcript</h3>
        <p>{transcript}</p>
      </div>
    </main>
  );
}

const btn = {
  marginRight: 10,
  padding: "12px 20px",
  background: "#3b82f6",
  color: "#fff",
  fontSize: 16,
  border: "none",
  borderRadius: 8,
  cursor: "pointer"
};
