// Procedural Launch Soundtrack & Integrated SFX Generator
// Synthesizes a punchy 124 BPM future-bass electronic track with synchronized sound effects
// Output: 44.1kHz 16-bit Stereo PCM WAV file

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const DURATION = 20.0;
const TOTAL_SAMPLES = Math.floor(SAMPLE_RATE * DURATION);

const leftChannel = new Float32Array(TOTAL_SAMPLES);
const rightChannel = new Float32Array(TOTAL_SAMPLES);

const BPM = 124;
const BEAT_DURATION = 60 / BPM; // ~0.48387s

// Helper note frequencies
const NOTE = {
  A1: 55.00, C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, E5: 659.25, G5: 783.99, A5: 880.00, C6: 1046.50, E6: 1318.51
};

// Chord progression: Am -> F -> C -> G
const CHORDS = [
  [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4], // Am
  [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4], // F
  [NOTE.C3, NOTE.E3, NOTE.G3, NOTE.C4], // C
  [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4]  // G
];
const BASS_ROOTS = [NOTE.A2, NOTE.F2, NOTE.C2, NOTE.G2];

// Noise generator
function whiteNoise() {
  return Math.random() * 2 - 1;
}

// Lowpass filter state
let lpL = 0, lpR = 0;
function lowpass(sample, cutoff, current) {
  const rc = 1.0 / (cutoff * 2 * Math.PI);
  const dt = 1.0 / SAMPLE_RATE;
  const alpha = dt / (rc + dt);
  return current + alpha * (sample - current);
}

// 1. Kick Drum Synthesizer
function addKick(startTime, volume = 0.8) {
  const startSample = Math.floor(startTime * SAMPLE_RATE);
  const length = Math.floor(0.28 * SAMPLE_RATE);
  for (let i = 0; i < length && startSample + i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 140 * Math.exp(-t * 22) + 42;
    const env = Math.exp(-t * 14);
    const val = Math.sin(2 * Math.PI * freq * t) * env * volume;
    leftChannel[startSample + i] += val;
    rightChannel[startSample + i] += val;
  }
}

// 2. Snare / Clap Synthesizer
function addSnare(startTime, volume = 0.5) {
  const startSample = Math.floor(startTime * SAMPLE_RATE);
  const length = Math.floor(0.22 * SAMPLE_RATE);
  for (let i = 0; i < length && startSample + i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const noise = whiteNoise() * Math.exp(-t * 18);
    const body = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 26);
    const val = (noise * 0.7 + body * 0.3) * volume;
    leftChannel[startSample + i] += val * 0.95;
    rightChannel[startSample + i] += val * 1.05;
  }
}

// 3. Hi-Hat Synthesizer
function addHiHat(startTime, open = false, volume = 0.18) {
  const startSample = Math.floor(startTime * SAMPLE_RATE);
  const length = Math.floor((open ? 0.15 : 0.05) * SAMPLE_RATE);
  for (let i = 0; i < length && startSample + i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * (open ? 25 : 70));
    const val = whiteNoise() * env * volume;
    leftChannel[startSample + i] += val * 0.8;
    rightChannel[startSample + i] += val * 1.2;
  }
}

// 4. Barcode Scan Beep (UI SFX)
function addBeep(startTime, freq = 2000, volume = 0.25) {
  const startSample = Math.floor(startTime * SAMPLE_RATE);
  const length = Math.floor(0.045 * SAMPLE_RATE);
  for (let i = 0; i < length && startSample + i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.sin((t / 0.045) * Math.PI);
    const val = Math.sin(2 * Math.PI * freq * t) * env * volume;
    leftChannel[startSample + i] += val * 0.85;
    rightChannel[startSample + i] += val * 1.15;
  }
}

// 5. Thermal Printer Paper Zip SFX
function addPaperZip(startTime, duration = 1.2, volume = 0.15) {
  const startSample = Math.floor(startTime * SAMPLE_RATE);
  const length = Math.floor(duration * SAMPLE_RATE);
  for (let i = 0; i < length && startSample + i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const motor = Math.sin(2 * Math.PI * (180 + Math.sin(t * 40) * 30) * t);
    const paper = whiteNoise() * 0.5;
    const env = Math.min(t * 8, 1) * Math.min((duration - t) * 8, 1);
    const val = (motor * 0.4 + paper * 0.6) * env * volume;
    leftChannel[startSample + i] += val;
    rightChannel[startSample + i] += val;
  }
}

