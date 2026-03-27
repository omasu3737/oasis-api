const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'assets', 'images');

// --- SVG templates ---

// Main app icon (1024x1024): purple gradient bg + white "O" ring + OASIS text
const iconSvg = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4a1a9e"/>
      <stop offset="50%" stop-color="#6a1fc8"/>
      <stop offset="100%" stop-color="#8b35e8"/>
    </linearGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00d4ff"/>
      <stop offset="50%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <!-- Background -->
  <rect width="1024" height="1024" rx="220" fill="url(#bg)"/>
  <!-- Outer glow ring -->
  <circle cx="512" cy="440" r="230" fill="none" stroke="url(#ring)" stroke-width="48" opacity="0.3" filter="url(#glow)"/>
  <!-- Main ring -->
  <circle cx="512" cy="440" r="230" fill="none" stroke="url(#ring)" stroke-width="40"/>
  <!-- Inner dot -->
  <circle cx="512" cy="440" r="45" fill="url(#ring)"/>
  <!-- OASIS text -->
  <text x="512" y="780" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="120" font-weight="800" letter-spacing="18" fill="white" opacity="0.95">OASIS</text>
</svg>`;

// Android adaptive foreground (1024x1024, transparent bg, content in safe zone ~66%)
const fgSvg = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00d4ff"/>
      <stop offset="50%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
  </defs>
  <!-- Ring centered in safe zone -->
  <circle cx="512" cy="420" r="195" fill="none" stroke="url(#ring)" stroke-width="38"/>
  <circle cx="512" cy="420" r="40" fill="url(#ring)"/>
  <!-- OASIS text -->
  <text x="512" y="720" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="100" font-weight="800" letter-spacing="16" fill="white">OASIS</text>
</svg>`;

// Android adaptive background (solid gradient)
const bgSvg = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4a1a9e"/>
      <stop offset="50%" stop-color="#6a1fc8"/>
      <stop offset="100%" stop-color="#8b35e8"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
</svg>`;

// Monochrome (white ring on transparent)
const monoSvg = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <circle cx="512" cy="420" r="195" fill="none" stroke="white" stroke-width="38"/>
  <circle cx="512" cy="420" r="40" fill="white"/>
  <text x="512" y="720" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="100" font-weight="800" letter-spacing="16" fill="white">OASIS</text>
</svg>`;

// Splash icon (centered logo, 200x200 target but we make it larger for quality)
const splashSvg = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00d4ff"/>
      <stop offset="50%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
  </defs>
  <circle cx="256" cy="210" r="120" fill="none" stroke="url(#ring)" stroke-width="24"/>
  <circle cx="256" cy="210" r="24" fill="url(#ring)"/>
  <text x="256" y="400" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="72" font-weight="800" letter-spacing="12" fill="#6a1fc8">OASIS</text>
</svg>`;

// Favicon
const faviconSvg = `
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4a1a9e"/>
      <stop offset="50%" stop-color="#6a1fc8"/>
      <stop offset="100%" stop-color="#8b35e8"/>
    </linearGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00d4ff"/>
      <stop offset="50%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#bg)"/>
  <circle cx="64" cy="58" r="28" fill="none" stroke="url(#ring)" stroke-width="6"/>
  <circle cx="64" cy="58" r="6" fill="url(#ring)"/>
  <text x="64" y="108" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="18" font-weight="800" letter-spacing="3" fill="white">OASIS</text>
</svg>`;

async function generate() {
  // Main icon
  await sharp(Buffer.from(iconSvg)).resize(1024, 1024).png().toFile(path.join(OUT, 'icon.png'));
  console.log('icon.png');

  // Android adaptive
  await sharp(Buffer.from(fgSvg)).resize(1024, 1024).png().toFile(path.join(OUT, 'android-icon-foreground.png'));
  console.log('android-icon-foreground.png');

  await sharp(Buffer.from(bgSvg)).resize(1024, 1024).png().toFile(path.join(OUT, 'android-icon-background.png'));
  console.log('android-icon-background.png');

  await sharp(Buffer.from(monoSvg)).resize(1024, 1024).png().toFile(path.join(OUT, 'android-icon-monochrome.png'));
  console.log('android-icon-monochrome.png');

  // Splash
  await sharp(Buffer.from(splashSvg)).resize(512, 512).png().toFile(path.join(OUT, 'splash-icon.png'));
  console.log('splash-icon.png');

  // Favicon
  await sharp(Buffer.from(faviconSvg)).resize(48, 48).png().toFile(path.join(OUT, 'favicon.png'));
  console.log('favicon.png');

  console.log('\nAll icons generated!');
}

generate().catch(console.error);
