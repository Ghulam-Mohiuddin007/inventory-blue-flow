const { Resvg } = require('@resvg/resvg-js');
const svgWithoutFilter = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
  <rect width="100%" height="100%" fill="#090d16"/>
  <!-- Simulated shadow with a simple offset rounded rect -->
  <rect x="144" y="248" width="840" height="660" rx="20" fill="#000000" opacity="0.4"/>
  <rect x="140" y="240" width="840" height="660" rx="20" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
</svg>`;
const t0 = Date.now();
for (let i = 0; i < 30; i++) {
  const p = new Resvg(svgWithoutFilter).render().pixels;
}
console.log('30 frames without blur filter in', Date.now() - t0, 'ms');
