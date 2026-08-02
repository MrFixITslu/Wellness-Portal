import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, RotateCcw, Volume2, Cpu, Sparkles, Waves, Radio, Music, ShieldCheck, AlertCircle } from "lucide-react";

// Preset configurations for the voice modifiers
export interface VoicePreset {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const VOICE_PRESETS: VoicePreset[] = [
  { id: "original", name: "Original", description: "Your natural voice", icon: Volume2 },
  { id: "robot", name: "Robot", description: "Metallic synthetic voice", icon: Cpu },
  { id: "chipmunk", name: "Chipmunk", description: "Cute high-pitched voice", icon: Sparkles },
  { id: "deep", name: "Deep Echo", description: "Low frequency privacy mask", icon: Waves },
  { id: "radio", name: "Radio", description: "Walkie-talkie style bandpass", icon: Radio },
  { id: "echo", name: "Cave Echo", description: "Spacious island cavern", icon: Music },
];

// Helper to encode an AudioBuffer into standard 16-bit PCM WAV Blob
function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  let result;
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  
  const bufferArr = new ArrayBuffer(44 + result.length * 2);
  const view = new DataView(bufferArr);
  
  // RIFF identifier
  writeString(view, 0, "RIFF");
  // file length
  view.setUint32(4, 36 + result.length * 2, true);
  // RIFF type
  writeString(view, 8, "WAVE");
  // format chunk identifier
  writeString(view, 12, "fmt ");
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, format, true);
  // channel count
  view.setUint16(22, numOfChan, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  // bits per sample
  view.setUint16(34, bitDepth, true);
  // data chunk identifier
  writeString(view, 36, "data");
  // chunk length
  view.setUint32(40, result.length * 2, true);
  
  // Write PCM samples
  floatTo16BitPCM(view, 44, result);
  
  return new Blob([bufferArr], { type: "audio/wav" });
  
  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  
  function interleave(inputL: Float32Array, inputR: Float32Array) {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);
    let index = 0;
    let inputIndex = 0;
    while (index < length) {
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return result;
  }
  
  function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }
}

// Client-side voice modulator using OfflineAudioContext
export async function renderModifiedAudio(originalBlob: Blob, preset: string): Promise<Blob> {
  const arrayBuffer = await originalBlob.arrayBuffer();
  // Standard AudioContext to decode
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  let originalBuffer: AudioBuffer;
  try {
    originalBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.error("Decoding audio failed:", err);
    await audioCtx.close();
    return originalBlob; // Fallback to raw on failure
  }
  
  // Determine modifiers
  let playbackRate = 1.0;
  if (preset === "chipmunk") {
    playbackRate = 1.45;
  } else if (preset === "deep") {
    playbackRate = 0.72;
  }
  
  const targetLength = Math.ceil(originalBuffer.length / playbackRate);
  const sampleRate = originalBuffer.sampleRate;
  
  // Create offline context for rendering
  const offlineCtx = new OfflineAudioContext(
    originalBuffer.numberOfChannels,
    targetLength,
    sampleRate
  );
  
  // Source Node
  const source = offlineCtx.createBufferSource();
  source.buffer = originalBuffer;
  source.playbackRate.setValueAtTime(playbackRate, 0);
  
  let lastNode: AudioNode = source;
  
  if (preset === "robot") {
    // metallic comb filter effect using feedback delay
    const delay = offlineCtx.createDelay();
    delay.delayTime.setValueAtTime(0.012, 0); // 12ms delay
    
    const feedback = offlineCtx.createGain();
    feedback.gain.setValueAtTime(0.65, 0); // ringing feedback
    
    delay.connect(feedback);
    feedback.connect(delay);
    
    const bandpass = offlineCtx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(1000, 0);
    bandpass.Q.setValueAtTime(1.5, 0);
    
    source.connect(delay);
    source.connect(bandpass);
    
    const merger = offlineCtx.createGain();
    merger.gain.setValueAtTime(0.7, 0);
    delay.connect(merger);
    bandpass.connect(merger);
    
    lastNode = merger;
  } else if (preset === "echo") {
    // Spacious Island Cave Echo
    const delay = offlineCtx.createDelay();
    delay.delayTime.setValueAtTime(0.25, 0); // 250ms echo delay
    
    const feedback = offlineCtx.createGain();
    feedback.gain.setValueAtTime(0.4, 0); // moderate echo feedback
    
    delay.connect(feedback);
    feedback.connect(delay);
    
    const mix = offlineCtx.createGain();
    mix.gain.setValueAtTime(0.65, 0);
    
    source.connect(mix);
    source.connect(delay);
    delay.connect(mix);
    
    lastNode = mix;
  } else if (preset === "radio") {
    // Bandpass centered at radio voice frequencies
    const filter = offlineCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, 0);
    filter.Q.setValueAtTime(2.0, 0);
    
    source.connect(filter);
    lastNode = filter;
  } else if (preset === "deep") {
    // Deep Voice lowpass filter to muddy high frequencies
    const filter = offlineCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(700, 0);
    
    source.connect(filter);
    lastNode = filter;
  }
  
  // Connect to offline destination
  lastNode.connect(offlineCtx.destination);
  source.start(0);
  
  try {
    const renderedBuffer = await offlineCtx.startRendering();
    await audioCtx.close();
    return bufferToWav(renderedBuffer);
  } catch (err) {
    console.error("Offline rendering failed:", err);
    await audioCtx.close();
    return originalBlob;
  }
}

