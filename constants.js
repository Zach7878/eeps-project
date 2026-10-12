// Tweak these two numbers, then refresh and record again.
//
// PITCH:  1 = original, 0.5 = one octave lower, 0.62 ≈ Titan (mixed / voice)
// MUFFLE: 0 = clear, 1 = very muffled (thick atmosphere)

const PITCH = 0.62;
const MUFFLE = 0.7;

const MAX_SECONDS = 12;

const SOUND_SPEED_EARTH = 343; // m/s
const SOUND_SPEED_TITAN = 194; // m/s
const AIR_PITCH = SOUND_SPEED_TITAN / SOUND_SPEED_EARTH; // ≈ 0.57

const TITAN_PROFILES = {
  // Mixed recordings and voice: same pitch-down + muffling as before
  mixed: { pitch: PITCH, muffle: MUFFLE },
  voice: { pitch: PITCH, muffle: MUFFLE },
  // Air-column instruments (flute, trumpet, organ): pitch follows sound speed
  air: { pitch: AIR_PITCH, muffle: MUFFLE },
  // Solid vibrators (violin, piano, drums): pitch stays; only the air filters
  solid: { pitch: 1, muffle: MUFFLE },
};

const SAMPLES = [
  {
    file: "Beethoven's 5th Symphony.mp3",
    label: "Beethoven's 5th Symphony",
    type: "mixed",
    note: "Full orchestra — mixed, so Titan uses the same pitch and muffle as your voice.",
  },
  {
    file: "Call Me Maybe.mp3",
    label: "Call Me Maybe",
    type: "mixed",
    note: "Pop mix — same default Titan treatment as the orchestra.",
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
