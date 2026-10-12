# Voice on Titan

A small HTML, CSS, and JavaScript site that records your voice and plays it back as it might sound on Titan, Saturn’s moon: **lower pitch** and **muffled**.

## Run it

Open `index.html` in a browser, or serve the folder locally (needed on some browsers for the microphone):

```bash
python -m http.server 8080
```

Then go to `http://127.0.0.1:8080/`. Allow microphone access. Chrome or Edge work best.

1. Click **Record** and speak.
2. Click **Stop recording**.
3. Compare **Play on Earth** and **Play on Titan**.

Recordings stop automatically after `MAX_SECONDS`.

## Tune the Titan voice

Edit **`constants.js`**, refresh the page, and **record again**. The Titan mix is built when recording stops, not when you hit play.

| Constant | Default | What it does |
| --- | --- | --- |
| `PITCH` | `0.62` | How low the voice goes. `1` is unchanged. `0.5` is a full octave down. `0.62` is roughly Titan (speed of sound ~194 m/s vs ~343 m/s on Earth). |
| `MUFFLE` | `0.7` | How thick the air sounds. `0` is almost clear. `1` is very muffled (low-pass + extra bass, less treble). |
| `MAX_SECONDS` | `12` | Longest recording length. |

Examples:

```js
const PITCH = 0.8;   // only a little lower
const MUFFLE = 0.3;  // still fairly clear
```

```js
const PITCH = 0.5;   // octave down
const MUFFLE = 1;    // as muffled as it gets
```

## Why it sounds like that

Titan’s surface air is colder, denser nitrogen–methane at about 1.45 bar and −179°C. Sound is slower there, so vocal-tract resonances sit lower. The dense gas also damps high frequencies, which is the muffled part.

This is an approximation in the browser, not a full acoustic simulation.

## Files

| File | Role |
| --- | --- |
| `index.html` | Page layout |
| `styles.css` | Titan-themed styling |
| `constants.js` | Pitch, muffle, and recording length |
| `app.js` | Mic recording, pitch shift, filters, playback |