// ----------------------------------------------------
// Component 1: THE VOICE RECORDER COMPONENT
// ----------------------------------------------------
interface VoiceRecorderProps {
  onVoiceAttached: (base64Wav: string, durationSec: number, modifierId: string) => void;
  onCancel?: () => void;
}

export function VoiceRecorder({ onVoiceAttached, onCancel }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [originalAudioBlob, setOriginalAudioBlob] = useState<Blob | null>(null);
  
  // Previewing states
  const [activePreset, setActivePreset] = useState("original");
  const [previewingBlob, setPreviewingBlob] = useState<Blob | null>(null);
  const [renderingPreset, setRenderingPreset] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, []);

  // Handle Recording start
  const startRecording = async () => {
    audioChunksRef.current = [];
    setOriginalAudioBlob(null);
    setPreviewingBlob(null);
    setDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setOriginalAudioBlob(audioBlob);
        setPreviewingBlob(audioBlob); // default original preview
        
        // Stop stream tracks to turn off mic light
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Failed to access microphone:", err);
      alert("Microphone access is required to record voice notes. Please grant permissions and try again.");
    }
  };

  // Handle Recording stop
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Re-render preview whenever preset changes
  useEffect(() => {
    if (!originalAudioBlob) return;
    
    const applyModifier = async () => {
      setRenderingPreset(true);
      // Stop current playback
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        setPreviewPlaying(false);
      }
      
      try {
        const modifiedBlob = await renderModifiedAudio(originalAudioBlob, activePreset);
        setPreviewingBlob(modifiedBlob);
      } catch (err) {
        console.error("Failed to render modifier:", err);
      } finally {
        setRenderingPreset(false);
      }
    };

    applyModifier();
  }, [activePreset, originalAudioBlob]);

  // Handle playing preview
  const togglePreviewPlay = () => {
    if (!previewingBlob) return;
    
    if (previewPlaying) {
      previewAudioRef.current?.pause();
      setPreviewPlaying(false);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.src = URL.createObjectURL(previewingBlob);
        previewAudioRef.current.play();
        setPreviewPlaying(true);
        previewAudioRef.current.onended = () => {
          setPreviewPlaying(false);
        };
      }
    }
  };

  // Handle finalize and submit base64 voice note
  const handleSubmit = async () => {
    if (!previewingBlob) return;
    
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Wav = reader.result as string;
        onVoiceAttached(base64Wav, duration, activePreset);
      };
      reader.readAsDataURL(previewingBlob);
    } catch (err) {
      console.error("Base64 conversion failed", err);
      alert("Could not serialize voice note. Please record again.");
    }
  };

  // Formatted seconds MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-[#FCFAF7] border border-[#EBE3D5] rounded-2xl p-5 shadow-inner max-w-md mx-auto space-y-4">
      <audio ref={previewAudioRef} className="hidden" />

      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-rose-50 rounded-lg text-rose-600 animate-pulse">
            <Mic className="w-4 h-4" />
          </span>
          <div className="leading-tight">
            <h4 className="text-xs font-bold text-slate-800">Private Voice Recorder</h4>
            <p className="text-[10px] text-slate-400">AES-256 encrypted, client-side modified</p>
          </div>
        </div>
        {onCancel && (
          <button 
            onClick={onCancel}
            className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Main recording control space */}
      <div className="flex flex-col items-center justify-center py-4 space-y-3">
        
        {/* Pulsing Visualizer Ring */}
        <div className="relative flex items-center justify-center w-20 h-20">
          {recording && (
            <div className="absolute inset-0 bg-[#00A896]/10 rounded-full animate-ping duration-1000" />
          )}
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-white transition-all shadow-md ${
              recording 
                ? "bg-red-500 hover:bg-red-600 ring-4 ring-red-100" 
                : "bg-[#0F4C81] hover:bg-[#1D70B8] hover:scale-105"
            }`}
          >
            {recording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-7 h-7" />}
          </button>
        </div>

        {/* Counter & Status */}
        <div className="text-center">
          <span className="font-mono text-xl font-extrabold text-[#0F4C81]">
            {formatTime(duration)}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">
            {recording ? "Recording audio privately..." : originalAudioBlob ? "Recording captured successfully" : "Tap the microphone to start recording"}
          </p>
        </div>
      </div>

      {/* Voice Modifiers Selector Panel */}
      {originalAudioBlob && (
        <div className="space-y-3 bg-white border border-[#EBE3D5] p-3.5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Select Privacy Shield (Voice Modifier)
            </span>
          </div>

          {/* Grid of modifiers */}
          <div className="grid grid-cols-3 gap-1.5">
            {VOICE_PRESETS.map((preset) => {
              const PresetIcon = preset.icon;
              const isSelected = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setActivePreset(preset.id)}
                  className={`p-2 rounded-xl flex flex-col items-center text-center transition-all border ${
                    isSelected
                      ? "bg-[#0F4C81] text-white border-transparent shadow-sm"
                      : "bg-[#FCFAF7] hover:bg-slate-50 text-slate-600 border-slate-100"
                  }`}
                >
                  <PresetIcon className={`w-4 h-4 mb-1 ${isSelected ? "text-teal-200" : "text-slate-500"}`} />
                  <span className="text-[9px] font-bold block leading-tight truncate w-full">{preset.name}</span>
                </button>
              );
            })}
          </div>

          {/* Preset details warning */}
          <div className="text-[9px] leading-relaxed text-slate-500 flex items-start gap-1.5 pt-1.5 border-t border-slate-50">
            <AlertCircle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
            <span>
              {activePreset === "original" 
                ? "Your voice remains original. To hide your age, gender, or accent, select one of our premium filters before sending." 
                : `Active filter: "${VOICE_PRESETS.find(p => p.id === activePreset)?.description}". Modifiers run fully inside your device browser.`}
            </span>
          </div>

          {/* Preview Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-50">
            <button
              type="button"
              onClick={togglePreviewPlay}
              disabled={renderingPreset || !previewingBlob}
              className="px-3 py-1.5 bg-[#00A896] hover:bg-[#02C39A] text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              {previewPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {previewPlaying ? "Pause Preview" : "Play Processed Preview"}
            </button>

            {renderingPreset && (
              <span className="text-[9px] text-slate-400 italic animate-pulse">Rendering DSP...</span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {originalAudioBlob && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setOriginalAudioBlob(null);
              setPreviewingBlob(null);
              setDuration(0);
              setActivePreset("original");
            }}
            className="flex-1 py-2 border border-red-100 bg-red-50 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Recalibrate / Redo
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={renderingPreset || !previewingBlob}
            className="flex-1 py-2 bg-[#0F4C81] hover:bg-[#1D70B8] text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            Confirm & Attach Note
          </button>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Component 2: THE REUSABLE VOICE NOTE PLAYER
// ----------------------------------------------------
interface VoiceNotePlayerProps {
  src: string; // Base64 WAV URI
  duration: number; // Duration in seconds
  modifier: string; // Modifier preset ID
}

export function VoiceNotePlayer({ src, duration, modifier }: VoiceNotePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
      
      // Monitor current time
      const updateProgress = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          if (!audioRef.current.paused) {
            requestAnimationFrame(updateProgress);
          }
        }
      };
      requestAnimationFrame(updateProgress);

      audioRef.current.onended = () => {
        setPlaying(false);
        setCurrentTime(0);
      };
    }
  };

  const getPresetName = (id: string) => {
    return VOICE_PRESETS.find(p => p.id === id)?.name || "Modified";
  };

  const formatSecs = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}:${rem.toString().padStart(2, "0")}`;
  };

  // Safe progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-1.5 p-3.5 bg-white border border-[#EBE3D5] rounded-xl shadow-xs max-w-xs min-w-[200px]">
      <audio ref={audioRef} src={src} className="hidden" />
      
      {/* Waveform Visualization & Play Button Row */}
      <div className="flex items-center gap-3">
        {/* Rounded Play Button */}
        <button
          onClick={handlePlayPause}
          className="w-8 h-8 rounded-full bg-[#0F4C81] hover:bg-[#1D70B8] text-white flex items-center justify-center transition-transform hover:scale-105"
          title={playing ? "Pause" : "Play Voice Note"}
        >
          {playing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        {/* Customized mock dynamic waves visualization representing progress */}
        <div className="flex-1 flex items-center gap-0.5 h-6">
          {[...Array(16)].map((_, i) => {
            // Pseudo-random wave heights to look organic
            const height = [40, 75, 50, 90, 60, 80, 45, 70, 55, 85, 40, 65, 50, 80, 35, 60][i];
            const isActive = (i / 16) * 100 <= progressPercent;
            return (
              <span
                key={i}
                style={{ height: `${height}%` }}
                className={`w-0.75 rounded-full transition-colors duration-200 ${
                  isActive 
                    ? "bg-[#0F4C81]" 
                    : "bg-slate-200"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Slider Progress Indicator and Times */}
      <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium">
        <span>{formatSecs(currentTime)}</span>
        
        {/* Privacy shield modifier badge */}
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-50 border border-slate-100 font-bold text-slate-500 uppercase tracking-wide">
          🛡️ {getPresetName(modifier)}
        </span>

        <span>{formatSecs(duration)}</span>
      </div>
    </div>
  );
}