// 6. WhatsApp Swoosh & Notification Chime SFX
function addWhatsAppDeliverySFX(startTime, volume = 0.35) {
  const startSample = Math.floor(startTime * SAMPLE_RATE);
  // Swoosh (0.3s)
  const swooshLen = Math.floor(0.3 * SAMPLE_RATE);
  for (let i = 0; i < swooshLen && startSample + i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const f = 300 + (t / 0.3) * 800;
    const env = Math.sin((t / 0.3) * Math.PI) * volume * 0.4;
    const val = Math.sin(2 * Math.PI * f * t) * env;
    leftChannel[startSample + i] += val * (1 - t / 0.3);
    rightChannel[startSample + i] += val * (t / 0.3);
  }
  // Chime bells at t = 0.2s
  const chimeSample = startSample + Math.floor(0.2 * SAMPLE_RATE);
  const chimeLen = Math.floor(0.8 * SAMPLE_RATE);
  for (let i = 0; i < chimeLen && chimeSample + i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const bell1 = Math.sin(2 * Math.PI * NOTE.C6 * t) * Math.exp(-t * 6);
    const bell2 = Math.sin(2 * Math.PI * NOTE.E6 * t) * Math.exp(-t * 5.5);
    const val = (bell1 * 0.5 + bell2 * 0.5) * volume * 0.8;
    leftChannel[chimeSample + i] += val * 0.9;
    rightChannel[chimeSample + i] += val * 1.1;
  }
}

// Render Core Drum Pattern & Sound FX
// Hook section (0.0s - 3.5s): Riser and dramatic drop at 3.0s
for (let t = 0; t < 3.0; t += 0.05) {
  const sample = Math.floor(t * SAMPLE_RATE);
  const sweepFreq = 60 + Math.pow(t / 3.0, 3) * 600;
  const env = Math.pow(t / 3.0, 2) * 0.18;
  const val = Math.sin(2 * Math.PI * sweepFreq * t) * env;
  leftChannel[sample] += val;
  rightChannel[sample] += val;
}
addKick(3.0, 0.95); // Brand drop impact

// Main Beat Loop (3.0s to 18.5s)
for (let beatTime = 3.0; beatTime < 18.5; beatTime += BEAT_DURATION) {
  const barIndex = Math.floor((beatTime - 3.0) / (BEAT_DURATION * 4));
  const beatInBar = Math.floor(((beatTime - 3.0) / BEAT_DURATION) % 4);

  // Kick on beats 0 and 2, syncopated on 2.5 occasionally
  if (beatInBar === 0 || beatInBar === 2) {
    addKick(beatTime, 0.85);
  }
  if (beatInBar === 2 && barIndex % 2 === 1) {
    addKick(beatTime + BEAT_DURATION * 0.5, 0.65);
  }

  // Snare on beats 1 and 3
  if (beatInBar === 1 || beatInBar === 3) {
    addSnare(beatTime, 0.55);
  }

  // 16th note Hi-Hats
  for (let s = 0; s < 4; s++) {
    const hatTime = beatTime + s * (BEAT_DURATION / 4);
    if (hatTime < 18.5) {
      addHiHat(hatTime, s === 2 && beatInBar === 3, s === 0 ? 0.22 : 0.12);
    }
  }
}

// Scene Specific SFX Integration:
addBeep(4.4, 1850, 0.22); // Scan 1: Panadol
addBeep(5.2, 2100, 0.22); // Scan 2: Amoxil
addBeep(6.1, 2350, 0.24); // Scan 3: Total lock
addPaperZip(8.0, 2.2, 0.14); // Thermal print feed
addWhatsAppDeliverySFX(12.3, 0.4); // WhatsApp dispatch swoosh + bell chime
addKick(18.5, 0.9); // Outro resolve kick

