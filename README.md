# Amul Kool Koko — 3D Interactive Scroll Experience 🍫🥛

An Apple/Awwwards-inspired, high-performance scroll-driven 3D product showcase for **Amul Kool Koko** (The Real Chocolate Chill).

---

## ✨ Features

- **235-Frame 3D Scroll Canvas Engine**: Seamless Full HD 1920x1080 sequence scrubbing with linear interpolation (Lerp) physics for buttery 60–120 FPS motion.
- **Progressive Preloading**: Instant start on first frame paint with background batch streaming and nearest-frame fallback.
- **Cinematic Narrative Beats**: Responsive glassmorphism cards highlighting cocoa sourcing, cold-chain integrity, nutrition facts, and cooperative heritage.
- **Interactive Scrubber & Autoplay**: Includes a flush bottom timeline scrubber and spacebar/button toggle for hands-free 3D rotation.
- **Web Audio FX**: Built-in procedural acoustic effects synthesized directly with the Web Audio API (zero audio file downloads).
- **Vercel-Ready**: Preconfigured with `vercel.json` edge caching rules (`Cache-Control: public, max-age=31536000, immutable` for all 235 frames) for fast global delivery.

---

## 🚀 One-Click Deploy to Vercel

1. Import this repository into [Vercel](https://vercel.com/new).
2. Framework Preset: **Other** (Zero-configuration static).
3. Root Directory: `./` (default).
4. Click **Deploy**. Vercel will automatically serve `index.html` with full edge caching.

---

## 💻 Local Development

Run any static server or Python's built-in server:

```bash
# Using Python
python -m http.server 8000

# Or using Node (npx)
npx serve .
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## 📁 Project Structure

```
├── frames/              # 235 Full HD animation frames (001 - 235)
├── index.html           # Main semantic HTML5 markup
├── style.css            # Responsive styles & glassmorphic UI
├── app.js               # Canvas scroll animator & lerp engine
├── vercel.json          # Edge routing & HTTP header optimization
├── package.json         # Project metadata & npm scripts
└── README.md            # Documentation
```

