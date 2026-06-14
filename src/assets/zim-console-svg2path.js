// Paste your SVG into the page first, then run this in console
const path = document.querySelector('path'); // or document.querySelector('#your-id')
const totalLength = path.getTotalLength();
const numPoints = 80; // more = more accurate, larger polygon
const bbox = path.getBBox();

const points = [];
for (let i = 0; i < numPoints; i++) {
  const pt = path.getPointAtLength((i / numPoints) * totalLength);
  // Convert to percentages relative to the bounding box
  const x = (((pt.x - bbox.x) / bbox.width) * 100).toFixed(2);
  const y = (((pt.y - bbox.y) / bbox.height) * 100).toFixed(2);
  points.push(`${x}% ${y}%`);
}

console.log(`clip-path: polygon(${points.join(', ')});`);










