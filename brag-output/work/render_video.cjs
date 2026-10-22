// Launch Video Renderer for Inventory Blue Flow
// Renders 600 frames (20.0s @ 30fps) of 1920x1080 motion graphics using @resvg/resvg-js and ffmpeg

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const { Resvg } = require('@resvg/resvg-js');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

const FFMPEG_PATH = ffmpegInstaller.path;
const FPS = 30;
const DURATION = 20.0;
const TOTAL_FRAMES = Math.floor(FPS * DURATION); // 600

const WORK_DIR = path.join(__dirname);
const OUTPUT_DIR = path.join(__dirname, '..');
const AUDIO_PATH = path.join(WORK_DIR, 'soundtrack.wav');
const FINAL_MP4 = path.join(OUTPUT_DIR, 'brag.mp4');
const POSTER_JPG = path.join(OUTPUT_DIR, 'brag.jpg');
const POSTER_PNG = path.join(WORK_DIR, 'poster_temp.png');

// Easing functions
function easeOutQuad(t) { return t * (2 - t); }
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1; }
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

// Generate SVG string for any given time t (0 to 20.0)
function generateFrameSvg(t, frameIndex) {
  let content = '';

  // Background glow
  content += `
    <defs>
      <radialGradient id="bgGlow" cx="50%" cy="50%" r="65%">
        <stop offset="0%" stop-color="#1e1b4b" stop-opacity="0.45" />
        <stop offset="60%" stop-color="#0f172a" stop-opacity="0.9" />
        <stop offset="100%" stop-color="#06080e" stop-opacity="1" />
      </radialGradient>
      <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#60a5fa" />
        <stop offset="50%" stop-color="#818cf8" />
        <stop offset="100%" stop-color="#34d399" />
      </linearGradient>
      <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#10b981" />
        <stop offset="100%" stop-color="#059669" />
      </linearGradient>
      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#1e293b" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.5" />
      </filter>
    </defs>
    <rect width="1920" height="1080" fill="url(#bgGlow)"/>
  `;

  // Top Global Status Header (No overlap: text at 46, badge at 300)
  content += `
    <g transform="translate(80, 50)">
      <rect width="1760" height="48" rx="12" fill="#0f172a" stroke="#334155" stroke-width="1.2" opacity="0.9"/>
      <circle cx="28" cy="24" r="6" fill="#10b981"/>
      <text x="46" y="30" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="800" font-size="16" letter-spacing="1">
        INVENTORY BLUE FLOW
      </text>
      <rect x="300" y="14" width="240" height="20" rx="6" fill="#1e293b" stroke="#475569" stroke-width="0.8"/>
      <text x="312" y="28" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11" font-weight="700">
        100% IN-DEVICE STORAGE ENGINE
      </text>

      <text x="1730" y="29" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="700" font-size="14" text-anchor="end">
        ZERO CLOUD LOCK-IN • RETAIL POS &amp; KHATA
      </text>
    </g>
  `;

  // =========================================================================
  // SCENE 1: The Hook (0.0s – 3.2s)
  // =========================================================================
  if (t < 3.2) {
    if (t < 1.5) {
      const opacity = easeOutQuad(Math.min(t * 2, 1));
      content += `
        <g transform="translate(960, 460)" opacity="${opacity}">
          <rect x="-350" y="-180" width="700" height="44" rx="22" fill="#450a0a" stroke="#dc2626" stroke-width="1.5"/>
          <text x="0" y="-152" fill="#fca5a5" font-family="system-ui, sans-serif" font-weight="700" font-size="18" text-anchor="middle" letter-spacing="2">
            ⚠ CLOUD DATABASE OFFLINE • INTERNET REQUIRED
          </text>

          <text x="0" y="-30" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="800" font-size="52" text-anchor="middle">
            Tired of Cloud POS Outages?
          </text>
          <text x="0" y="40" fill="#cbd5e1" font-family="system-ui, sans-serif" font-weight="500" font-size="28" text-anchor="middle">
            When the internet drops, your retail checkout stops.
          </text>
          <text x="0" y="110" fill="#ef4444" font-family="system-ui, sans-serif" font-weight="700" font-size="24" text-anchor="middle">
            Plus endless monthly SaaS subscription fees.
          </text>
        </g>
      `;
    } else {
      const p2 = clamp((t - 1.5) / 1.5, 0, 1);
      const scale = 0.92 + easeOutBack(p2) * 0.08;
      const opacity = easeOutQuad(p2);
      content += `
        <g transform="translate(960, 480) scale(${scale})" opacity="${opacity}">
          <rect x="-240" y="-190" width="480" height="40" rx="20" fill="#064e3b" stroke="#10b981" stroke-width="1.5"/>
          <text x="0" y="-165" fill="#6ee7b7" font-family="system-ui, sans-serif" font-weight="700" font-size="16" text-anchor="middle" letter-spacing="2">
            ✓ 100% IN-DEVICE OFFLINE ARCHITECTURE
          </text>

          <text x="0" y="-50" fill="url(#brandGrad)" font-family="system-ui, sans-serif" font-weight="900" font-size="68" text-anchor="middle" letter-spacing="-1">
            INVENTORY BLUE FLOW
          </text>
          <text x="0" y="25" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="600" font-size="30" text-anchor="middle">
            The Complete Retail POS &amp; Customer Khata Ledger
          </text>

          <!-- 3 Badges -->
          <g transform="translate(-400, 100)">
            <rect width="250" height="54" rx="14" fill="#1e293b" stroke="#475569" stroke-width="1.2"/>
            <text x="125" y="34" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="700" font-size="16" text-anchor="middle">
              ⚡ Zero Server Latency
            </text>
          </g>
          <g transform="translate(-125, 100)">
            <rect width="250" height="54" rx="14" fill="#1e293b" stroke="#475569" stroke-width="1.2"/>
            <text x="125" y="34" fill="#34d399" font-family="system-ui, sans-serif" font-weight="700" font-size="16" text-anchor="middle">
              🔒 100% In-Device Storage
            </text>
          </g>
          <g transform="translate(150, 100)">
            <rect width="250" height="54" rx="14" fill="#1e293b" stroke="#475569" stroke-width="1.2"/>
            <text x="125" y="34" fill="#fbbf24" font-family="system-ui, sans-serif" font-weight="700" font-size="16" text-anchor="middle">
              💸 Zero Monthly Fees
            </text>
          </g>
        </g>
      `;
    }
  }

  // =========================================================================
  // SCENE 2: POS Terminal & Live Checkout (3.2s – 7.2s)
  // =========================================================================
  else if (t >= 3.2 && t < 7.2) {
    const sceneP = (t - 3.2) / 4.0;
    const enter = easeOutQuad(clamp(sceneP * 4, 0, 1));
    const cart1In = clamp((sceneP - 0.15) * 4, 0, 1);
    const cart2In = clamp((sceneP - 0.35) * 4, 0, 1);
    const cart3In = clamp((sceneP - 0.55) * 4, 0, 1);
    const currentTotal = Math.floor(clamp((sceneP - 0.2) * 2, 0, 1) * 1250);

    content += `
      <g opacity="${enter}">
        <text x="960" y="160" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="800" font-size="36" text-anchor="middle">
          High-Velocity POS Terminal &amp; Split Billing
        </text>
        <text x="960" y="195" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="18" text-anchor="middle">
          Real-time barcode scanning, instant calculations, and credit Khata routing
        </text>

        <!-- Left: Cart Items Grid -->
        <g transform="translate(140, 240)">
          <rect width="840" height="660" rx="20" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" filter="url(#shadow)"/>
          
          <rect x="24" y="24" width="792" height="44" rx="10" fill="#0f172a"/>
          <text x="44" y="52" fill="#94a3b8" font-family="system-ui, sans-serif" font-weight="700" font-size="14">ITEM DESCRIPTION</text>
          <text x="460" y="52" fill="#94a3b8" font-family="system-ui, sans-serif" font-weight="700" font-size="14">QTY</text>
          <text x="590" y="52" fill="#94a3b8" font-family="system-ui, sans-serif" font-weight="700" font-size="14">RATE</text>
          <text x="770" y="52" fill="#94a3b8" font-family="system-ui, sans-serif" font-weight="700" font-size="14" text-anchor="end">TOTAL</text>

          <!-- Item 1 -->
          <g transform="translate(24, 88)" opacity="${cart1In}">
            <rect width="792" height="80" rx="12" fill="#1e293b" stroke="${cart1In < 1 ? '#34d399' : '#334155'}" stroke-width="1.2"/>
            <text x="24" y="38" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="700" font-size="18">Panadol Extra 500mg</text>
            <text x="24" y="60" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">GSK Pharmaceuticals • Box of 20</text>
            <text x="470" y="46" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="700" font-size="18">2</text>
            <text x="590" y="46" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="16">PKR 240</text>
            <text x="770" y="46" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="800" font-size="18" text-anchor="end">PKR 480.00</text>
          </g>

          <!-- Item 2 -->
          <g transform="translate(24, 180)" opacity="${cart2In}">
            <rect width="792" height="80" rx="12" fill="#1e293b" stroke="${cart2In < 1 ? '#34d399' : '#334155'}" stroke-width="1.2"/>
            <text x="24" y="38" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="700" font-size="18">Amoxil 250mg Suspension</text>
            <text x="24" y="60" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">Antibiotic Oral Liquid • 60ml Bottle</text>
            <text x="470" y="46" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="700" font-size="18">1</text>
            <text x="590" y="46" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="16">PKR 320</text>
            <text x="770" y="46" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="800" font-size="18" text-anchor="end">PKR 320.00</text>
          </g>

          <!-- Item 3 -->
          <g transform="translate(24, 272)" opacity="${cart3In}">
            <rect width="792" height="80" rx="12" fill="#1e293b" stroke="${cart3In < 1 ? '#34d399' : '#334155'}" stroke-width="1.2"/>
            <text x="24" y="38" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="700" font-size="18">Hydryllin Cough Syrup</text>
            <text x="24" y="60" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">Searle Pharma • 120ml Bottle</text>
            <text x="470" y="46" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="700" font-size="18">3</text>
            <text x="590" y="46" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="16">PKR 150</text>
            <text x="770" y="46" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="800" font-size="18" text-anchor="end">PKR 450.00</text>
          </g>
        </g>

        <!-- Right: Checkout Calculation Panel -->
        <g transform="translate(1020, 240)">
          <rect width="760" height="660" rx="20" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" filter="url(#shadow)"/>

          <g transform="translate(40, 40)">
            <text x="0" y="24" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="800" font-size="24">Order Summary</text>
            <text x="680" y="24" fill="#94a3b8" font-family="monospace" font-size="14" text-anchor="end">INV-2026-0001</text>

            <rect x="0" y="60" width="680" height="140" rx="16" fill="#0f172a" stroke="#334155"/>
            <text x="30" y="110" fill="#94a3b8" font-family="system-ui, sans-serif" font-weight="600" font-size="20">GRAND TOTAL:</text>
            <text x="650" y="115" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="900" font-size="44" text-anchor="end">
              PKR ${currentTotal.toFixed(2)}
            </text>

            <g transform="translate(0, 230)">
              <text x="0" y="20" fill="#94a3b8" font-family="system-ui, sans-serif" font-weight="700" font-size="14">PAYMENT SPLIT</text>
              
              <rect x="0" y="36" width="680" height="60" rx="12" fill="#1e293b" stroke="#334155"/>
              <text x="24" y="73" fill="#34d399" font-family="system-ui, sans-serif" font-weight="700" font-size="18">Amount Paid (Cash):</text>
              <text x="656" y="73" fill="#34d399" font-family="system-ui, sans-serif" font-weight="800" font-size="20" text-anchor="end">PKR 800.00</text>

              <rect x="0" y="110" width="680" height="60" rx="12" fill="#450a0a" stroke="#f43f5e"/>
              <text x="24" y="147" fill="#fda4af" font-family="system-ui, sans-serif" font-weight="700" font-size="18">Balance Due (Khata / Udhaar):</text>
              <text x="656" y="147" fill="#fb7185" font-family="system-ui, sans-serif" font-weight="800" font-size="20" text-anchor="end">PKR 450.00</text>
            </g>

            <g transform="translate(0, 460)">
              <rect width="680" height="70" rx="16" fill="#4f46e5" stroke="#818cf8" stroke-width="1.5"/>
              <text x="340" y="44" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="800" font-size="22" text-anchor="middle">
                ✓ Confirm &amp; Print Thermal Receipt
              </text>
            </g>
          </g>
        </g>
      </g>
    `;
  }

  // =========================================================================
  // SCENE 3: Thermal Receipt Unroll (7.2s – 11.2s)
  // =========================================================================
  else if (t >= 7.2 && t < 11.2) {
    const sceneP = (t - 7.2) / 4.0;
    const unrollY = -280 + easeOutQuad(clamp(sceneP * 2, 0, 1)) * 340;

    content += `
      <g>
        <text x="960" y="150" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="800" font-size="36" text-anchor="middle">
          Hardware-Ready Thermal Receipt Engine
        </text>
        <text x="960" y="185" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="18" text-anchor="middle">
          Client-side 80mm &amp; 58mm continuous roll generation with zero cloud lag
        </text>

        <g transform="translate(710, 220)">
          <rect width="500" height="24" rx="8" fill="#1e293b" stroke="#475569" stroke-width="2"/>
          <line x1="20" y1="12" x2="480" y2="12" stroke="#0f172a" stroke-width="4"/>
        </g>

        <g transform="translate(730, ${232 + unrollY})" filter="url(#shadow)">
          <rect width="460" height="660" rx="4" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>

          <text x="230" y="40" fill="#0f172a" font-family="monospace" font-weight="900" font-size="20" text-anchor="middle">
            AL-MADINA MEDICOS &amp; MART
          </text>
          <text x="230" y="62" fill="#475569" font-family="monospace" font-size="12" text-anchor="middle">
            Shop #12, Commercial Market, Main Road
          </text>
          <text x="230" y="80" fill="#475569" font-family="monospace" font-size="12" text-anchor="middle">
            Helpline: 0300-8889900
          </text>
          <text x="230" y="98" fill="#0f172a" font-family="monospace" font-weight="700" font-size="12" text-anchor="middle">
            *** TAX RETAIL CASH MEMO ***
          </text>

          <line x1="20" y1="110" x2="440" y2="110" stroke="#94a3b8" stroke-dasharray="4,4"/>

          <text x="24" y="132" fill="#475569" font-family="monospace" font-size="12">INVOICE #:</text>
          <text x="436" y="132" fill="#0f172a" font-family="monospace" font-weight="700" font-size="12" text-anchor="end">INV-2026-0001</text>
          <text x="24" y="152" fill="#475569" font-family="monospace" font-size="12">DATE:</text>
          <text x="436" y="152" fill="#0f172a" font-family="monospace" font-size="12" text-anchor="end">22-Oct-2026 10:45 PM</text>
          <text x="24" y="172" fill="#475569" font-family="monospace" font-size="12">CUSTOMER:</text>
          <text x="436" y="172" fill="#0f172a" font-family="monospace" font-weight="700" font-size="12" text-anchor="end">Malik Tariq (0300-1234567)</text>

          <rect x="24" y="186" width="412" height="26" rx="4" fill="#fee2e2" stroke="#f43f5e"/>
          <text x="230" y="204" fill="#be123c" font-family="monospace" font-weight="700" font-size="12" text-anchor="middle">
            STATUS: CREDIT / UDHAAR DUE
          </text>

          <line x1="20" y1="224" x2="440" y2="224" stroke="#0f172a" stroke-width="1.5"/>

          <text x="24" y="242" fill="#0f172a" font-family="monospace" font-weight="700" font-size="12">ITEM (QTY @ RATE)</text>
          <text x="436" y="242" fill="#0f172a" font-family="monospace" font-weight="700" font-size="12" text-anchor="end">TOTAL</text>
          <line x1="20" y1="250" x2="440" y2="250" stroke="#0f172a" stroke-width="1"/>

          <text x="24" y="272" fill="#0f172a" font-family="monospace" font-weight="700" font-size="13">Panadol Extra 500mg</text>
          <text x="436" y="272" fill="#0f172a" font-family="monospace" font-weight="700" font-size="13" text-anchor="end">PKR 480.00</text>
          <text x="24" y="288" fill="#64748b" font-family="monospace" font-size="11">2 x PKR 240.00</text>

          <text x="24" y="312" fill="#0f172a" font-family="monospace" font-weight="700" font-size="13">Amoxil 250mg Susp.</text>
          <text x="436" y="312" fill="#0f172a" font-family="monospace" font-weight="700" font-size="13" text-anchor="end">PKR 320.00</text>
          <text x="24" y="328" fill="#64748b" font-family="monospace" font-size="11">1 x PKR 320.00</text>

          <text x="24" y="352" fill="#0f172a" font-family="monospace" font-weight="700" font-size="13">Hydryllin Syrup</text>
          <text x="436" y="352" fill="#0f172a" font-family="monospace" font-weight="700" font-size="13" text-anchor="end">PKR 450.00</text>
          <text x="24" y="368" fill="#64748b" font-family="monospace" font-size="11">3 x PKR 150.00</text>

          <line x1="20" y1="384" x2="440" y2="384" stroke="#94a3b8" stroke-dasharray="4,4"/>

          <text x="24" y="410" fill="#0f172a" font-family="monospace" font-weight="900" font-size="16">GRAND TOTAL:</text>
          <text x="436" y="410" fill="#0f172a" font-family="monospace" font-weight="900" font-size="18" text-anchor="end">PKR 1,250.00</text>

          <text x="24" y="434" fill="#047857" font-family="monospace" font-weight="700" font-size="13">Paid (Cash):</text>
          <text x="436" y="434" fill="#047857" font-family="monospace" font-weight="700" font-size="13" text-anchor="end">PKR 800.00</text>

          <rect x="20" y="446" width="420" height="26" fill="#fee2e2"/>
          <text x="28" y="464" fill="#be123c" font-family="monospace" font-weight="900" font-size="13">BALANCE DUE (KHATA):</text>
          <text x="432" y="464" fill="#be123c" font-family="monospace" font-weight="900" font-size="13" text-anchor="end">PKR 450.00</text>

          <text x="230" y="520" fill="#0f172a" font-family="monospace" font-weight="700" font-size="12" text-anchor="middle">
            THANK YOU FOR YOUR PATRONAGE!
          </text>
          <text x="230" y="538" fill="#64748b" font-family="monospace" font-size="10" text-anchor="middle">
            Goods once sold exchangeable within 3 days.
          </text>
          <text x="230" y="556" fill="#94a3b8" font-family="monospace" font-size="9" text-anchor="middle">
            Inventory Blue Flow • 100% In-Device Storage
          </text>
        </g>

        <!-- Side Feature Badges -->
        <g transform="translate(180, 440)">
          <rect width="440" height="110" rx="16" fill="#1e293b" stroke="#334155" stroke-width="1.2"/>
          <text x="30" y="45" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="700" font-size="20">
            🖨️ 58mm &amp; 80mm Roll Support
          </text>
          <text x="30" y="80" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="15">
            Instant browser ESC/POS printing to any thermal roll printer
          </text>
        </g>

        <g transform="translate(1300, 440)">
          <rect width="440" height="110" rx="16" fill="#1e293b" stroke="#334155" stroke-width="1.2"/>
          <text x="30" y="45" fill="#34d399" font-family="system-ui, sans-serif" font-weight="700" font-size="20">
            📄 Mini-A4 &amp; PDF Memo Format
          </text>
          <text x="30" y="80" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="15">
            Switch with 1-click between thermal slip and corporate A4
          </text>
        </g>
      </g>
    `;
  }

  // =========================================================================
  // SCENE 4: Instant WhatsApp PDF Dispatch (11.2s – 15.2s)
  // =========================================================================
  else if (t >= 11.2 && t < 15.2) {
    const sceneP = (t - 11.2) / 4.0;
    const enter = easeOutQuad(clamp(sceneP * 3, 0, 1));
    const bubbleIn = easeOutBack(clamp((sceneP - 0.2) * 3, 0, 1));

    content += `
      <g opacity="${enter}">
        <text x="960" y="150" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="800" font-size="36" text-anchor="middle">
          Direct WhatsApp PDF Invoice Delivery
        </text>
        <text x="960" y="185" fill="#34d399" font-family="system-ui, sans-serif" font-weight="600" font-size="18" text-anchor="middle">
          Native Web Share API &amp; Local Baileys Gateway — No phone contact saving required
        </text>

        <!-- Simulated WhatsApp Device / Chat Frame -->
        <g transform="translate(560, 240)">
          <rect width="800" height="660" rx="32" fill="#0b141a" stroke="#222d34" stroke-width="3" filter="url(#shadow)"/>
          
          <rect width="800" height="80" rx="32" fill="#202c33"/>
          <rect y="40" width="800" height="40" fill="#202c33"/>
          <circle cx="56" cy="40" r="24" fill="#00a884"/>
          <text x="56" y="48" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="700" font-size="20" text-anchor="middle">MT</text>
          <text x="96" y="38" fill="#e9edef" font-family="system-ui, sans-serif" font-weight="700" font-size="18">Malik Tariq</text>
          <text x="96" y="58" fill="#8696a0" font-family="system-ui, sans-serif" font-size="13">+92 300 1234567 • Online</text>

          <rect y="80" width="800" height="580" rx="32" fill="#0c1317"/>
          <rect y="80" width="800" height="100" fill="#0c1317"/>

          <!-- Sent Document Message Bubble -->
          <g transform="translate(180, 140) scale(${bubbleIn})" opacity="${bubbleIn}">
            <rect width="580" height="260" rx="16" fill="#005c4b" stroke="#025144"/>

            <rect x="16" y="16" width="548" height="130" rx="12" fill="#025144"/>
            <rect x="36" y="36" width="60" height="80" rx="8" fill="#ef4444"/>
            <text x="66" y="85" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="18" text-anchor="middle">PDF</text>

            <text x="116" y="60" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="700" font-size="20">INV-2026-0001.pdf</text>
            <text x="116" y="86" fill="#8696a0" font-family="system-ui, sans-serif" font-size="14">14.2 KB • Tax Retail Memo</text>
            <text x="116" y="108" fill="#34d399" font-family="system-ui, sans-serif" font-weight="600" font-size="13">Al-Madina Medicos &amp; Mart</text>

            <text x="24" y="180" fill="#e9edef" font-family="system-ui, sans-serif" font-size="16">
              Thank you for your purchase! Grand Total: PKR 1,250.00
            </text>
            <text x="24" y="210" fill="#fda4af" font-family="system-ui, sans-serif" font-weight="600" font-size="15">
              Khata Due Balance: PKR 450.00
            </text>
            
            <text x="520" y="240" fill="#8696a0" font-family="system-ui, sans-serif" font-size="12">10:45 PM</text>
            <text x="560" y="240" fill="#53bdeb" font-family="system-ui, sans-serif" font-size="14">✓✓</text>
          </g>
        </g>

        <!-- Feature Explainer Badges -->
        <g transform="translate(100, 360)">
          <rect width="400" height="150" rx="18" fill="#1e293b" stroke="#10b981" stroke-width="1.5"/>
          <text x="24" y="44" fill="#34d399" font-family="system-ui, sans-serif" font-weight="800" font-size="18">
            📱 Web Share API (Mobile)
          </text>
          <text x="24" y="76" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="14" font-weight="600">
            Direct Native OS Attachment
          </text>
          <text x="24" y="105" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">
            Pops WhatsApp contact picker and attaches actual PDF file directly.
          </text>
        </g>

        <g transform="translate(100, 540)">
          <rect width="400" height="150" rx="18" fill="#1e293b" stroke="#6366f1" stroke-width="1.5"/>
          <text x="24" y="44" fill="#818cf8" font-family="system-ui, sans-serif" font-weight="800" font-size="18">
            ⚡ Baileys Gateway Hook
          </text>
          <text x="24" y="76" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="14" font-weight="600">
            Zero-Click Automation
          </text>
          <text x="24" y="105" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">
            Pushes base64 PDF directly via local REST gateway without user dialogs.
          </text>
        </g>
      </g>
    `;
  }

  // =========================================================================
  // SCENE 5: Customer Khata Ledger & Aging (15.2s – 18.0s)
  // =========================================================================
  else if (t >= 15.2 && t < 18.0) {
    const sceneP = (t - 15.2) / 2.8;
    const enter = easeOutQuad(clamp(sceneP * 3, 0, 1));

    content += `
      <g opacity="${enter}">
        <text x="960" y="150" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="800" font-size="36" text-anchor="middle">
          Automated Customer Khata &amp; Credit Aging
        </text>
        <text x="960" y="185" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="18" text-anchor="middle">
          Track cumulative credit, monthly aging buckets, and log partial settlements
        </text>

        <g transform="translate(260, 240)">
          <rect width="1400" height="660" rx="20" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" filter="url(#shadow)"/>

          <g transform="translate(40, 40)">
            <rect width="410" height="120" rx="16" fill="#0f172a" stroke="#334155"/>
            <text x="30" y="45" fill="#94a3b8" font-family="system-ui, sans-serif" font-weight="600" font-size="15">TOTAL UDHAAR OUTSTANDING</text>
            <text x="30" y="90" fill="#f43f5e" font-family="system-ui, sans-serif" font-weight="900" font-size="36">PKR 124,500</text>
          </g>

          <g transform="translate(490, 40)">
            <rect width="410" height="120" rx="16" fill="#0f172a" stroke="#334155"/>
            <text x="30" y="45" fill="#94a3b8" font-family="system-ui, sans-serif" font-weight="600" font-size="15">ACTIVE CREDIT CUSTOMERS</text>
            <text x="30" y="90" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="900" font-size="36">48 Profiles</text>
          </g>

          <g transform="translate(940, 40)">
            <rect width="410" height="120" rx="16" fill="#0f172a" stroke="#334155"/>
            <text x="30" y="45" fill="#94a3b8" font-family="system-ui, sans-serif" font-weight="600" font-size="15">THIS MONTH SETTLED</text>
            <text x="30" y="90" fill="#34d399" font-family="system-ui, sans-serif" font-weight="900" font-size="36">PKR 86,200</text>
          </g>

          <g transform="translate(40, 200)">
            <rect width="1320" height="100" rx="14" fill="#1e293b" stroke="#334155"/>
            <circle cx="50" cy="50" r="26" fill="#3b82f6"/>
            <text x="50" y="58" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="700" font-size="18" text-anchor="middle">MT</text>
            
            <text x="96" y="44" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="700" font-size="20">Malik Tariq</text>
            <text x="96" y="68" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14">0300-1234567 • Commercial Plaza</text>

            <rect x="420" y="30" width="130" height="38" rx="8" fill="#064e3b"/>
            <text x="485" y="54" fill="#6ee7b7" font-family="system-ui, sans-serif" font-weight="700" font-size="14" text-anchor="middle">0-30d: 1.8k</text>

            <rect x="570" y="30" width="130" height="38" rx="8" fill="#78350f"/>
            <text x="635" y="54" fill="#fde68a" font-family="system-ui, sans-serif" font-weight="700" font-size="14" text-anchor="middle">31-60d: 2.0k</text>

            <rect x="720" y="30" width="130" height="38" rx="8" fill="#450a0a"/>
            <text x="785" y="54" fill="#fca5a5" font-family="system-ui, sans-serif" font-weight="700" font-size="14" text-anchor="middle">90d+: 1.0k</text>

            <text x="1050" y="58" fill="#f43f5e" font-family="system-ui, sans-serif" font-weight="900" font-size="24" text-anchor="end">PKR 4,850</text>
            
            <rect x="1100" y="28" width="190" height="44" rx="10" fill="#10b981"/>
            <text x="1195" y="56" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="700" font-size="15" text-anchor="middle">Log Settlement</text>
          </g>

          <g transform="translate(40, 320)">
            <rect width="1320" height="100" rx="14" fill="#1e293b" stroke="#334155"/>
            <circle cx="50" cy="50" r="26" fill="#8b5cf6"/>
            <text x="50" y="58" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="700" font-size="18" text-anchor="middle">HR</text>
            
            <text x="96" y="44" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="700" font-size="20">Haji Rafiq Brothers</text>
            <text x="96" y="68" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14">0321-9876543 • Main Bazaar Shop #4</text>

            <rect x="420" y="30" width="130" height="38" rx="8" fill="#064e3b"/>
            <text x="485" y="54" fill="#6ee7b7" font-family="system-ui, sans-serif" font-weight="700" font-size="14" text-anchor="middle">0-30d: 8.5k</text>

            <rect x="570" y="30" width="130" height="38" rx="8" fill="#1e293b"/>
            <text x="635" y="54" fill="#64748b" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle">31-60d: 0</text>

            <rect x="720" y="30" width="130" height="38" rx="8" fill="#1e293b"/>
            <text x="785" y="54" fill="#64748b" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle">90d+: 0</text>

            <text x="1050" y="58" fill="#f43f5e" font-family="system-ui, sans-serif" font-weight="900" font-size="24" text-anchor="end">PKR 8,500</text>
            
            <rect x="1100" y="28" width="190" height="44" rx="10" fill="#10b981"/>
            <text x="1195" y="56" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="700" font-size="15" text-anchor="middle">Log Settlement</text>
          </g>
        </g>
      </g>
    `;
  }

  // =========================================================================
  // SCENE 6: Outro & Punchline (18.0s – 20.0s)
  // =========================================================================
  else {
    const sceneP = (t - 18.0) / 2.0;
    const enter = easeOutBack(clamp(sceneP * 3, 0, 1));

    content += `
      <g transform="translate(960, 480) scale(${0.92 + enter * 0.08})" opacity="${Math.min(sceneP * 3, 1)}">
        <rect x="-240" y="-220" width="480" height="44" rx="22" fill="#0f172a" stroke="#6366f1" stroke-width="1.8"/>
        <text x="0" y="-192" fill="#a5b4fc" font-family="system-ui, sans-serif" font-weight="700" font-size="16" text-anchor="middle" letter-spacing="2">
          THE ZERO-CLOUD RETAIL OPERATING SYSTEM
        </text>

        <text x="0" y="-80" fill="url(#brandGrad)" font-family="system-ui, sans-serif" font-weight="900" font-size="76" text-anchor="middle" letter-spacing="-2">
          INVENTORY BLUE FLOW
        </text>

        <text x="0" y="-10" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="700" font-size="32" text-anchor="middle">
          Offline POS Terminal • Thermal Receipts • WhatsApp PDF Invoices
        </text>
        <text x="0" y="45" fill="#cbd5e1" font-family="system-ui, sans-serif" font-weight="600" font-size="24" text-anchor="middle">
          Customer Khata Ledger • 100% In-Device Storage Engine
        </text>

        <g transform="translate(0, 130)">
          <rect x="-420" y="0" width="840" height="54" rx="16" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
          <text x="0" y="34" fill="#34d399" font-family="system-ui, sans-serif" font-weight="800" font-size="20" text-anchor="middle">
            Zero Cloud Lock-in • Zero Monthly Subscriptions • Own Your Data
          </text>
        </g>

        <g transform="translate(0, 220)">
          <rect x="-220" y="0" width="440" height="48" rx="12" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2"/>
          <text x="0" y="30" fill="#38bdf8" font-family="monospace" font-weight="700" font-size="20" text-anchor="middle">
            http://localhost:8080/
          </text>
        </g>
      </g>
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
      ${content}
    </svg>
  `;
}

// Main Rendering Function
async function renderVideo() {
  console.log(`Starting render: ${TOTAL_FRAMES} frames (${DURATION}s @ ${FPS}fps)`);
  const startTime = Date.now();

  // Save poster frame as genuine JPEG using ffmpeg
  const posterSvg = generateFrameSvg(19.0, Math.floor(19.0 * FPS));
  const posterPng = new Resvg(posterSvg).render().asPng();
  fs.writeFileSync(POSTER_PNG, posterPng);
  execSync(`"${FFMPEG_PATH}" -y -i "${POSTER_PNG}" -q:v 2 "${POSTER_JPG}"`);
  if (fs.existsSync(POSTER_PNG)) fs.unlinkSync(POSTER_PNG);
  console.log(`Saved poster image: ${POSTER_JPG}`);

  // Start FFmpeg process with rawvideo RGBA input
  const ffmpegArgs = [
    '-y',
    '-f', 'rawvideo',
    '-pixel_format', 'rgba',
    '-video_size', '1920x1080',
    '-framerate', String(FPS),
    '-i', 'pipe:0',
    '-i', AUDIO_PATH,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '19',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    '-shortest',
    FINAL_MP4
  ];

  const ffmpeg = spawn(FFMPEG_PATH, ffmpegArgs, {
    stdio: ['pipe', 'inherit', 'inherit']
  });

  // Render and stream all 600 raw RGBA frames
  for (let f = 0; f < TOTAL_FRAMES; f++) {
    // Bake settled poster frame into frame 0 so video thumbnail is stunning on every platform
    const t = f === 0 ? 19.0 : (f / FPS);
    const svg = generateFrameSvg(t, f);
    const pixels = new Resvg(svg).render().pixels;

    const writeOk = ffmpeg.stdin.write(pixels);
    if (!writeOk) {
      await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
    }

    if (f % 60 === 0 || f === TOTAL_FRAMES - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${f + 1}/${TOTAL_FRAMES}] Generated ${((f / TOTAL_FRAMES) * 100).toFixed(0)}% in ${elapsed}s`);
    }
  }

  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
  });

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const fileSizeMb = (fs.statSync(FINAL_MP4).size / (1024 * 1024)).toFixed(2);
  console.log(`\nVideo render complete: ${FINAL_MP4} (${fileSizeMb} MB in ${totalTime}s)`);
}

renderVideo().catch(err => {
  console.error('Render failed:', err);
  process.exit(1);
});
