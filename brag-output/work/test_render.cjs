const { Resvg } = require('@resvg/resvg-js');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
  <rect width="100%" height="100%" fill="#090d16"/>
  <circle cx="500" cy="500" r="100" fill="red"/>
</svg>`;
const t0 = Date.now();
for (let i = 0; i < 30; i++) {
  const p = new Resvg(svg).render().pixels;
}
console.log('30 raw frames in', Date.now() - t0, 'ms');
