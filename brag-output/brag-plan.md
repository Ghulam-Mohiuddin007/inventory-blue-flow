# /brag-slim Plan: Inventory Blue Flow

## Product Core
- **What is it?**: A high-performance, 100% in-device retail POS, automated stock manager, and customer Khata (credit ledger) system with direct WhatsApp PDF invoice delivery.
- **Who is it for?**: Retail shopkeepers, pharmacy managers, and local merchants who need a blazing fast, zero-subscription POS that runs offline on any phone, tablet, or desktop.
- **The Angle**: Zero Cloud Lock-in. Zero Monthly Fees. Your shop operates 100% in device memory with thermal receipt printing and automated WhatsApp PDF dispatch.
- **Tone**: `polished` / `default` (Punchy, modern SaaS aesthetic, crisp motion, dark navy & emerald palette).
- **Target Duration**: 21.0s (630 frames @ 30fps, 1920×1080 Landscape).

---

## Visual Identity
- **Canvas Base**: Slate-950 (`#090d16`) with subtle glowing ambient indigo & emerald radial gradients.
- **Card Surfaces**: Deep slate (`#0f172a`, `#1e293b`) with crisp hairline borders (`#334155`).
- **Brand Primary**: Indigo (`#6366f1`) and Electric Blue (`#3b82f6`).
- **Thermal Receipt**: Pure crisp paper white (`#f8fafc`) with deep graphite monospace print (`#0f172a`).
- **WhatsApp Accent**: Emerald (`#10b981`, `#059669`).
- **Khata Due Badge**: Vivid Rose (`#f43f5e`, `#e11d48`).
- **Typography**: Inter / Outfit sans-serif with Courier monospace for receipt details.

---

## Storyboard (21.0 Seconds Total)

| Scene | Time | Duration | Visual Content & Action | Audio & SFX |
|---|---|---|---|---|
| **Scene 1: The Hook** | 0.0s – 3.5s | 3.5s | "Cloud down? Monthly SaaS fees? No Internet?" Glowing warning icons dissolve into bold typographic reveal: **INVENTORY BLUE FLOW** with "100% In-Device Storage" badge. | Low atmospheric sub-boom, crisp riser, punchy bass drop on brand reveal. |
| **Scene 2: POS Terminal & Checkout** | 3.5s – 7.5s | 4.0s | Sleek POS Terminal UI pops in. Cart scans items (Panadol, Amoxil, Cough Syrup). Live counter ticks Grand Total to **PKR 1,250.00**. Split payment slider highlights Cash vs. Khata Due. | Driving 124 BPM synth beat begins, barcode scan beep, tactile UI click. |
| **Scene 3: Thermal Receipt Unroll** | 7.5s – 11.5s | 4.0s | High-contrast 80mm thermal receipt unrolls smoothly from virtual printer head. Displays store details, itemized table, total, and red **CREDIT / UDHAAR DUE** badge. | Thermal printer motor hum & paper slide SFX, bright synth chord progression. |
| **Scene 4: Instant WhatsApp PDF Dispatch** | 11.5s – 15.5s | 4.0s | Receipt compresses into PDF file icon. Web Share API & Local Gateway card lights up. Delivered directly into customer WhatsApp chat window as an attached `INV-2026-0001.pdf` memo! | Upbeat melodic arpeggios, crisp WhatsApp message dispatch chime ("swoosh-ding"). |
| **Scene 5: Customer Khata Ledger** | 15.5s – 18.5s | 3.0s | Customer Khata ledger dashboard animates in: monthly aging breakdown (0–30d, 31–60d, 90d+), cumulative balances, and one-tap payment reminder button. | Melodic synth bridge with tight hi-hats and deep bass pulse. |
| **Scene 6: Outro & Punchline** | 18.5s – 21.0s | 2.5s | Hero lockup: **INVENTORY BLUE FLOW**. "Zero Cloud. Zero Subscriptions. 100% In-Device." URL: `http://localhost:8080/`. | Resonant synth chord crescendo, final deep kick drum with clean decay. |

---

## Sound Architecture
- **BPM**: 124 BPM (4 beats per second = ~30 frames/beat @ 30fps).
- **Chord Progression**: Am – F – C – G (electronic future-bass feel).
- **Stems**:
  1. Bassline: Warm analog saw bass with 16th-note groove.
  2. Drums: Tight punchy kick, snappy 808 snare, crisp stereo closed hi-hats.
  3. Lead/Chords: Plucked polyphonic synth chords with reverb & low-pass sweep.
  4. Sound Effects: Barcode scan beep, paper feed zip, WhatsApp swoosh & notification bell, cinematic sub drops.
- **Render Format**: 44.1kHz 16-bit Stereo PCM WAV, mastered with limiter.

---

## Deliverables
- `brag-output/brag.mp4`: 1920×1080 30fps H.264 video with synchronized AAC audio.
- `brag-output/brag.jpg`: High-resolution poster frame (baked into frame 0 of video).
- `brag-output/share-copy.txt`: 2 concise postable announcement sentences.
- `brag-output/work/`: Intermediate generator scripts, audio stems, and render artifacts.
