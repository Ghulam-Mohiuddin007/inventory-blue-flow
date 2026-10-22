const { spawn } = require('child_process');
const { Resvg } = require('@resvg/resvg-js');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const path = require('path');

const ffmpegPath = ffmpegInstaller.path;
const outMp4 = path.join(__dirname, 'test.mp4');

const ffmpeg = spawn(ffmpegPath, [
  '-y',
  '-f', 'image2pipe',
  '-vcodec', 'png',
  '-r', '30',
  '-i', 'pipe:0',
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  outMp4
], { stdio: ['pipe', 'inherit', 'inherit'] });

const svg = (i) => `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
  <rect width="100%" height="100%" fill="#090d16"/>
  <circle cx="${400 + i * 20}" cy="540" r="100" fill="#6366f1"/>
  <text x="960" y="540" fill="white" font-size="64" font-family="sans-serif" text-anchor="middle">Frame ${i}</text>
</svg>`;

for (let i = 0; i < 30; i++) {
  const png = new Resvg(svg(i)).render().asPng();
  ffmpeg.stdin.write(png);
}
ffmpeg.stdin.end();

ffmpeg.on('close', (code) => {
  console.log('FFmpeg exited with code', code);
});
