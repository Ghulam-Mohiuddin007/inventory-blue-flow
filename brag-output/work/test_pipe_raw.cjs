const { spawn } = require('child_process');
const { Resvg } = require('@resvg/resvg-js');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const path = require('path');

const ffmpegPath = ffmpegInstaller.path;
const outMp4 = path.join(__dirname, 'test_raw.mp4');

const ffmpeg = spawn(ffmpegPath, [
  '-y',
  '-f', 'rawvideo',
  '-pixel_format', 'rgba',
  '-video_size', '1920x1080',
  '-framerate', '30',
  '-i', 'pipe:0',
  '-c:v', 'libx264',
  '-preset', 'ultrafast',
  '-pix_fmt', 'yuv420p',
  outMp4
], { stdio: ['pipe', 'inherit', 'inherit'] });

const svg = (i) => `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
  <rect width="100%" height="100%" fill="#090d16"/>
  <circle cx="${400 + i * 20}" cy="540" r="100" fill="#6366f1"/>
</svg>`;

const t0 = Date.now();
for (let i = 0; i < 30; i++) {
  const pixels = new Resvg(svg(i)).render().pixels;
  ffmpeg.stdin.write(pixels);
}
ffmpeg.stdin.end();

ffmpeg.on('close', (code) => {
  console.log('Raw pipe complete in', Date.now() - t0, 'ms. Exit code:', code);
});
