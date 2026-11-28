type TuningPreset = { name: string; notes: readonly number[] };
type Instrument = { id: string; name: string; detail: string; presets: readonly TuningPreset[] };

// MIDI pitches in physical string order, from the highest string number to 1.
export const tunerInstruments: readonly Instrument[] = [
  {
    id: "guitar", name: "Guitar", detail: "6 Strings",
    presets: [
      { name: "Standard", notes: [40, 45, 50, 55, 59, 64] },
      { name: "Drop D", notes: [38, 45, 50, 55, 59, 64] },
      { name: "Half Step Down", notes: [39, 44, 49, 54, 58, 63] },
      { name: "Open G", notes: [38, 43, 50, 55, 59, 62] },
      { name: "DADGAD", notes: [38, 45, 50, 55, 57, 62] },
    ],
  },
  {
    id: "guitar7", name: "Guitar", detail: "7 Strings",
    presets: [
      { name: "Standard", notes: [35, 40, 45, 50, 55, 59, 64] },
      { name: "Drop A", notes: [33, 40, 45, 50, 55, 59, 64] },
    ],
  },
  {
    id: "bass", name: "Bass", detail: "4 Strings",
    presets: [
      { name: "Standard", notes: [28, 33, 38, 43] },
      { name: "Drop D", notes: [26, 33, 38, 43] },
      { name: "Half Step Down", notes: [27, 32, 37, 42] },
    ],
  },
  {
    id: "bass5", name: "Bass", detail: "5 Strings",
    presets: [
      { name: "Standard", notes: [23, 28, 33, 38, 43] },
      { name: "Drop A", notes: [21, 28, 33, 38, 43] },
    ],
  },
  {
    id: "bass6", name: "Bass", detail: "6 Strings",
    presets: [{ name: "Standard", notes: [23, 28, 33, 38, 43, 48] }],
  },
  {
    id: "ukulele", name: "Ukulele", detail: "4 Strings",
    presets: [
      { name: "Standard (High G)", notes: [67, 60, 64, 69] },
      { name: "Low G", notes: [55, 60, 64, 69] },
    ],
  },
  {
    id: "violin", name: "Violin", detail: "4 Strings",
    presets: [{ name: "Standard", notes: [55, 62, 69, 76] }],
  },
  { id: "chromatic", name: "Chromatic", detail: "Any Note", presets: [] },
];