// Render Continuous Bass & Polyphonic Synth Chords
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;

  // Intro drone (0.0s - 3.0s)
  if (t < 3.0) {
    const drone = Math.sin(2 * Math.PI * 55 * t) * 0.2 * (1 - t / 3.2);
    leftChannel[i] += drone;
    rightChannel[i] += drone;
  }

  // Main Section (3.0s - 19.5s)
  if (t >= 3.0 && t < 19.5) {
    const musicTime = t - 3.0;
    const barProgress = (musicTime / (BEAT_DURATION * 4));
    const chordIdx = Math.floor(barProgress) % CHORDS.length;
    const chord = CHORDS[chordIdx];
    const bassNote = BASS_ROOTS[chordIdx];

    // Synth Bass
    const beatPos = (musicTime % BEAT_DURATION) / BEAT_DURATION;
    const bassEnv = Math.exp(-beatPos * 5);
    const bass = (
      Math.sin(2 * Math.PI * bassNote * t) * 0.7 +
      Math.sin(2 * Math.PI * (bassNote * 2) * t) * 0.3
    ) * bassEnv * 0.32;

    // Chords (Plucked polyphonic supersaw)
    let chordValL = 0;
    let chordValR = 0;
    for (let c = 0; c < chord.length; c++) {
      const f = chord[c];
      const osc1 = Math.sin(2 * Math.PI * f * t);
      const osc2 = Math.sin(2 * Math.PI * (f * 1.006) * t);
      const pan = (c / (chord.length - 1)) * 0.4 + 0.3; // 0.3 to 0.7
      const voice = (osc1 + osc2 * 0.7) * 0.055;
      chordValL += voice * (1 - pan);
      chordValR += voice * pan;
    }

    // Apply envelope to chords (plucked on beat 0, 1.5, 2.5)
    const chordSubBeat = (musicTime % (BEAT_DURATION * 2)) / BEAT_DURATION;
    const chordEnv = Math.exp(-(chordSubBeat % 1) * 3.5);

    // Fade out towards end
    const masterFade = t > 18.0 ? Math.max(0, (19.5 - t) / 1.5) : 1.0;

    leftChannel[i] += (bass + chordValL * chordEnv) * masterFade;
    rightChannel[i] += (bass + chordValR * chordEnv) * masterFade;
  }
}

// Master Limiter & 16-Bit PCM WAV Encoding
const wavBuffer = Buffer.alloc(44 + TOTAL_SAMPLES * 4);
function writeString(offset, str) {
  for (let i = 0; i < str.length; i++) {
    wavBuffer.writeUInt8(str.charCodeAt(i), offset + i);
  }
}

// RIFF header
writeString(0, 'RIFF');
wavBuffer.writeUInt32LE(36 + TOTAL_SAMPLES * 4, 4);
writeString(8, 'WAVE');
writeString(12, 'fmt ');
wavBuffer.writeUInt32LE(16, 16); // subchunk1size (16 for PCM)
wavBuffer.writeUInt16LE(1, 20);  // audioformat 1 (PCM)
wavBuffer.writeUInt16LE(2, 22);  // numchannels (2 stereo)
wavBuffer.writeUInt32LE(SAMPLE_RATE, 24); // samplerate
wavBuffer.writeUInt32LE(SAMPLE_RATE * 4, 28); // byterate (SampleRate * NumChannels * BitsPerSample/8)
wavBuffer.writeUInt16LE(4, 32);  // blockalign (NumChannels * BitsPerSample/8)
wavBuffer.writeUInt16LE(16, 34); // bitspersample (16)
writeString(36, 'data');
wavBuffer.writeUInt32LE(TOTAL_SAMPLES * 4, 40);

// Write audio samples with soft knee saturation
let offset = 44;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  // Soft saturation limiter
  let l = Math.tanh(leftChannel[i] * 1.1);
  let r = Math.tanh(rightChannel[i] * 1.1);

  const intL = Math.max(-32768, Math.min(32767, Math.floor(l * 32767)));
  const intR = Math.max(-32768, Math.min(32767, Math.floor(r * 32767)));

  wavBuffer.writeInt16LE(intL, offset);
  wavBuffer.writeInt16LE(intR, offset + 2);
  offset += 4;
}

const outDir = path.join(__dirname);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.join(outDir, 'soundtrack.wav');
fs.writeFileSync(outPath, wavBuffer);

console.log(`Soundtrack generated successfully: ${outPath} (${(wavBuffer.length / 1024 / 1024).toFixed(2)} MB, ${DURATION}s)`);
