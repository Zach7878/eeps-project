// Tweak these two numbers, then refresh and record again.
//
// PITCH:  1 = original, 0.5 = one octave lower, 0.57 ≈ Titan (mixed / voice)
// MUFFLE: 0 = clear, 1 = very muffled (thick atmosphere)

const MUFFLE = 0;

const MAX_SECONDS = 12;

const SOUND_SPEED_EARTH = 343; // m/s
const SOUND_SPEED_TITAN = 194; // m/s
const PITCH = 0.5612
const AIR_PITCH = 0.5612
const TITAN_PROFILES = {
  // Mixed recordings and voice: same pitch-down + muffling as before
  voice: { pitch: PITCH, muffle: MUFFLE },
  // Air-column instruments (flute, trumpet, organ): pitch follows sound speed
  air: { pitch: AIR_PITCH, muffle: MUFFLE },
  // Solid vibrators (violin, piano, drums): pitch stays; only the air filters
  solid: { pitch: 1, muffle: MUFFLE },
};

const SAMPLES = [
  {
    file: "Payphone - Maroon 5 (Acapella - Vocals Only).mp3",
    label: "Payphone - Maroon 5",
    type: "voice",
    note: "Isolated vocals from Maroon 5's pop song Payphone",
  },
  {
    file: "Sirens.mp3",
    label: "Sirens (flute)",
    type: "air",
    note: "Air-column instrument — on Titan the pitch drops with the slower speed of sound.",
  },
  {
    file: "J.S.Bach - BADINERIE - BWV 1067 - Two Violins.mp3",
    label: "Bach Badinerie (two violins)",
    type: "solid",
    note: "Strings — pitch stays put; Titan only changes the air around the instrument.",
  },
];
