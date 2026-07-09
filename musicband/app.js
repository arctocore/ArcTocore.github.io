"use strict";

/* ---------- Sample library bases (verified reachable, CORS *) ---------- */
const DRUM_BASE = "https://tonejs.github.io/audio/drum-samples/acoustic-kit/";
const INST_BASE = "https://nbrosowsky.github.io/tonejs-instruments/samples/";

/* ---------- Constants & music theory ---------- */
const STEPS_PER_BAR = 16;
const DEFAULT_BARS = 16;
const MAX_BARS = 64;
const STEP_W = 26;
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SCALE_INTERVALS = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10]
};

const KEY_MAP = [
  { key: "a", note: "C4" }, { key: "w", note: "C#4" }, { key: "s", note: "D4" },
  { key: "e", note: "D#4" }, { key: "d", note: "E4" }, { key: "f", note: "F4" },
  { key: "t", note: "F#4" }, { key: "g", note: "G4" }, { key: "y", note: "G#4" },
  { key: "h", note: "A4" }, { key: "u", note: "A#4" }, { key: "j", note: "B4" },
  { key: "k", note: "C5" }, { key: "o", note: "C#5" }, { key: "l", note: "D5" }
];

const DRUM_PIECE_LABELS = {
  kick: "Kick", snare: "Snare", hihat: "Hi-Hat", tom1: "Tom Hi", tom2: "Tom Mid", tom3: "Tom Low"
};

const NOTE_CHOICES = [
  "C2", "D2", "E2", "F2", "G2", "A2", "B2",
  "C3", "D3", "E3", "F3", "G3", "A3", "B3",
  "C4", "D4", "E4", "F4", "G4", "A4", "B4",
  "C5", "D5", "E5"
];

/* ---------- Helpers for sample maps ---------- */
function sampleUrls(notes) {
  const urls = {};
  [...new Set(notes)].forEach((note) => { urls[note] = `${note}.mp3`; });
  return urls;
}

function notesToPads(notes) {
  return notes.map((note) => ({ label: note.replace(/[0-9]/g, ""), name: note, notes: [note] }));
}

function chordPad(label, notes) {
  return { label, name: notes.join(" "), notes };
}

function chordPads() {
  return [
    chordPad("Cmaj7", ["C3", "E3", "G3", "B3"]), chordPad("Dm7", ["D3", "F3", "A3", "C4"]),
    chordPad("Em7", ["E3", "G3", "B3", "D4"]), chordPad("Fmaj7", ["F3", "A3", "C4", "E4"]),
    chordPad("G7", ["G3", "B3", "D4", "F4"]), chordPad("Am7", ["A3", "C4", "E4", "G4"]),
    chordPad("Bbmaj", ["Bb3", "D4", "F4", "A4"]), chordPad("Csus", ["C4", "F4", "G4", "Bb4"])
  ];
}

function guitarChordPads() {
  return [
    chordPad("C", ["C3", "E3", "G3"]), chordPad("Dm", ["D3", "F3", "A3"]),
    chordPad("Em", ["E3", "G3", "B3"]), chordPad("F", ["F3", "A3", "C4"]),
    chordPad("G", ["G3", "B3", "D4"]), chordPad("Am", ["A3", "C4", "E4"]),
    chordPad("Bb", ["Bb3", "D4", "F4"]), chordPad("C+", ["C4", "E4", "G4"])
  ];
}

/* ---------- Traditional band instruments (real samples + synth fallback) ---------- */
const instrumentDefs = [
  {
    id: "drums", name: "Drum Kit", short: "Drums", role: "Real Acoustic", color: "#ff7c4d", duration: "16n",
    sample: { kind: "drum", baseUrl: DRUM_BASE, urls: { kick: "kick.mp3", snare: "snare.mp3", hihat: "hihat.mp3", tom1: "tom1.mp3", tom2: "tom2.mp3", tom3: "tom3.mp3" } },
    pads: [
      { label: "Kick", name: "Sub", drum: "kick" }, { label: "Snare", name: "Snap", drum: "snare" },
      { label: "Hi-Hat", name: "Closed", drum: "hihat" }, { label: "Tom Hi", name: "Rack", drum: "tom1" },
      { label: "Tom Mid", name: "Rack", drum: "tom2" }, { label: "Tom Low", name: "Floor", drum: "tom3" }
    ]
  },
  {
    id: "bass", name: "Bass Guitar", short: "Bass", role: "Low End", color: "#76f7bf", duration: "8n",
    sample: { kind: "melodic", baseUrl: `${INST_BASE}bass-electric/`, urls: sampleUrls(["E1", "E2", "G2", "E3", "G3", "E4"]) },
    fallback: () => new Tone.PolySynth(Tone.Synth, { oscillator: { type: "square" }, envelope: { attack: 0.01, decay: 0.18, sustain: 0.34, release: 0.24 } }),
    pads: notesToPads(["C2", "D2", "E2", "F2", "G2", "A2", "C3", "D3"])
  },
  {
    id: "guitar-acoustic", name: "Acoustic Guitar", short: "Ac.Gtr", role: "Strings", color: "#ff9f5a", duration: "8n",
    sample: { kind: "melodic", baseUrl: `${INST_BASE}guitar-acoustic/`, urls: sampleUrls(["E2", "A2", "D3", "E3", "G3", "B3", "D4", "G4"]) },
    fallback: () => new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.008, decay: 0.4, sustain: 0.1, release: 0.9 } }),
    pads: guitarChordPads()
  },
  {
    id: "guitar-electric", name: "Electric Guitar", short: "El.Gtr", role: "Strings", color: "#f6c453", duration: "8n",
    sample: { kind: "melodic", baseUrl: `${INST_BASE}guitar-electric/`, urls: sampleUrls(["E2", "A2", "C3", "A3", "C4", "A4"]) },
    fallback: () => new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sawtooth" }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.3, release: 0.7 } }),
    pads: guitarChordPads()
  },
  {
    id: "piano", name: "Grand Piano", short: "Piano", role: "Keys", color: "#ffd166", duration: "4n",
    sample: { kind: "melodic", baseUrl: `${INST_BASE}piano/`, urls: sampleUrls(["C2", "A2", "C3", "A3", "C4", "A4", "C5", "C6"]) },
    fallback: () => new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle8" }, envelope: { attack: 0.01, decay: 0.24, sustain: 0.36, release: 1.1 } }),
    pads: chordPads()
  },
  {
    id: "violin", name: "Violin", short: "Violin", role: "Strings", color: "#9e8cff", duration: "2n",
    sample: { kind: "melodic", baseUrl: `${INST_BASE}violin/`, urls: sampleUrls(["G3", "C4", "E4", "A4", "C5", "E5", "A5"]) },
    fallback: () => new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sawtooth" }, envelope: { attack: 0.35, decay: 0.18, sustain: 0.8, release: 1.4 } }),
    pads: notesToPads(["G3", "A3", "B3", "C4", "D4", "E4", "G4", "A4"])
  },
  {
    id: "cello", name: "Cello", short: "Cello", role: "Strings", color: "#b78cff", duration: "2n",
    sample: { kind: "melodic", baseUrl: `${INST_BASE}cello/`, urls: sampleUrls(["C2", "E2", "G2", "C3", "E3", "G3", "C4", "E4"]) },
    fallback: () => new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sawtooth" }, envelope: { attack: 0.3, decay: 0.2, sustain: 0.82, release: 1.6 } }),
    pads: notesToPads(["C2", "D2", "E2", "G2", "A2", "C3", "D3", "E3"])
  },
  {
    id: "trumpet", name: "Trumpet", short: "Trumpet", role: "Brass", color: "#ffb703", duration: "4n",
    sample: { kind: "melodic", baseUrl: `${INST_BASE}trumpet/`, urls: sampleUrls(["F3", "A3", "C4", "F4", "G4", "D5"]) },
    fallback: () => new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsawtooth" }, envelope: { attack: 0.06, decay: 0.18, sustain: 0.6, release: 0.5 } }),
    pads: notesToPads(["C4", "D4", "E4", "F4", "G4", "A4", "C5", "D5"])
  },
  {
    id: "saxophone", name: "Saxophone", short: "Sax", role: "Brass", color: "#ef8354", duration: "4n",
    sample: { kind: "melodic", baseUrl: `${INST_BASE}saxophone/`, urls: sampleUrls(["E3", "G3", "C4", "E4", "G4", "C5", "E5"]) },
    fallback: () => new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsquare" }, envelope: { attack: 0.05, decay: 0.16, sustain: 0.66, release: 0.5 } }),
    pads: notesToPads(["C4", "D4", "Eb4", "F4", "G4", "A4", "C5", "D5"])
  },
  {
    id: "flute", name: "Flute", short: "Flute", role: "Woodwind", color: "#8ee6ff", duration: "4n",
    sample: { kind: "melodic", baseUrl: `${INST_BASE}flute/`, urls: sampleUrls(["C4", "E4", "A4", "C5", "E5", "A5", "C6"]) },
    fallback: () => new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 0.1, decay: 0.1, sustain: 0.8, release: 0.5 } }),
    pads: notesToPads(["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6"])
  },
  {
    id: "organ", name: "Organ", short: "Organ", role: "Keys", color: "#d4f75f", duration: "4n",
    sample: { kind: "melodic", baseUrl: `${INST_BASE}organ/`, urls: sampleUrls(["C2", "C3", "A3", "C4", "A4", "C5"]) },
    fallback: () => new Tone.PolySynth(Tone.AMSynth, { harmonicity: 1.5, envelope: { attack: 0.02, decay: 0.1, sustain: 0.88, release: 0.28 } }),
    pads: chordPads()
  },
  {
    id: "sample", name: "Sample 1", short: "Smpl 1", role: "Recorded", color: "#63d8ff", duration: "2n", recorded: true,
    pads: notesToPads(["C3", "D3", "E3", "G3", "A3", "C4", "D4", "E4"])
  },
  {
    id: "vocals", name: "Vocals", short: "Vocals", role: "Human Voice", color: "#ff8fab", duration: "2n", vocal: true,
    pads: [
      { label: "Hey!", name: "Hey, hey!" }, { label: "Oh yeah", name: "Oh yeah!" },
      { label: "La la", name: "La la la la" }, { label: "Sing", name: "Sing it out loud" },
      { label: "Woah", name: "Woah oh oh" }, { label: "Come on", name: "Come on now" },
      { label: "Alright", name: "Alright, alright" }, { label: "One more", name: "One more time" }
    ]
  }
];

/* ---------- Add-to-loop instrument options ---------- */
const addOptions = [
  { value: "drums:kick", label: "Drums · Kick" },
  { value: "drums:snare", label: "Drums · Snare" },
  { value: "drums:hihat", label: "Drums · Hi-Hat" },
  { value: "drums:tom1", label: "Drums · Tom Hi" },
  { value: "drums:tom2", label: "Drums · Tom Mid" },
  { value: "drums:tom3", label: "Drums · Tom Low" },
  { value: "bass", label: "Bass Guitar" },
  { value: "guitar-acoustic", label: "Acoustic Guitar" },
  { value: "guitar-electric", label: "Electric Guitar" },
  { value: "piano", label: "Grand Piano" },
  { value: "violin", label: "Violin" },
  { value: "cello", label: "Cello" },
  { value: "trumpet", label: "Trumpet" },
  { value: "saxophone", label: "Saxophone" },
  { value: "flute", label: "Flute" },
  { value: "organ", label: "Organ" },
  { value: "sample", label: "Sample 1 (Recorded)" },
  { value: "vocals", label: "Vocals (Voice)" }
];

/* ---------- Song presets (real band arrangements) ---------- */
const presets = [
  {
    id: "pop", name: "Pop / Rock", genre: "Band", tempo: 112, swing: 0.04, build: () => [
      makeTrack("drums", { piece: "kick", steps: [0, 8, 10] }),
      makeTrack("drums", { piece: "snare", steps: [4, 12] }),
      makeTrack("drums", { piece: "hihat", steps: [0, 2, 4, 6, 8, 10, 12, 14] }),
      makeTrack("bass", { notes: ["C2"], steps: [0, 3, 8, 11] }),
      makeTrack("guitar-electric", { notes: ["C3", "E3", "G3"], steps: [0, 4, 8, 12] }),
      makeTrack("piano", { notes: ["E4", "G4", "C5"], steps: [0, 8] })
    ]
  },
  {
    id: "funk", name: "Funk", genre: "Band", tempo: 104, swing: 0.16, build: () => [
      makeTrack("drums", { piece: "kick", steps: [0, 3, 6, 10] }),
      makeTrack("drums", { piece: "snare", steps: [4, 12] }),
      makeTrack("drums", { piece: "hihat", steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] }),
      makeTrack("bass", { notes: ["E2"], steps: [0, 3, 6, 8, 11, 14] }),
      makeTrack("guitar-electric", { notes: ["E3", "G3", "B3"], steps: [2, 6, 10, 14] }),
      makeTrack("trumpet", { notes: ["E4"], steps: [0, 8] })
    ]
  },
  {
    id: "ballad", name: "Ballad", genre: "Band", tempo: 76, swing: 0.02, build: () => [
      makeTrack("drums", { piece: "kick", steps: [0, 8] }),
      makeTrack("drums", { piece: "snare", steps: [4, 12] }),
      makeTrack("drums", { piece: "hihat", steps: [0, 4, 8, 12] }),
      makeTrack("bass", { notes: ["A1"], steps: [0, 8] }),
      makeTrack("piano", { notes: ["A3", "C4", "E4"], steps: [0, 4, 8, 12] }),
      makeTrack("violin", { notes: ["A4"], steps: [0, 8] }),
      makeTrack("cello", { notes: ["A2"], steps: [0, 8] })
    ]
  },
  {
    id: "jazz", name: "Jazz Swing", genre: "Band", tempo: 128, swing: 0.4, build: () => [
      makeTrack("drums", { piece: "hihat", steps: [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15] }),
      makeTrack("drums", { piece: "kick", steps: [0, 8] }),
      makeTrack("drums", { piece: "snare", steps: [4, 12] }),
      makeTrack("bass", { notes: ["D2"], steps: [0, 4, 8, 12] }),
      makeTrack("piano", { notes: ["F3", "A3", "C4", "E4"], steps: [2, 10] }),
      makeTrack("saxophone", { notes: ["A4"], steps: [0, 8] })
    ]
  }
];

/* ---------- DOM references ---------- */
const elements = {
  audioStart: document.querySelector("#audioStart"),
  playStop: document.querySelector("#playStop"),
  panic: document.querySelector("#panic"),
  recordToggle: document.querySelector("#recordToggle"),
  metronomeToggle: document.querySelector("#metronomeToggle"),
  clearLoop: document.querySelector("#clearLoop"),
  saveProject: document.querySelector("#saveProject"),
  loadProject: document.querySelector("#loadProject"),
  projectFileInput: document.querySelector("#projectFileInput"),
  statusText: document.querySelector("#statusText"),
  positionText: document.querySelector("#positionText"),
  tempo: document.querySelector("#tempo"),
  tempoValue: document.querySelector("#tempoValue"),
  masterVolume: document.querySelector("#masterVolume"),
  masterValue: document.querySelector("#masterValue"),
  octaveShift: document.querySelector("#octaveShift"),
  octaveValue: document.querySelector("#octaveValue"),
  reverbMix: document.querySelector("#reverbMix"),
  reverbValue: document.querySelector("#reverbValue"),
  delayMix: document.querySelector("#delayMix"),
  delayValue: document.querySelector("#delayValue"),
  delayFeedback: document.querySelector("#delayFeedback"),
  delayFeedbackValue: document.querySelector("#delayFeedbackValue"),
  chorusMix: document.querySelector("#chorusMix"),
  chorusValue: document.querySelector("#chorusValue"),
  distortionMix: document.querySelector("#distortionMix"),
  distortionValue: document.querySelector("#distortionValue"),
  filterFreq: document.querySelector("#filterFreq"),
  filterValue: document.querySelector("#filterValue"),
  bitcrushMix: document.querySelector("#bitcrushMix"),
  bitcrushValue: document.querySelector("#bitcrushValue"),
  swingMix: document.querySelector("#swingMix"),
  swingValue: document.querySelector("#swingValue"),
  instrumentGrid: document.querySelector("#instrumentGrid"),
  presetButtons: document.querySelector("#presetButtons"),
  selectedInstrument: document.querySelector("#selectedInstrument"),
  padGrid: document.querySelector("#padGrid"),
  piano: document.querySelector("#piano"),
  stopPlaying: document.querySelector("#stopPlaying"),
  recordSampleToggle: document.querySelector("#recordSampleToggle"),
  recordMic: document.querySelector("#recordMic"),
  generateMusic: document.querySelector("#generateMusic"),
  genMusicStyle: document.querySelector("#genMusicStyle"),
  genSoundType: document.querySelector("#genSoundType"),
  genSoundTypeSeq: document.querySelector("#genSoundTypeSeq"),
  scaleSelect: document.querySelector("#scaleSelect"),
  mixerGrid: document.querySelector("#mixerGrid"),
  stepLabels: document.querySelector("#stepLabels"),
  sequenceGrid: document.querySelector("#sequenceGrid"),
  sequencerBuilder: document.querySelector(".sequencer-builder"),
  addInstrument: document.querySelector("#addInstrument"),
  addNote: document.querySelector("#addNote"),
  lyricsInput: document.querySelector("#lyricsInput"),
  vocalRate: document.querySelector("#vocalRate"),
  vocalRateValue: document.querySelector("#vocalRateValue"),
  vocalPitch: document.querySelector("#vocalPitch"),
  vocalPitchValue: document.querySelector("#vocalPitchValue"),
  vocalVolume: document.querySelector("#vocalVolume"),
  vocalVolumeValue: document.querySelector("#vocalVolumeValue"),
  vocalVariation: document.querySelector("#vocalVariation"),
  vocalVariationValue: document.querySelector("#vocalVariationValue"),
  vocalVibrato: document.querySelector("#vocalVibrato"),
  vocalVibratoValue: document.querySelector("#vocalVibratoValue"),
  voiceCurve: document.querySelector("#voiceCurve"),
  voiceCurveDepth: document.querySelector("#voiceCurveDepth"),
  voiceCurveDepthValue: document.querySelector("#voiceCurveDepthValue"),
  voiceCurveRate: document.querySelector("#voiceCurveRate"),
  voiceCurveRateValue: document.querySelector("#voiceCurveRateValue"),
  addTrack: document.querySelector("#addTrack"),
  testVoice: document.querySelector("#testVoice"),
  randomizeSeq: document.querySelector("#randomizeSeq"),
  genreSelect: document.querySelector("#genreSelect"),
  songLength: document.querySelector("#songLength"),
  vocalsToggle: document.querySelector("#vocalsToggle"),
  voiceSelect: document.querySelector("#voiceSelect"),
  bandVoiceSelect: document.querySelector("#bandVoiceSelect"),
  voiceStyle: document.querySelector("#voiceStyle"),
  songLyrics: document.querySelector("#songLyrics"),
  testSongVoice: document.querySelector("#testSongVoice"),
  randomGenre: document.querySelector("#randomGenre"),
  clearSeq: document.querySelector("#clearSeq"),
  exportWav: document.querySelector("#exportWav"),
  barsInput: document.querySelector("#barsInput"),
  uploadSample: document.querySelector("#uploadSample"),
  sampleFileInput: document.querySelector("#sampleFileInput"),
  seqPlay: document.querySelector("#seqPlay"),
  seqStop: document.querySelector("#seqStop"),
  seqRecord: document.querySelector("#seqRecord"),
  seqClear: document.querySelector("#seqClear"),
  downloadModal: document.querySelector("#downloadModal"),
  downloadClose: document.querySelector("#downloadClose"),
  downloadTitle: document.querySelector("#downloadTitle"),
  downloadStatus: document.querySelector("#downloadStatus"),
  downloadWav: document.querySelector("#downloadWav"),
  downloadMp3: document.querySelector("#downloadMp3"),
  renameModal: document.querySelector("#renameModal"),
  renameTitle: document.querySelector("#renameTitle"),
  renameInput: document.querySelector("#renameInput"),
  renameSave: document.querySelector("#renameSave"),
  renameCancel: document.querySelector("#renameCancel"),
  renameClose: document.querySelector("#renameClose"),
  sequencerScroll: document.querySelector(".sequencer-scroll"),
  addBars: document.querySelector("#addBars"),
  removeBars: document.querySelector("#removeBars"),
  barCount: document.querySelector("#barCount"),
  visualizer: document.querySelector("#visualizer"),
  meterL: document.querySelector("#meterL"),
  meterR: document.querySelector("#meterR"),
  tempoBottom: document.querySelector("#tempoBottom"),
  tempoBottomValue: document.querySelector("#tempoBottomValue"),
  timelineSpeed: document.querySelector("#timelineSpeed"),
  timelineSpeedValue: document.querySelector("#timelineSpeedValue"),
  masterBottom: document.querySelector("#masterBottom"),
  masterBottomValue: document.querySelector("#masterBottomValue"),
  octaveBottom: document.querySelector("#octaveBottom"),
  octaveBottomValue: document.querySelector("#octaveBottomValue"),
  testSample: document.querySelector("#testSample"),
  exportSample: document.querySelector("#exportSample"),
  sampleStretch: document.querySelector("#sampleStretch"),
  sampleStretchValue: document.querySelector("#sampleStretchValue"),
  sampleStretchWrap: document.querySelector("#sampleStretchWrap"),
  rackSongText: document.querySelector("#rackSongText"),
  bandSongLyrics: document.querySelector("#bandSongLyrics"),
  bandTestVoice: document.querySelector("#bandTestVoice")
};

/* ---------- App state ---------- */
let seqUid = 0;
const state = {
  ready: false,
  isPlaying: false,
  isRecording: false,
  silentRecord: false,
  sampleRecording: false,
  sampleChunks: [],
  sampleNodes: null,
  micRecording: false,
  micNodes: null,
  micChunks: [],
  micTimeout: null,
  captureContext: null,
  sampleSamplers: {},
  sampleBuffers: {},
  sampleDurations: {},
  sampleStretch: {},
  regionPlayers: {},
  pendingSampleBuffers: {},
  sampleDb: null,
  sampleTapDest: null,
  sampleSlotCount: 1,
  renameTarget: null,
  sampleTimeout: null,
  metronomeOn: false,
  vocalsOn: true,
  voice: null,
  voiceMode: "auto",
  voiceStyle: "natural",
  voiceCatalog: [],
  songTestIndex: 0,
  vocalRate: 0.95,
  vocalPitch: 1,
  vocalVolume: 0.95,
  vocalVariation: 0.15,
  vocalVibrato: 0,
  voiceSineDepth: 0,
  voiceSineRate: 0.5,
  voiceSinePhase: 0,
  selectedInstrument: "piano",
  scale: "major",
  octaveOffset: 0,
  bars: DEFAULT_BARS,
  activeStep: -1,
  nextStep: 0,
  loadingCount: 0,
  repeatId: null,
  nodes: {},
  instruments: {},
  soundTypeSynths: {},
  soundTypeDrums: null,
  channels: {},
  channelSettings: {},
  soloed: new Set(),
  recordedEvents: [],
  recordingBuffer: null,
  downloadBaseName: null,
  activeKeyNotes: new Map(),
  seqTracks: [],
  stepColumns: [],
  currentColumn: null
};

state.seqTracks = defaultSeqTracks();

/* ---------- Init ---------- */
renderInstrumentRack();
renderPresets();
renderPads();
renderPiano();
renderMixer();
populateBuilder();
renderSequencer();
updateBarCount();
updateControlLabels();
setupEvents();
setupAccordions();
setupVisualizer();
refreshIcons();
drawVoiceCurve();
updateStopPlayingButton();
restoreSamplesFromDb();

/* ---------- Timeline helpers ---------- */
function totalSteps() {
  return state.bars * STEPS_PER_BAR;
}

/* ---------- Track factory ---------- */
function makeTrack(instrumentId, options) {
  const def = getInstrumentDef(instrumentId);
  const length = options.pattern ? options.pattern.length : (options.length || totalSteps());
  const pattern = options.pattern ? options.pattern.slice() : new Array(length).fill(0);
  (options.steps || []).forEach((step) => { if (step >= 0 && step < pattern.length) pattern[step] = 1; });
  seqUid += 1;
  return {
    uid: seqUid,
    instrumentId,
    kind: def.vocal ? "vocal" : (def.recorded ? "sample" : (def.sample && def.sample.kind === "drum" ? "drum" : "melodic")),
    piece: options.piece || null,
    notes: options.notes || null,
    stepNotes: options.stepNotes || null,
    duration: def.duration,
    color: def.color,
    pattern
  };
}

// Repeat a one-bar set of step indices across the whole current timeline.
function repeatBar(barSteps) {
  const steps = [];
  for (let bar = 0; bar < state.bars; bar += 1) {
    barSteps.forEach((step) => steps.push(bar * STEPS_PER_BAR + step));
  }
  return steps;
}

function defaultSeqTracks() {
  // A tasteful swing-jazz combo: brushed swing drums, walking upright bass, piano comping
  // and a saxophone melody over a ii-V-I in C. (Inline literals avoid touching the PROG/KIT/CH
  // consts that are declared later in the file.)
  const bars = state.bars || DEFAULT_BARS;
  const head = Math.max(2, Math.round(bars / 4));
  const solo = Math.max(2, bars - head * 2);
  const form = [{ name: "head", bars: head }, { name: "solo", bars: solo }, { name: "head", bars: head }];
  const jazzProg = [
    { bass: "D2", notes: ["D3", "F3", "A3", "C4"] },
    { bass: "G2", notes: ["G3", "B3", "D4", "F4"] },
    { bass: "C2", notes: ["C3", "E3", "G3", "B3"] },
    { bass: "A2", notes: ["A3", "C4", "E4", "G4"] }
  ];
  const swingKit = { jazz: true, ride: [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15], kick: [0, 8], snare: [4, 12] };
  const chordAt = (bar) => jazzProg[bar % jazzProg.length];
  const tracks = [];
  buildDrums(swingKit, form).forEach((drumTrack) => tracks.push(drumTrack));
  const bass = buildBass("walking", form, chordAt);
  if (bass) {
    tracks.push(bass);
  }
  const chords = buildChords("piano", "stab", form, chordAt);
  if (chords) {
    tracks.push(chords);
  }
  const lead = buildLead("saxophone", form, chordAt);
  if (lead) {
    tracks.push(lead);
  }
  return tracks;
}

/* ---------- Music helpers ---------- */
function getInstrumentDef(instrumentId) {
  return instrumentDefs.find((definition) => definition.id === instrumentId) ?? instrumentDefs[4];
}

function midiFromNote(note) {
  const match = /^([A-G])(#|b)?(-?\d)$/.exec(note);
  if (!match) {
    return 60;
  }
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[match[1]];
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  return base + accidental + (Number(match[3]) + 1) * 12;
}

function noteFromMidi(midi) {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

function isNoteInScale(note) {
  const interval = midiFromNote(note) % 12;
  return SCALE_INTERVALS[state.scale].includes(interval);
}

function applyOctave(note) {
  if (state.octaveOffset === 0) {
    return note;
  }
  return noteFromMidi(midiFromNote(note) + state.octaveOffset * 12);
}

/* ---------- Event wiring ---------- */
function setupAccordions() {
  document.querySelectorAll(".accordion-toggle").forEach((toggle) => {
    const container = toggle.closest("[data-accordion]");
    if (!container) {
      return;
    }
    const toggleAccordion = () => {
      const collapsed = container.classList.toggle("is-collapsed");
      toggle.setAttribute("aria-expanded", String(!collapsed));
    };
    toggle.addEventListener("click", toggleAccordion);
    toggle.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleAccordion();
      }
    });
  });
}

function setupEvents() {
  elements.audioStart.addEventListener("click", startAudio);
  elements.playStop.addEventListener("click", toggleTransport);
  elements.panic.addEventListener("click", stopTransport);
  elements.recordToggle.addEventListener("click", toggleRecording);
  elements.metronomeToggle.addEventListener("click", toggleMetronome);
  elements.clearLoop.addEventListener("click", clearRecording);
  if (elements.saveProject) {
    elements.saveProject.addEventListener("click", saveProject);
  }
  if (elements.loadProject) {
    elements.loadProject.addEventListener("click", triggerLoadProject);
  }
  if (elements.projectFileInput) {
    elements.projectFileInput.addEventListener("change", onProjectFileChosen);
  }
  elements.randomizeSeq.addEventListener("click", randomizeSequencer);
  if (elements.clearSeq) {
    elements.clearSeq.addEventListener("click", clearSequencer);
  }
  if (elements.exportWav) {
    elements.exportWav.addEventListener("click", exportWav);
  }
  if (elements.stopPlaying) {
    elements.stopPlaying.addEventListener("click", stopAllPlaying);
  }
  if (elements.recordSampleToggle) {
    elements.recordSampleToggle.addEventListener("click", toggleSampleRecording);
  }
  if (elements.recordMic) {
    elements.recordMic.addEventListener("click", toggleMicRecording);
  }
  if (elements.generateMusic) {
    elements.generateMusic.addEventListener("click", generateMusicForSelected);
  }
  if (elements.genSoundType) {
    elements.genSoundType.addEventListener("change", onSoundTypeChange);
  }
  if (elements.genSoundTypeSeq) {
    elements.genSoundTypeSeq.addEventListener("change", () => {
      if (elements.genSoundType) {
        elements.genSoundType.value = elements.genSoundTypeSeq.value;
      }
      onSoundTypeChange();
    });
  }
  if (elements.exportSample) {
    elements.exportSample.addEventListener("click", exportSelectedSample);
  }
  elements.addTrack.addEventListener("click", addTrackFromBuilder);
  if (elements.testVoice) {
    elements.testVoice.addEventListener("click", previewVoice);
  }
  elements.addInstrument.addEventListener("change", updateBuilderMode);
  elements.sequenceGrid.addEventListener("click", onSeqGridClick);
  if (elements.addBars) {
    elements.addBars.addEventListener("click", () => addBars(4));
  }
  if (elements.removeBars) {
    elements.removeBars.addEventListener("click", () => addBars(-4));
  }
  if (elements.barsInput) {
    elements.barsInput.addEventListener("change", () => {
      const value = Number(elements.barsInput.value);
      if (Number.isFinite(value)) {
        setBars(Math.round(value));
      }
      elements.barsInput.value = String(state.bars);
    });
  }
  if (elements.uploadSample && elements.sampleFileInput) {
    elements.uploadSample.addEventListener("click", () => elements.sampleFileInput.click());
    elements.sampleFileInput.addEventListener("change", onSampleFileChange);
  }
  if (elements.vocalsToggle) {
    elements.vocalsToggle.addEventListener("click", toggleVocals);
  }
  if (elements.voiceSelect) {
    elements.voiceSelect.addEventListener("change", onVoiceChange);
  }
  if (elements.bandVoiceSelect) {
    elements.bandVoiceSelect.addEventListener("change", onBandVoiceChange);
  }
  if (elements.voiceStyle) {
    elements.voiceStyle.addEventListener("change", () => applyVoiceStyle(elements.voiceStyle.value));
  }
  if (elements.testSongVoice) {
    elements.testSongVoice.addEventListener("click", previewSongVoice);
  }
  if (elements.vocalRate) {
    elements.vocalRate.addEventListener("input", () => {
      state.vocalRate = Number(elements.vocalRate.value);
      elements.vocalRateValue.value = `${state.vocalRate.toFixed(2)}x`;
    });
  }
  if (elements.vocalPitch) {
    elements.vocalPitch.addEventListener("input", () => {
      state.vocalPitch = Number(elements.vocalPitch.value);
      elements.vocalPitchValue.value = state.vocalPitch.toFixed(1);
    });
  }
  if (elements.vocalVolume) {
    elements.vocalVolume.addEventListener("input", () => {
      state.vocalVolume = Number(elements.vocalVolume.value);
      elements.vocalVolumeValue.value = `${Math.round(state.vocalVolume * 100)}%`;
    });
  }
  if (elements.vocalVariation) {
    elements.vocalVariation.addEventListener("input", () => {
      state.vocalVariation = Number(elements.vocalVariation.value);
      elements.vocalVariationValue.value = `${Math.round(state.vocalVariation * 100)}%`;
    });
  }
  if (elements.vocalVibrato) {
    elements.vocalVibrato.addEventListener("input", () => {
      state.vocalVibrato = Number(elements.vocalVibrato.value);
      elements.vocalVibratoValue.value = `${Math.round(state.vocalVibrato * 100)}%`;
    });
  }
  if (elements.voiceCurveDepth) {
    elements.voiceCurveDepth.addEventListener("input", () => {
      state.voiceSineDepth = Number(elements.voiceCurveDepth.value);
      if (elements.voiceCurveDepthValue) {
        elements.voiceCurveDepthValue.value = `${Math.round(state.voiceSineDepth * 100)}%`;
      }
      drawVoiceCurve();
    });
  }
  if (elements.voiceCurveRate) {
    elements.voiceCurveRate.addEventListener("input", () => {
      state.voiceSineRate = Number(elements.voiceCurveRate.value);
      if (elements.voiceCurveRateValue) {
        elements.voiceCurveRateValue.value = state.voiceSineRate.toFixed(1);
      }
      drawVoiceCurve();
    });
  }
  if (elements.voiceCurve) {
    const applyCurveFromPointer = (event) => {
      const rect = elements.voiceCurve.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      state.voiceSineRate = Math.round((0.1 + x * 1.9) * 10) / 10;
      state.voiceSineDepth = Math.round((1 - y) * 20) / 20;
      if (elements.voiceCurveDepth) {
        elements.voiceCurveDepth.value = String(state.voiceSineDepth);
      }
      if (elements.voiceCurveRate) {
        elements.voiceCurveRate.value = String(state.voiceSineRate);
      }
      if (elements.voiceCurveDepthValue) {
        elements.voiceCurveDepthValue.value = `${Math.round(state.voiceSineDepth * 100)}%`;
      }
      if (elements.voiceCurveRateValue) {
        elements.voiceCurveRateValue.value = state.voiceSineRate.toFixed(1);
      }
      drawVoiceCurve();
    };
    elements.voiceCurve.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      try { elements.voiceCurve.setPointerCapture(event.pointerId); } catch (error) { /* ignore */ }
      applyCurveFromPointer(event);
      const move = (moveEvent) => applyCurveFromPointer(moveEvent);
      const up = () => {
        elements.voiceCurve.removeEventListener("pointermove", move);
        elements.voiceCurve.removeEventListener("pointerup", up);
        elements.voiceCurve.removeEventListener("pointercancel", up);
      };
      elements.voiceCurve.addEventListener("pointermove", move);
      elements.voiceCurve.addEventListener("pointerup", up);
      elements.voiceCurve.addEventListener("pointercancel", up);
    });
  }
  if (elements.seqPlay) {
    elements.seqPlay.addEventListener("click", toggleTransport);
  }
  if (elements.seqStop) {
    elements.seqStop.addEventListener("click", stopTransport);
  }
  if (elements.seqRecord) {
    elements.seqRecord.addEventListener("click", toggleRecording);
  }
  if (elements.seqClear) {
    elements.seqClear.addEventListener("click", clearSequencer);
  }
  if (elements.renameSave) {
    elements.renameSave.addEventListener("click", commitRename);
  }
  if (elements.renameCancel) {
    elements.renameCancel.addEventListener("click", closeRenameModal);
  }
  if (elements.renameClose) {
    elements.renameClose.addEventListener("click", closeRenameModal);
  }
  if (elements.renameModal) {
    elements.renameModal.addEventListener("click", (event) => {
      if (event.target === elements.renameModal) {
        closeRenameModal();
      }
    });
  }
  if (elements.renameInput) {
    elements.renameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitRename();
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeRenameModal();
      }
    });
  }
  if (elements.downloadClose) {
    elements.downloadClose.addEventListener("click", closeDownloadModal);
  }
  if (elements.downloadModal) {
    elements.downloadModal.addEventListener("click", (event) => {
      if (event.target === elements.downloadModal) {
        closeDownloadModal();
      }
    });
  }
  if (elements.downloadWav) {
    elements.downloadWav.addEventListener("click", () => {
      if (state.recordingBuffer) {
        downloadAudio(state.recordingBuffer, "wav", state.downloadBaseName || "musicband-recording");
      }
    });
  }
  if (elements.downloadMp3) {
    elements.downloadMp3.addEventListener("click", () => {
      if (!state.recordingBuffer) {
        return;
      }
      try {
        downloadAudio(state.recordingBuffer, "mp3", state.downloadBaseName || "musicband-recording");
      } catch (error) {
        console.error(error);
        elements.downloadStatus.textContent = "MP3 export failed.";
      }
    });
  }
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.renameModal && !elements.renameModal.hidden) {
      closeRenameModal();
    }
    if (event.key === "Escape" && elements.downloadModal && !elements.downloadModal.hidden) {
      closeDownloadModal();
    }
  });
  initVoices();

  elements.scaleSelect.addEventListener("change", () => {
    state.scale = elements.scaleSelect.value;
    updatePianoScale();
  });

  elements.octaveShift.addEventListener("input", () => {
    state.octaveOffset = Number(elements.octaveShift.value);
    updateControlLabels();
  });

  elements.tempo.addEventListener("input", () => {
    updateControlLabels();
    if (state.ready) {
      Tone.Transport.bpm.rampTo(Number(elements.tempo.value), 0.08);
    }
  });
  elements.tempo.addEventListener("change", retileAllRegions);

  elements.masterVolume.addEventListener("input", () => {
    updateControlLabels();
    if (state.ready) {
      state.nodes.master.volume.rampTo(Number(elements.masterVolume.value), 0.08);
    }
  });

  // Mirrored Tempo / Master / Octave controls at the bottom of the sequencer.
  if (elements.tempoBottom) {
    elements.tempoBottom.addEventListener("input", () => {
      elements.tempo.value = elements.tempoBottom.value;
      updateControlLabels();
      if (state.ready) {
        Tone.Transport.bpm.rampTo(Number(elements.tempo.value), 0.08);
      }
    });
    elements.tempoBottom.addEventListener("change", retileAllRegions);
  }
  if (elements.timelineSpeed) {
    elements.timelineSpeed.addEventListener("input", () => {
      elements.tempo.value = elements.timelineSpeed.value;
      updateControlLabels();
      if (state.ready) {
        Tone.Transport.bpm.rampTo(Number(elements.tempo.value), 0.08);
      }
    });
    elements.timelineSpeed.addEventListener("change", retileAllRegions);
  }
  if (elements.masterBottom) {
    elements.masterBottom.addEventListener("input", () => {
      elements.masterVolume.value = elements.masterBottom.value;
      updateControlLabels();
      if (state.ready) {
        state.nodes.master.volume.rampTo(Number(elements.masterVolume.value), 0.08);
      }
    });
  }
  if (elements.octaveBottom) {
    elements.octaveBottom.addEventListener("input", () => {
      elements.octaveShift.value = elements.octaveBottom.value;
      state.octaveOffset = Number(elements.octaveShift.value);
      updateControlLabels();
    });
  }
  if (elements.testSample) {
    elements.testSample.addEventListener("click", toggleSamplePreview);
  }
  if (elements.sampleStretch) {
    elements.sampleStretch.addEventListener("input", () => {
      const id = state.selectedInstrument;
      const def = getInstrumentDef(id);
      if (!def || !def.recorded) {
        return;
      }
      const value = Number(elements.sampleStretch.value);
      state.sampleStretch[id] = value;
      if (elements.sampleStretchValue) {
        elements.sampleStretchValue.value = `${value.toFixed(2)}x`;
      }
    });
    elements.sampleStretch.addEventListener("change", () => {
      const id = state.selectedInstrument;
      state.seqTracks.forEach((track) => {
        if (track.region && track.kind === "sample" && track.instrumentId === id) {
          retileRegion(track);
        }
      });
      renderSequencer();
    });
  }
  if (elements.bandTestVoice) {
    elements.bandTestVoice.addEventListener("click", previewSongVoice);
  }
  if (elements.bandSongLyrics) {
    elements.bandSongLyrics.addEventListener("input", () => {
      if (elements.songLyrics) {
        elements.songLyrics.value = elements.bandSongLyrics.value;
      }
    });
  }
  if (elements.songLyrics) {
    elements.songLyrics.addEventListener("input", () => {
      if (elements.bandSongLyrics) {
        elements.bandSongLyrics.value = elements.songLyrics.value;
      }
    });
  }

  bindEffect(elements.reverbMix, (value) => { state.nodes.reverb.wet.rampTo(value, 0.08); });
  bindEffect(elements.delayMix, (value) => { state.nodes.delay.wet.rampTo(value, 0.08); });
  bindEffect(elements.delayFeedback, (value) => { state.nodes.delay.feedback.rampTo(value, 0.08); });
  bindEffect(elements.chorusMix, (value) => { state.nodes.chorus.wet.rampTo(value, 0.08); });
  bindEffect(elements.distortionMix, (value) => { state.nodes.distortion.wet.rampTo(value, 0.08); });
  bindEffect(elements.bitcrushMix, (value) => { state.nodes.bitcrusher.wet.rampTo(value, 0.08); });
  bindEffect(elements.filterFreq, (value) => { state.nodes.filter.frequency.rampTo(value, 0.08); });
  bindEffect(elements.swingMix, (value) => { Tone.Transport.swing = value; });

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
}

function bindEffect(input, apply) {
  input.addEventListener("input", () => {
    updateControlLabels();
    if (state.ready) {
      apply(Number(input.value));
    }
  });
}

/* ---------- Audio graph ---------- */
async function startAudio() {
  if (!window.Tone) {
    elements.statusText.textContent = "Tone.js unavailable";
    return false;
  }
  if (state.ready) {
    return true;
  }

  elements.statusText.textContent = "Starting";
  await Tone.start();
  buildAudioGraph();
  // Fade the master up from silence so the engine starts without an audible click/pop.
  if (state.nodes.master) {
    state.nodes.master.volume.rampTo(Number(elements.masterVolume.value), 0.35, Tone.now() + 0.03);
  }
  Tone.Transport.bpm.value = Number(elements.tempo.value);
  Tone.Transport.swing = Number(elements.swingMix.value);
  Tone.Transport.swingSubdivision = "16n";
  state.ready = true;

  document.body.classList.add("audio-ready");
  elements.audioStart.disabled = true;
  [elements.playStop, elements.panic, elements.recordToggle, elements.metronomeToggle, elements.clearLoop]
    .forEach((button) => { button.disabled = false; });

  Object.keys(state.pendingSampleBuffers).forEach((id) => {
    const buffer = state.pendingSampleBuffers[id];
    delete state.pendingSampleBuffers[id];
    try {
      buildSampleSampler(id, buffer, { autoRename: false, select: false });
    } catch (error) {
      console.warn("Sample restore failed", error);
    }
  });

  preloadInstruments();
  updateLoadingStatus();
  refreshIcons();
  return true;
}

function buildAudioGraph() {
  const nodes = state.nodes;
  nodes.master = new Tone.Volume(-60); // start silent; startAudio ramps up to avoid a startup pop
  nodes.limiter = new Tone.Limiter(-1);
  nodes.meter = new Tone.Meter({ channelCount: 2, normalRange: true });
  nodes.analyser = new Tone.Analyser("waveform", 512);

  nodes.filter = new Tone.Filter({ type: "lowpass", frequency: Number(elements.filterFreq.value), rolloff: -24 });
  nodes.distortion = new Tone.Distortion({ distortion: 0.4, wet: Number(elements.distortionMix.value) });
  nodes.chorus = new Tone.Chorus({ frequency: 2.4, delayTime: 3.2, depth: 0.6, wet: Number(elements.chorusMix.value) }).start();
  nodes.bitcrusher = new Tone.BitCrusher({ bits: 5, wet: Number(elements.bitcrushMix.value) });
  nodes.delay = new Tone.FeedbackDelay({ delayTime: "8n", feedback: Number(elements.delayFeedback.value), wet: Number(elements.delayMix.value) });
  nodes.reverb = new Tone.Reverb({ decay: 3.4, preDelay: 0.01, wet: Number(elements.reverbMix.value) });

  nodes.filter.chain(nodes.distortion, nodes.chorus, nodes.bitcrusher, nodes.delay, nodes.reverb, nodes.master);
  nodes.master.connect(nodes.limiter);
  nodes.limiter.toDestination();
  nodes.master.connect(nodes.meter);
  nodes.master.connect(nodes.analyser);

  nodes.metronome = new Tone.MembraneSynth({ pitchDecay: 0.008, octaves: 4, envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.02 } });
  nodes.metronome.volume.value = -8;
  nodes.metronome.connect(nodes.master);

  // Pre-create a mixer channel per band instrument (samples attach lazily).
  instrumentDefs.forEach((definition) => {
    if (definition.vocal) {
      return;
    }
    const channel = new Tone.Channel({ volume: definition.id === "bass" ? -3 : -6 }).connect(nodes.filter);
    state.channels[definition.id] = channel;
  });
  applyMixerSettings();
}

/* ---------- Lazy sampled-instrument loader ---------- */
function ensureInstrument(instrumentId) {
  if (!state.ready) {
    return null;
  }
  if (state.instruments[instrumentId]) {
    return state.instruments[instrumentId];
  }

  const def = getInstrumentDef(instrumentId);
  if (def.vocal) {
    const stub = { def, kind: "vocal", loaded: true, useFallback: false, sampler: null, players: null, fallback: null };
    state.instruments[instrumentId] = stub;
    return stub;
  }
  if (def.recorded) {
    const stub = { def, kind: "recorded", loaded: false, useFallback: false, sampler: null, players: null, fallback: null };
    state.instruments[instrumentId] = stub;
    return stub;
  }
  const channel = state.channels[instrumentId];
  const entry = { def, kind: def.sample.kind, loaded: false, useFallback: false, sampler: null, players: null, fallback: null };
  state.instruments[instrumentId] = entry;

  markLoading(1);
  let settled = false;
  const done = () => {
    if (settled) { return; }
    settled = true;
    entry.loaded = true;
    markLoading(-1);
  };
  const fail = () => {
    if (settled) { return; }
    settled = true;
    entry.useFallback = true;
    entry.fallback = def.sample.kind === "drum" ? createDrumFallback(channel) : def.fallback().connect(channel);
    markLoading(-1);
  };

  try {
    if (def.sample.kind === "drum") {
      entry.players = new Tone.Players({ urls: def.sample.urls, baseUrl: def.sample.baseUrl, onload: done, onerror: fail }).connect(channel);
    } else {
      entry.sampler = new Tone.Sampler({ urls: def.sample.urls, baseUrl: def.sample.baseUrl, release: 1, onload: done, onerror: fail }).connect(channel);
    }
  } catch (error) {
    fail();
  }

  window.setTimeout(() => { if (!settled && !entry.loaded) { fail(); } }, 15000);
  return entry;
}

function preloadInstruments() {
  const ids = new Set([state.selectedInstrument]);
  state.seqTracks.forEach((track) => ids.add(track.instrumentId));
  ids.forEach((id) => ensureInstrument(id));
}

function createDrumFallback(channel) {
  const kick = new Tone.MembraneSynth({ pitchDecay: 0.035, octaves: 8, envelope: { attack: 0.001, decay: 0.42, sustain: 0.02, release: 0.18 } }).connect(channel);
  const snare = new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.17, sustain: 0, release: 0.08 } }).connect(channel);
  const hatFilter = new Tone.Filter({ type: "highpass", frequency: 8000 }).connect(channel);
  const hat = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 } }).connect(hatFilter);
  const tom = new Tone.MembraneSynth({ pitchDecay: 0.06, octaves: 4, envelope: { attack: 0.001, decay: 0.28, sustain: 0.03, release: 0.16 } }).connect(channel);
  return (piece, time, velocity) => {
    if (piece === "kick") {
      kick.triggerAttackRelease("C1", "8n", time, velocity);
    } else if (piece === "snare") {
      snare.triggerAttackRelease("16n", time, velocity);
    } else if (piece === "hihat") {
      hat.triggerAttackRelease("16n", time, velocity);
    } else {
      const pitch = piece === "tom3" ? "G1" : piece === "tom2" ? "A1" : "C2";
      tom.triggerAttackRelease(pitch, "8n", time, velocity);
    }
  };
}

function markLoading(delta) {
  state.loadingCount = Math.max(0, state.loadingCount + delta);
  updateLoadingStatus();
}

function updateLoadingStatus() {
  const loading = state.loadingCount > 0;
  document.body.classList.toggle("is-loading", loading);
  if (loading) {
    elements.statusText.textContent = `Loading samples… (${state.loadingCount})`;
  } else if (state.ready) {
    elements.statusText.textContent = state.isRecording ? "Recording" : (state.isPlaying ? "Playing" : "Ready");
  }
}

/* ---------- Instrument rack ---------- */
function renderInstrumentRack() {
  elements.instrumentGrid.innerHTML = "";
  instrumentDefs.forEach((definition) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "instrument-card";
    button.dataset.instrument = definition.id;
    button.style.setProperty("--instrument-color", definition.color);
    button.innerHTML = `<span class="instrument-name">${definition.name}</span><span class="instrument-role">${definition.role}</span>`;
    button.addEventListener("click", () => onInstrumentCardClick(definition.id));
    if (definition.recorded) {
      const rename = document.createElement("span");
      rename.className = "card-rename";
      rename.setAttribute("role", "button");
      rename.setAttribute("tabindex", "0");
      rename.setAttribute("aria-label", `Rename ${definition.name}`);
      rename.title = "Rename sample";
      rename.innerHTML = `<i data-lucide="pencil"></i>`;
      rename.addEventListener("click", (event) => {
        event.stopPropagation();
        renameSample(definition.id);
      });
      rename.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          renameSample(definition.id);
        }
      });
      button.append(rename);
    }
    if (definition.recorded && (state.sampleSamplers[definition.id] || state.pendingSampleBuffers[definition.id] || definition.sampleKey)) {
      const del = document.createElement("span");
      del.className = "card-delete";
      del.setAttribute("role", "button");
      del.setAttribute("tabindex", "0");
      del.setAttribute("aria-label", `Delete ${definition.name}`);
      del.title = "Delete sample";
      del.innerHTML = `<i data-lucide="trash-2"></i>`;
      del.addEventListener("click", (event) => {
        event.stopPropagation();
        deleteSample(definition.id);
      });
      del.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          deleteSample(definition.id);
        }
      });
      button.append(del);
    }
    elements.instrumentGrid.append(button);
  });
  updateInstrumentSelection();
}

function selectInstrument(instrumentId) {
  stopSustainedNote();
  state.selectedInstrument = instrumentId;
  ensureInstrument(instrumentId);
  updateInstrumentSelection();
  renderPads();
  renderPiano();
}

function onInstrumentCardClick(instrumentId) {
  selectInstrument(instrumentId);
  previewInstrumentSequence(instrumentId);
}

// Play a short musical phrase on the tapped instrument so you can hear it right away.
async function previewInstrumentSequence(instrumentId) {
  const def = getInstrumentDef(instrumentId);
  const ready = await startAudio();
  if (!ready) {
    return;
  }
  ensureInstrument(instrumentId);
  if (def.recorded) {
    previewSample();
    return;
  }
  if (def.vocal) {
    speakLine(pick(BIG_LYRICS), 1);
    return;
  }
  const bpm = Number(elements.tempo.value) || 120;
  const stepDur = (60 / bpm) / 2;
  if (instrumentId === "drums") {
    const now = Tone.now() + 0.08;
    const hits = [[0, "kick"], [1, "hihat"], [2, "snare"], [3, "hihat"], [4, "kick"], [5, "hihat"], [6, "snare"], [7, "hihat"]];
    hits.forEach(([pos, piece]) => playDrum(piece, now + pos * stepDur * 0.5, 0.85));
    return;
  }
  // Wait for the instrument's samples so the very first preview is audible.
  try {
    await Tone.loaded();
  } catch (error) {
    /* ignore */
  }
  const bassy = instrumentId === "bass" || instrumentId === "cello";
  const root = bassy ? "C2" : "C4";
  const scale = musicalScale(root, "major");
  const phrase = bassy ? [0, 3, 4, 3, 0, 4] : [0, 2, 4, 7, 6, 4, 2, 0];
  const now = Tone.now() + 0.08;
  phrase.forEach((degree, i) => {
    const note = scale[degree % scale.length];
    playInstrument(instrumentId, note, def.duration || "8n", now + i * stepDur, 0.8);
  });
}

function updateInstrumentSelection() {
  const definition = getInstrumentDef(state.selectedInstrument);
  elements.selectedInstrument.textContent = definition.name;
  document.documentElement.style.setProperty("--instrument-color", definition.color);
  elements.instrumentGrid.querySelectorAll(".instrument-card").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.instrument === state.selectedInstrument);
  });
  if (elements.rackSongText) {
    elements.rackSongText.hidden = !definition.vocal;
  }
  if (elements.testSample) {
    elements.testSample.hidden = false;
  }
  const isRecorded = definition.recorded
    && (state.sampleSamplers[definition.id] || state.pendingSampleBuffers[definition.id] || definition.sampleKey);
  if (elements.sampleStretchWrap) {
    elements.sampleStretchWrap.hidden = !isRecorded;
  }
  if (elements.sampleStretch && isRecorded) {
    const stretch = state.sampleStretch[definition.id] || 1;
    elements.sampleStretch.value = String(stretch);
    if (elements.sampleStretchValue) {
      elements.sampleStretchValue.value = `${stretch.toFixed(2)}x`;
    }
  }
}

/* ---------- Presets ---------- */
function renderPresets() {
  elements.presetButtons.innerHTML = "";
  presets.forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-button";
    button.innerHTML = `<span class="preset-title">${preset.name}</span><span class="preset-genre">${preset.genre} · ${preset.tempo}</span>`;
    button.addEventListener("click", () => applyPreset(preset));
    elements.presetButtons.append(button);
  });
}

function applyPreset(preset) {
  state.seqTracks = preset.build();
  elements.tempo.value = String(preset.tempo);
  elements.swingMix.value = String(preset.swing);
  updateControlLabels();
  if (state.ready) {
    Tone.Transport.bpm.rampTo(preset.tempo, 0.1);
    Tone.Transport.swing = preset.swing;
    preloadInstruments();
  }
  renderSequencer();
}

/* ---------- Save / Load project ---------- */
// Effect sliders included in a saved project (id on the element -> project.fx key).
function projectFxInputs() {
  return {
    reverb: elements.reverbMix, delay: elements.delayMix, delayFeedback: elements.delayFeedback,
    chorus: elements.chorusMix, distortion: elements.distortionMix, filter: elements.filterFreq,
    bitcrush: elements.bitcrushMix, swing: elements.swingMix
  };
}

// Serialize the whole arrangement + settings to JSON (Sets in region phrases become {__set:[...]}).
function serializeProject() {
  const fx = {};
  const inputs = projectFxInputs();
  Object.keys(inputs).forEach((key) => { if (inputs[key]) { fx[key] = inputs[key].value; } });
  const project = {
    app: "MusicBand Studio Pro",
    version: 1,
    savedAt: new Date().toISOString(),
    bars: state.bars,
    tempo: elements.tempo.value,
    master: elements.masterVolume.value,
    octave: elements.octaveShift.value,
    scale: state.scale,
    selectedInstrument: state.selectedInstrument,
    soundType: elements.genSoundType ? elements.genSoundType.value : "sampled",
    musicStyle: elements.genMusicStyle ? elements.genMusicStyle.value : "pop",
    fx,
    tracks: state.seqTracks
  };
  return JSON.stringify(project, (key, value) => (value instanceof Set ? { __set: Array.from(value) } : value), 2);
}

function saveProject() {
  try {
    const json = serializeProject();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `musicband-project-${stamp}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    elements.statusText.textContent = "Project saved";
  } catch (error) {
    console.error(error);
    elements.statusText.textContent = "Save failed";
  }
}

function triggerLoadProject() {
  if (elements.projectFileInput) {
    elements.projectFileInput.value = "";
    elements.projectFileInput.click();
  }
}

function onProjectFileChosen(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const project = JSON.parse(String(reader.result), (key, value) => (
        value && typeof value === "object" && Array.isArray(value.__set) ? new Set(value.__set) : value
      ));
      applyProject(project);
    } catch (error) {
      console.error(error);
      elements.statusText.textContent = "Load failed — not a valid project file";
    }
  };
  reader.onerror = () => { elements.statusText.textContent = "Could not read the file"; };
  reader.readAsText(file);
}

// Restore a parsed project into the app (tracks + all settings).
function applyProject(project) {
  if (!project || !Array.isArray(project.tracks)) {
    elements.statusText.textContent = "Load failed — no tracks in file";
    return;
  }
  if (project.tempo != null) { elements.tempo.value = String(project.tempo); }
  if (project.master != null) { elements.masterVolume.value = String(project.master); }
  if (project.octave != null) { elements.octaveShift.value = String(project.octave); state.octaveOffset = Number(project.octave) || 0; }
  if (project.scale) { state.scale = project.scale; if (elements.scaleSelect) { elements.scaleSelect.value = project.scale; } }
  if (project.soundType && elements.genSoundType) { elements.genSoundType.value = project.soundType; }
  if (project.musicStyle && elements.genMusicStyle) { elements.genMusicStyle.value = project.musicStyle; }
  const inputs = projectFxInputs();
  const fx = project.fx || {};
  Object.keys(inputs).forEach((key) => { if (inputs[key] && fx[key] != null) { inputs[key].value = String(fx[key]); } });

  state.bars = Math.max(2, Math.min(MAX_BARS, Number(project.bars) || DEFAULT_BARS));
  state.seqTracks = Array.isArray(project.tracks) ? project.tracks : [];
  seqUid = state.seqTracks.reduce((max, track) => Math.max(max, Number(track.uid) || 0), 0) + 1;

  if (elements.genSoundTypeSeq && elements.genSoundType) { elements.genSoundTypeSeq.value = elements.genSoundType.value; }
  updateBarCount();
  updateControlLabels();
  if (state.ready) {
    Tone.Transport.bpm.rampTo(Number(elements.tempo.value), 0.1);
    Tone.Transport.swing = Number(elements.swingMix.value);
    if (state.nodes.master) { state.nodes.master.volume.rampTo(Number(elements.masterVolume.value), 0.1); }
    Object.values(inputs).forEach((input) => { if (input) { input.dispatchEvent(new Event("input")); } });
    disposeSoundTypeSynths();
    preloadInstruments();
  }
  const selId = project.selectedInstrument;
  selectInstrument(getInstrumentDef(selId) && instrumentDefs.some((d) => d.id === selId) ? selId : state.selectedInstrument);
  renderSequencer();
  renderMixer();
  elements.statusText.textContent = "Project loaded";
}

/* ---------- Pads ---------- */
function renderPads() {
  const definition = getInstrumentDef(state.selectedInstrument);
  elements.padGrid.innerHTML = "";
  if (definition.vocal) {
    renderVocalPads(definition);
    return;
  }
  definition.pads.forEach((pad, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "play-pad";
    button.dataset.padIndex = String(index);
    button.style.setProperty("--instrument-color", definition.color);
    button.innerHTML = `<span class="pad-note">${pad.label}</span><span class="pad-name">${pad.name}</span>`;
    button.addEventListener("click", async () => {
      const canPlay = await startAudio();
      if (!canPlay) {
        return;
      }
      triggerPad(definition, pad);
      flashPad(button);
    });
    elements.padGrid.append(button);
  });
}

function renderVocalPads(definition) {
  definition.pads.forEach((pad) => {
    if (pad.text === undefined) {
      pad.text = pad.name;
    }
    const cell = document.createElement("div");
    cell.className = "play-pad vocal-pad";
    cell.style.setProperty("--instrument-color", definition.color);
    const note = document.createElement("span");
    note.className = "pad-note";
    note.textContent = pad.label;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "pad-text";
    input.value = pad.text;
    input.placeholder = "Words to sing\u2026";
    input.setAttribute("aria-label", `Text for ${pad.label}`);
    input.addEventListener("input", () => { pad.text = input.value; });
    input.addEventListener("keydown", async (event) => {
      event.stopPropagation();
      if (event.key === "Enter") {
        event.preventDefault();
        const canPlay = await startAudio();
        if (canPlay) {
          speakLine(pad.text || pad.label, 1);
          flashPad(cell);
        }
      }
    });
    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = "pad-play";
    playBtn.innerHTML = `<i data-lucide="volume-2"></i><span>Sing</span>`;
    playBtn.addEventListener("click", async () => {
      const canPlay = await startAudio();
      if (!canPlay) {
        return;
      }
      speakLine(pad.text || pad.label, 1);
      flashPad(cell);
    });
    cell.append(note, input, playBtn);
    elements.padGrid.append(cell);
  });
  refreshIcons();
}

function triggerPad(definition, pad) {
  if (definition.vocal) {
    speakLine(pad.text || pad.name || pad.label, 1);
    return;
  }
  if (definition.sample && definition.sample.kind === "drum") {
    playDrum(pad.drum, undefined, 0.92);
    recordEvent({ kind: "drum", drum: pad.drum });
    return;
  }
  const notes = pad.notes.map(applyOctave);
  playInstrument(definition.id, notes, definition.duration, undefined, 0.78);
  recordEvent({ kind: "instrument", instrument: definition.id, notes, duration: definition.duration });
}

/* ---------- Piano keyboard ---------- */
function renderPiano() {
  const definition = getInstrumentDef(state.selectedInstrument);
  elements.piano.innerHTML = "";
  elements.piano.style.setProperty("--instrument-color", definition.color);

  const whiteKeyByMidi = new Map();
  let whiteIndex = -1;
  KEY_MAP.forEach((entry) => {
    const midi = midiFromNote(entry.note);
    const isBlack = NOTE_NAMES[midi % 12].includes("#");
    if (!isBlack) {
      whiteIndex += 1;
      whiteKeyByMidi.set(midi, whiteIndex);
    }
  });
  const totalWhite = whiteIndex + 1;

  KEY_MAP.forEach((entry) => {
    const midi = midiFromNote(entry.note);
    const isBlack = NOTE_NAMES[midi % 12].includes("#");
    const key = document.createElement("div");
    key.className = `key ${isBlack ? "black" : "white"}`;
    key.dataset.note = entry.note;
    key.innerHTML = `<span class="key-hint">${entry.key.toUpperCase()}</span>`;

    if (isBlack) {
      const leftWhite = whiteKeyByMidi.get(midi - 1);
      const position = ((leftWhite + 1) / totalWhite) * 100;
      key.style.left = `${position}%`;
    }

    const pressHandler = async (event) => {
      event.preventDefault();
      const canPlay = await startAudio();
      if (!canPlay) {
        return;
      }
      pressPianoKey(entry.note);
    };
    key.addEventListener("pointerdown", pressHandler);
    key.addEventListener("pointerup", () => releasePianoKey(entry.note));
    key.addEventListener("pointerleave", () => releasePianoKey(entry.note));
    key.addEventListener("pointercancel", () => releasePianoKey(entry.note));
    elements.piano.append(key);
  });

  updatePianoScale();
}

function updatePianoScale() {
  elements.piano.querySelectorAll(".key").forEach((key) => {
    const inScale = isNoteInScale(key.dataset.note);
    key.style.opacity = inScale ? "1" : "0.45";
  });
}

function pressPianoKey(note) {
  if (state.activeKeyNotes.has(note)) {
    return;
  }
  // Playing the piano stops any looping sample preview.
  if (state.previewPlayer) {
    stopSample();
  }
  const definition = getInstrumentDef(state.selectedInstrument);
  const shifted = applyOctave(note);
  state.activeKeyNotes.set(note, shifted);
  const keyElement = elements.piano.querySelector(`.key[data-note="${note}"]`);
  if (keyElement) {
    keyElement.classList.add("is-down");
  }
  if (definition.vocal) {
    speakLine("La", 1);
    return;
  }
  // Sustain: stop the previous note, then hold this one until another key or Stop Playing.
  stopSustainedNote();
  const voice = getInstrumentVoice(definition.id);
  if (voice && typeof voice.triggerAttack === "function") {
    try {
      voice.triggerAttack(shifted, Tone.now(), 0.8);
      state.sustain = { voice, note: shifted, keyNote: note };
    } catch (error) {
      playInstrument(definition.id, [shifted], definition.duration, undefined, 0.8);
    }
  } else {
    playInstrument(definition.id, [shifted], definition.duration, undefined, 0.8);
  }
  updateStopPlayingButton();
  recordEvent({ kind: "instrument", instrument: definition.id, notes: [shifted], duration: definition.duration });
}

function releasePianoKey(note) {
  if (!state.activeKeyNotes.has(note)) {
    return;
  }
  state.activeKeyNotes.delete(note);
  // The sustaining key stays lit until another key is pressed or Stop Playing is clicked.
  if (state.sustain && state.sustain.keyNote === note) {
    return;
  }
  const keyElement = elements.piano.querySelector(`.key[data-note="${note}"]`);
  if (keyElement) {
    keyElement.classList.remove("is-down");
  }
}

// Release the currently held (sustained) note.
function stopSustainedNote() {
  if (state.sustain) {
    const { voice, note, keyNote } = state.sustain;
    try {
      voice.triggerRelease(note, Tone.now());
    } catch (error) {
      try { voice.releaseAll(); } catch (releaseError) { /* ignore */ }
    }
    if (keyNote) {
      const keyElement = elements.piano.querySelector(`.key[data-note="${keyNote}"]`);
      if (keyElement) {
        keyElement.classList.remove("is-down");
      }
    }
    state.sustain = null;
  }
  updateStopPlayingButton();
}

// Stop Playing button beneath the piano: stop the held note (and any speech).
function stopAllPlaying() {
  stopSustainedNote();
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  elements.statusText.textContent = "Stopped";
}

function updateStopPlayingButton() {
  if (elements.stopPlaying) {
    elements.stopPlaying.disabled = !state.sustain;
  }
}

/* ---------- Computer keyboard ---------- */
function handleKeyDown(event) {
  if (event.repeat || event.target.matches("input, button, select")) {
    return;
  }
  const mapping = KEY_MAP.find((entry) => entry.key === event.key.toLowerCase());
  if (mapping) {
    event.preventDefault();
    startAudio().then((ok) => {
      if (ok) {
        pressPianoKey(mapping.note);
      }
    });
  }
}

function handleKeyUp(event) {
  const mapping = KEY_MAP.find((entry) => entry.key === event.key.toLowerCase());
  if (mapping) {
    releasePianoKey(mapping.note);
  }
}

/* ---------- Record your own sample (microphone) ---------- */
function updateSampleButton() {
  if (!elements.recordSampleToggle) {
    return;
  }
  elements.recordSampleToggle.setAttribute("aria-pressed", String(state.sampleRecording));
  elements.recordSampleToggle.innerHTML = state.sampleRecording
    ? `<i data-lucide="square"></i><span>Stop Sample</span>`
    : `<i data-lucide="audio-lines"></i><span>Rec Sample</span>`;
  refreshIcons();
}

async function toggleSampleRecording() {
  if (state.sampleRecording) {
    stopSampleRecording();
    return;
  }
  const ready = await startAudio();
  if (!ready) {
    return;
  }
  // Sample the app's OWN output (no microphone). Tone's context is a standardized-audio-context
  // wrapper with no createScriptProcessor, and decodeAudioData can't read MediaRecorder's webm,
  // so we tap master into a MediaStream and capture raw PCM through a native AudioContext.
  let streamDest;
  try {
    streamDest = Tone.getContext().createMediaStreamDestination();
    state.nodes.master.connect(streamDest);
  } catch (error) {
    elements.statusText.textContent = "Sampling not supported";
    return;
  }
  let ctx = state.captureContext;
  if (!ctx) {
    try {
      // No forced sampleRate: matching it to Tone's reported rate can silence the capture.
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      try { state.nodes.master.disconnect(streamDest); } catch (e) { /* ignore */ }
      elements.statusText.textContent = "Sampling not supported";
      return;
    }
    state.captureContext = ctx;
  }
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch (error) { /* ignore */ }
  }
  let source;
  let processor;
  let silent;
  try {
    source = ctx.createMediaStreamSource(streamDest.stream);
    processor = ctx.createScriptProcessor(4096, 1, 1);
    silent = ctx.createGain();
    silent.gain.value = 0;
  } catch (error) {
    try { state.nodes.master.disconnect(streamDest); } catch (e) { /* ignore */ }
    elements.statusText.textContent = "Sampling not supported";
    return;
  }
  state.sampleChunks = [];
  processor.onaudioprocess = (event) => {
    state.sampleChunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  };
  source.connect(processor);
  processor.connect(silent);
  silent.connect(ctx.destination);
  state.sampleTapDest = streamDest;
  state.sampleNodes = { ctx, source, processor, silent };
  state.sampleRecording = true;
  updateSampleButton();
  elements.statusText.textContent = "Sampling the sound\u2026 play a pad or run the loop!";
  state.sampleTimeout = window.setTimeout(() => {
    if (state.sampleRecording) {
      stopSampleRecording();
    }
  }, 12000);
}

function stopSampleRecording() {
  window.clearTimeout(state.sampleTimeout);
  if (!state.sampleRecording) {
    return;
  }
  state.sampleRecording = false;
  updateSampleButton();
  if (state.sampleTapDest) {
    try { state.nodes.master.disconnect(state.sampleTapDest); } catch (error) { /* ignore */ }
    state.sampleTapDest = null;
  }
  const nodes = state.sampleNodes;
  state.sampleNodes = null;
  if (!nodes) {
    elements.statusText.textContent = "No sample captured";
    return;
  }
  try {
    nodes.processor.disconnect();
    nodes.source.disconnect();
    nodes.silent.disconnect();
  } catch (error) {
    /* ignore */
  }
  nodes.processor.onaudioprocess = null;
  const chunks = state.sampleChunks || [];
  state.sampleChunks = [];
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (!totalLength) {
    elements.statusText.textContent = "No sample captured \u2014 play something while sampling";
    return;
  }
  const audioBuffer = nodes.ctx.createBuffer(1, totalLength, nodes.ctx.sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  let offset = 0;
  chunks.forEach((chunk) => {
    channelData.set(chunk, offset);
    offset += chunk.length;
  });
  const trimmed = trimSampleSilence(audioBuffer, nodes.ctx);
  addSampleBuffer(trimmed, null, { autoRename: true });
}

function updateMicButton() {
  if (!elements.recordMic) {
    return;
  }
  elements.recordMic.setAttribute("aria-pressed", String(state.micRecording));
  elements.recordMic.innerHTML = state.micRecording
    ? `<i data-lucide="square"></i><span>Stop Mic</span>`
    : `<i data-lucide="mic"></i><span>Record MIC</span>`;
  refreshIcons();
}

// Record from the microphone into a new sample (raw PCM via a native AudioContext).
async function toggleMicRecording() {
  if (state.micRecording) {
    stopMicRecording();
    return;
  }
  const ready = await startAudio();
  if (!ready) {
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    elements.statusText.textContent = "Microphone not supported here";
    return;
  }
  let micStream;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (error) {
    elements.statusText.textContent = "Microphone access blocked";
    return;
  }
  let ctx = state.captureContext;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      micStream.getTracks().forEach((track) => track.stop());
      elements.statusText.textContent = "Microphone not supported here";
      return;
    }
    state.captureContext = ctx;
  }
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch (error) { /* ignore */ }
  }
  let source;
  let processor;
  let silent;
  try {
    source = ctx.createMediaStreamSource(micStream);
    processor = ctx.createScriptProcessor(4096, 1, 1);
    silent = ctx.createGain();
    silent.gain.value = 0;
  } catch (error) {
    micStream.getTracks().forEach((track) => track.stop());
    elements.statusText.textContent = "Microphone not supported here";
    return;
  }
  state.micChunks = [];
  processor.onaudioprocess = (event) => {
    state.micChunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  };
  source.connect(processor);
  processor.connect(silent);
  silent.connect(ctx.destination);
  state.micNodes = { ctx, source, processor, silent, micStream };
  state.micRecording = true;
  updateMicButton();
  elements.statusText.textContent = "Recording from mic\u2026 sing or play!";
  state.micTimeout = window.setTimeout(() => {
    if (state.micRecording) {
      stopMicRecording();
    }
  }, 20000);
}

function stopMicRecording() {
  window.clearTimeout(state.micTimeout);
  if (!state.micRecording) {
    return;
  }
  state.micRecording = false;
  updateMicButton();
  const nodes = state.micNodes;
  state.micNodes = null;
  if (!nodes) {
    elements.statusText.textContent = "No mic audio captured";
    return;
  }
  try {
    nodes.processor.disconnect();
    nodes.source.disconnect();
    nodes.silent.disconnect();
  } catch (error) {
    /* ignore */
  }
  nodes.processor.onaudioprocess = null;
  try {
    nodes.micStream.getTracks().forEach((track) => track.stop());
  } catch (error) {
    /* ignore */
  }
  const chunks = state.micChunks || [];
  state.micChunks = [];
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (!totalLength) {
    elements.statusText.textContent = "No mic audio captured \u2014 check your microphone";
    return;
  }
  const audioBuffer = nodes.ctx.createBuffer(1, totalLength, nodes.ctx.sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  let offset = 0;
  chunks.forEach((chunk) => {
    channelData.set(chunk, offset);
    offset += chunk.length;
  });
  const trimmed = trimSampleSilence(audioBuffer, nodes.ctx);
  addSampleBuffer(trimmed, null, { autoRename: true });
}

// Trim leading / trailing near-silence so a recorded one-shot starts right on the sound.
function trimSampleSilence(audioBuffer, ctx) {
  try {
    const channels = audioBuffer.numberOfChannels;
    const data = audioBuffer.getChannelData(0);
    const threshold = 0.004;
    let start = 0;
    let end = data.length - 1;
    while (start < end && Math.abs(data[start]) < threshold) {
      start += 1;
    }
    while (end > start && Math.abs(data[end]) < threshold) {
      end -= 1;
    }
    start = Math.max(0, start - 256);
    end = Math.min(data.length - 1, end + 1024);
    const length = end - start + 1;
    if (length < 512 || length >= data.length) {
      return audioBuffer;
    }
    const trimmed = ctx.createBuffer(channels, length, audioBuffer.sampleRate);
    for (let channel = 0; channel < channels; channel += 1) {
      trimmed.getChannelData(channel).set(audioBuffer.getChannelData(channel).subarray(start, end + 1));
    }
    return trimmed;
  } catch (error) {
    return audioBuffer;
  }
}

// Preview / test the currently selected recorded sample.
async function previewSample() {
  let id = state.selectedInstrument;
  let def = getInstrumentDef(id);
  const hasContent = (sid) => sid && (state.sampleSamplers[sid] || state.sampleBuffers[sid] || state.pendingSampleBuffers[sid]);
  if (!def || !def.recorded || !hasContent(id)) {
    id = lastRecordedSampleId();
    def = id ? getInstrumentDef(id) : null;
  }
  if (!def) {
    elements.statusText.textContent = "No recorded sample yet \u2014 use Rec Sample first";
    return;
  }
  const ready = await startAudio();
  if (!ready) {
    return;
  }
  if (!state.sampleSamplers[id] && state.pendingSampleBuffers[id]) {
    const buffer = state.pendingSampleBuffers[id];
    delete state.pendingSampleBuffers[id];
    try {
      buildSampleSampler(id, buffer, { autoRename: false, select: false });
    } catch (error) {
      /* ignore */
    }
  }
  if (state.sampleBuffers[id] || state.sampleSamplers[id]) {
    // Loop the clip and keep playing until Stop Sample is pressed.
    startSamplePreview(id, def);
  } else {
    elements.statusText.textContent = "No sample to play yet \u2014 record or generate one";
  }
}

// Play Sample is a toggle: start playback, or stop it if it is already playing.
function toggleSamplePreview() {
  if (state.previewPlayer) {
    stopSample();
    elements.statusText.textContent = "Sample stopped";
  } else {
    previewSample();
  }
}

// Loop a sample and keep it playing until Stop Sample is pressed.
function startSamplePreview(id, def) {
  stopSample();
  state.previewSamplerId = id;
  state.previewPlayer = playSampleRegion(id, Tone.now() + 0.03, 1, true);
  updateTestSampleButton();
  if (state.previewPlayer || state.sampleSamplers[id]) {
    elements.statusText.textContent = `Playing ${def ? def.name : "sample"} \u2014 press Stop Sample to end`;
  }
}

// Stop the sample preview started by Play Sample.
function stopSample() {
  window.clearTimeout(state.previewResetTimer);
  if (state.previewPlayer) {
    try { state.previewPlayer.stop(); } catch (error) { /* ignore */ }
    try { state.previewPlayer.dispose(); } catch (error) { /* ignore */ }
    state.previewPlayer = null;
  }
  if (state.previewSamplerId && state.sampleSamplers[state.previewSamplerId]) {
    try { state.sampleSamplers[state.previewSamplerId].releaseAll(); } catch (error) { /* ignore */ }
  }
  state.previewSamplerId = null;
  updateTestSampleButton();
}

function updateTestSampleButton() {
  if (!elements.testSample) {
    return;
  }
  const playing = !!state.previewPlayer;
  elements.testSample.setAttribute("aria-pressed", String(playing));
  elements.testSample.innerHTML = playing
    ? `<i data-lucide="square"></i><span>Stop Sample</span>`
    : `<i data-lucide="play"></i><span>Play Sample</span>`;
  refreshIcons();
}

// Export the selected (or most recent) recorded sample to WAV or MP3 via the download modal.
function exportSelectedSample() {
  let id = state.selectedInstrument;
  let def = getInstrumentDef(id);
  const hasContent = (sid) => sid && (state.sampleBuffers[sid] || state.sampleSamplers[sid] || state.pendingSampleBuffers[sid]);
  if (!def || !def.recorded || !hasContent(id)) {
    id = lastRecordedSampleId();
    def = id ? getInstrumentDef(id) : null;
  }
  if (!def || !hasContent(id)) {
    elements.statusText.textContent = "No recorded sample to export \u2014 record or generate one first";
    return;
  }
  if (!state.sampleBuffers[id] && state.pendingSampleBuffers[id]) {
    try {
      buildSampleSampler(id, state.pendingSampleBuffers[id], { autoRename: false, select: false });
      delete state.pendingSampleBuffers[id];
    } catch (error) { /* ignore */ }
  }
  const toneBuffer = state.sampleBuffers[id];
  const audioBuffer = toneBuffer && typeof toneBuffer.get === "function" ? toneBuffer.get() : toneBuffer;
  if (!audioBuffer) {
    elements.statusText.textContent = "Sample not ready to export yet";
    return;
  }
  openSampleDownloadModal(audioBuffer, def.name || "sample");
}

function openSampleDownloadModal(audioBuffer, name) {
  if (!elements.downloadModal) {
    return;
  }
  state.recordingBuffer = audioBuffer;
  state.downloadBaseName = sanitizeFileName(name);
  if (elements.downloadTitle) {
    elements.downloadTitle.textContent = "Export Sample";
  }
  const seconds = Math.round((audioBuffer.duration || 0) * 10) / 10;
  elements.downloadStatus.textContent = `Ready \u2014 ${name} (${seconds}s). Choose a format.`;
  elements.downloadModal.hidden = false;
  elements.downloadWav.disabled = false;
  elements.downloadMp3.disabled = !window.lamejs;
  if (!window.lamejs) {
    elements.downloadMp3.title = "MP3 encoder not available";
  }
  refreshIcons();
}

function sanitizeFileName(name) {
  const clean = String(name || "sample").replace(/[^a-z0-9\-_]+/gi, "-").replace(/^-+|-+$/g, "");
  return clean || "sample";
}

function sampleSlotIds() {
  return instrumentDefs.filter((definition) => definition.recorded).map((definition) => definition.id);
}

function nextSampleSlot() {
  for (const id of sampleSlotIds()) {
    if (!state.sampleSamplers[id] && !state.pendingSampleBuffers[id]) {
      return id;
    }
  }
  return createSampleSlot();
}

function createSampleSlot() {
  state.sampleSlotCount += 1;
  const id = `sample${state.sampleSlotCount}`;
  const colors = ["#76f7bf", "#ff9f5a", "#9e8cff", "#f8a7ff", "#d4f75f", "#ff6f87", "#8ee6ff"];
  const definition = {
    id,
    name: `Sample ${state.sampleSlotCount}`,
    short: `Smpl ${state.sampleSlotCount}`,
    role: "Recorded",
    color: colors[(state.sampleSlotCount - 2) % colors.length],
    duration: "2n",
    recorded: true,
    pads: notesToPads(["C3", "D3", "E3", "G3", "A3", "C4", "D4", "E4"])
  };
  instrumentDefs.push(definition);
  addOptions.push({ value: id, label: `${definition.name} (Recorded)` });
  if (state.ready && !state.channels[id]) {
    state.channels[id] = new Tone.Channel({ volume: -4 }).connect(state.nodes.filter);
  }
  renderInstrumentRack();
  renderMixer();
  populateBuilder();
  refreshIcons();
  return id;
}

function buildSampleSampler(id, audioBuffer, options = {}) {
  const { autoRename = false, select = true } = options;
  if (!state.channels[id]) {
    state.channels[id] = new Tone.Channel({ volume: -4 }).connect(state.nodes.filter);
  }
  if (state.sampleSamplers[id]) {
    try {
      state.sampleSamplers[id].dispose();
    } catch (error) {
      /* ignore */
    }
  }
  const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);
  state.sampleSamplers[id] = new Tone.Sampler({ C4: toneBuffer }).connect(state.channels[id]);
  state.sampleBuffers[id] = toneBuffer;
  state.sampleDurations[id] = toneBuffer.duration || (audioBuffer && audioBuffer.duration) || 0;
  if (state.sampleStretch[id] === undefined) {
    state.sampleStretch[id] = 1;
  }
  if (state.regionPlayers[id]) {
    try { state.regionPlayers[id].dispose(); } catch (error) { /* ignore */ }
    delete state.regionPlayers[id];
  }
  if (select) {
    selectInstrument(id);
  }
  applyMixerSettings();
  const definition = getInstrumentDef(id);
  elements.statusText.textContent = `${definition.name} ready \u2014 play it!`;
  if (autoRename) {
    renameSample(id, true);
  }
}

function renameSample(id, isNew) {
  const definition = getInstrumentDef(id);
  if (!definition || !definition.recorded || !elements.renameModal) {
    return;
  }
  state.renameTarget = id;
  if (elements.renameTitle) {
    elements.renameTitle.textContent = isNew ? "Name Your Sample" : "Rename Sample";
  }
  if (elements.renameInput) {
    elements.renameInput.value = definition.name;
  }
  elements.renameModal.hidden = false;
  refreshIcons();
  if (elements.renameInput) {
    window.setTimeout(() => {
      elements.renameInput.focus();
      elements.renameInput.select();
    }, 30);
  }
}

function closeRenameModal() {
  if (elements.renameModal) {
    elements.renameModal.hidden = true;
  }
  state.renameTarget = null;
}

function commitRename() {
  const id = state.renameTarget;
  const definition = id ? getInstrumentDef(id) : null;
  if (!definition || !definition.recorded) {
    closeRenameModal();
    return;
  }
  const clean = (elements.renameInput ? elements.renameInput.value : "").trim().slice(0, 24);
  if (!clean) {
    if (elements.renameInput) {
      elements.renameInput.focus();
    }
    return;
  }
  definition.name = clean;
  definition.short = clean.length > 9 ? clean.slice(0, 9) : clean;
  const option = addOptions.find((entry) => entry.value === id);
  if (option) {
    option.label = `${clean} (Recorded)`;
  }
  renderInstrumentRack();
  renderMixer();
  populateBuilder();
  updateInstrumentSelection();
  refreshIcons();
  if (definition.sampleKey) {
    updateSampleName(definition.sampleKey, clean);
  }
  elements.statusText.textContent = `Sample renamed to \u201c${clean}\u201d`;
  closeRenameModal();
}

function deleteSample(id) {
  const definition = getInstrumentDef(id);
  if (!definition || !definition.recorded) {
    return;
  }
  if (state.sampleSamplers[id]) {
    try {
      state.sampleSamplers[id].dispose();
    } catch (error) {
      /* ignore */
    }
    delete state.sampleSamplers[id];
  }
  if (state.regionPlayers[id]) {
    try { state.regionPlayers[id].dispose(); } catch (error) { /* ignore */ }
    delete state.regionPlayers[id];
  }
  delete state.sampleBuffers[id];
  delete state.sampleDurations[id];
  delete state.sampleStretch[id];
  delete state.pendingSampleBuffers[id];
  if (state.channels[id]) {
    try {
      state.channels[id].dispose();
    } catch (error) {
      /* ignore */
    }
    delete state.channels[id];
  }
  delete state.channelSettings[id];
  state.soloed.delete(id);
  const defIndex = instrumentDefs.findIndex((entry) => entry.id === id);
  if (defIndex >= 0) {
    instrumentDefs.splice(defIndex, 1);
  }
  const optIndex = addOptions.findIndex((entry) => entry.value === id);
  if (optIndex >= 0) {
    addOptions.splice(optIndex, 1);
  }
  state.seqTracks = state.seqTracks.filter((track) => track.instrumentId !== id);
  if (definition.sampleKey) {
    deleteSampleFromDb(definition.sampleKey).catch(() => { /* ignore */ });
  }
  if (state.selectedInstrument === id) {
    selectInstrument("piano");
  }
  renderInstrumentRack();
  renderMixer();
  populateBuilder();
  renderSequencer();
  applyMixerSettings();
  refreshIcons();
  elements.statusText.textContent = `Deleted ${definition.name}`;
}

function deleteSampleFromDb(key) {
  return openSampleDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction("samples", "readwrite");
    tx.objectStore("samples").delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

/* ---------- Sample studio: WAV uploads + musical part generation ---------- */
function normalizeNoteName(note) {
  if (typeof note !== "string" || !note) {
    return "C4";
  }
  return note.charAt(0).toUpperCase() + note.slice(1);
}

// In-key note pool (two octaves) from Scribbletune when available, else a manual scale.
function musicalScale(root, mode) {
  const s = window.scribbletune;
  let base = null;
  if (s && typeof s.scale === "function") {
    try {
      const notes = s.scale(`${root} ${mode || "major"}`);
      if (Array.isArray(notes) && notes.length >= 5) {
        base = notes.map(normalizeNoteName);
      }
    } catch (error) {
      base = null;
    }
  }
  if (!base) {
    const intervals = mode === "minor" ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
    const rootMidi = midiFromNote(root);
    base = intervals.map((interval) => noteFromMidi(rootMidi + interval));
  }
  return base.concat(base.map((note) => raiseOctave(note)));
}

// ---- Draggable music regions (GarageBand-style clips you can resize on the timeline) ----
const GEN_STYLES = {
  pop: { mode: "major", density: 0.55 },
  edm: { mode: "minor", density: 0.7, rhythm: [2, 3, 4, 6, 8, 10, 11, 12, 14] },
  electronic: { mode: "minor", density: 0.62, rhythm: [0, 2, 4, 6, 8, 10, 12, 14] },
  techno: { mode: "minor", density: 0.78, rhythm: [0, 2, 3, 4, 6, 8, 10, 12, 14, 15] },
  hiphop: { mode: "minor", density: 0.4 },
  rnb: { mode: "minor", density: 0.5 },
  rock: { mode: "major", density: 0.62 },
  funk: { mode: "minor", density: 0.72, rhythm: [1, 2, 4, 6, 7, 8, 10, 12, 14, 15] },
  blues: { mode: "minor", density: 0.55 },
  jazz: { mode: "major", density: 0.68, rhythm: [2, 3, 6, 7, 10, 11, 14] },
  latin: { mode: "minor", density: 0.6 },
  reggae: { mode: "minor", density: 0.4, rhythm: [2, 6, 10, 14] },
  folk: { mode: "major", density: 0.5 },
  ambient: { mode: "minor", density: 0.3, rhythm: [4, 8, 12] }
};
const GEN_STYLE_LABELS = { pop: "Pop", edm: "EDM", electronic: "Electronic", techno: "Techno", hiphop: "Hip-Hop", rnb: "R&B", rock: "Rock", funk: "Funk", blues: "Blues", jazz: "Jazz", latin: "Latin", reggae: "Reggae", folk: "Folk", ambient: "Ambient" };

// "Sound Type" for Generate Music: null = use the real sampled instrument; otherwise synthesize
// the generated melody/chords with this oscillator + envelope (+ optional distortion).
const GEN_SOUND_TYPES = {
  sampled: null,
  electronic: { osc: "sawtooth", envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.4 }, dist: 0.15, volume: -8 },
  techno: { osc: "square", envelope: { attack: 0.005, decay: 0.16, sustain: 0.35, release: 0.24 }, dist: 0.35, volume: -10 },
  synth: { osc: "triangle", envelope: { attack: 0.08, decay: 0.3, sustain: 0.6, release: 0.9 }, dist: 0, volume: -7 },
  retro: { osc: "pulse", envelope: { attack: 0.001, decay: 0.12, sustain: 0.3, release: 0.15 }, dist: 0, volume: -9 },
  bass: { osc: "fatsawtooth", envelope: { attack: 0.02, decay: 0.2, sustain: 0.7, release: 0.5 }, dist: 0.1, volume: -6 },
  sine: { osc: "sine", envelope: { attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.6 }, dist: 0, volume: -6 },
  supersaw: { osc: "fatsawtooth", envelope: { attack: 0.02, decay: 0.15, sustain: 0.72, release: 0.5 }, dist: 0.22, volume: -12 },
  square: { osc: "square", envelope: { attack: 0.005, decay: 0.12, sustain: 0.4, release: 0.2 }, dist: 0, volume: -10 },
  fm: { osc: "fmsine", envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.6 }, dist: 0, volume: -8 },
  am: { osc: "amsine", envelope: { attack: 0.02, decay: 0.25, sustain: 0.5, release: 0.6 }, dist: 0, volume: -8 },
  pwm: { osc: "pwm", envelope: { attack: 0.06, decay: 0.3, sustain: 0.6, release: 0.8 }, dist: 0, volume: -9 },
  pluck: { osc: "triangle", envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.2 }, dist: 0, volume: -5 },
  warm: { osc: "fattriangle", envelope: { attack: 0.1, decay: 0.3, sustain: 0.7, release: 1 }, dist: 0, volume: -7 },
  hard: { osc: "fatsquare", envelope: { attack: 0.005, decay: 0.15, sustain: 0.5, release: 0.3 }, dist: 0.45, volume: -12 },
  organ: { osc: "fmsquare", envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.2 }, dist: 0, volume: -9 }
};

// Ordered list used to populate both Sound Type dropdowns (Band Instruments + Loop Sequencer).
const SOUND_TYPE_OPTIONS = [
  { value: "sampled", label: "Sampled (real)" },
  { value: "electronic", label: "Electronic" },
  { value: "techno", label: "Techno" },
  { value: "synth", label: "Synth Pad" },
  { value: "retro", label: "Retro 8-bit" },
  { value: "bass", label: "Deep Bass" },
  { value: "sine", label: "Sine (Soft)" },
  { value: "supersaw", label: "Supersaw Lead" },
  { value: "square", label: "Square (Chiptune)" },
  { value: "fm", label: "FM Bell" },
  { value: "am", label: "AM Tremolo" },
  { value: "pwm", label: "PWM Pad" },
  { value: "pluck", label: "Pluck" },
  { value: "warm", label: "Warm Pad" },
  { value: "hard", label: "Hard Lead" },
  { value: "organ", label: "Organ Synth" }
];

// Per-sound-type SYNTHESIZED drum kits. When #genSoundType != "sampled", the Drum Kit is
// synthesized (electronic drum-machine style) instead of the real acoustic samples, so each
// sound type gives the kit its own character.
const DRUM_SYNTH_KITS = {
  electronic: { osc: "sine", pitchDecay: 0.03, octaves: 8, kickDecay: 0.42, snareType: "white", snareDecay: 0.16, hatType: "white", hatDecay: 0.045, hatFreq: 9000, dist: 0.12 },
  techno: { osc: "square", pitchDecay: 0.02, octaves: 6, kickDecay: 0.5, snareType: "white", snareDecay: 0.2, hatType: "white", hatDecay: 0.05, hatFreq: 8000, dist: 0.4 },
  synth: { osc: "triangle", pitchDecay: 0.05, octaves: 5, kickDecay: 0.5, snareType: "pink", snareDecay: 0.22, hatType: "pink", hatDecay: 0.06, hatFreq: 7000, dist: 0 },
  retro: { osc: "square", pitchDecay: 0.008, octaves: 10, kickDecay: 0.3, snareType: "white", snareDecay: 0.1, hatType: "white", hatDecay: 0.03, hatFreq: 10000, dist: 0.05 },
  bass: { osc: "sine", pitchDecay: 0.06, octaves: 4, kickDecay: 0.7, snareType: "brown", snareDecay: 0.24, hatType: "white", hatDecay: 0.05, hatFreq: 6000, dist: 0.1 }
};

// New sound types borrow a drum-kit character from an existing kit (keeps drums in sync too).
const DRUM_KIT_ALIAS = {
  sine: "synth", supersaw: "electronic", square: "retro", fm: "techno", am: "synth",
  pwm: "synth", pluck: "retro", warm: "synth", hard: "techno", organ: "synth"
};

// Build a repeating musical phrase for a melodic instrument (used as a region's content).
function buildMelodicPhrase(instrumentId, rootNote, phraseBars, style) {
  const bars = phraseBars || 4;
  const len = bars * STEPS_PER_BAR;
  const bassy = instrumentId === "bass" || instrumentId === "cello";
  const preset = GEN_STYLES[style] || GEN_STYLES.pop;
  const density = preset.density != null ? preset.density : 0.55;
  const rhythm = preset.rhythm || [2, 4, 6, 8, 10, 12, 14];
  const root = rootNote || (bassy ? "C2" : "C3");
  const scale = musicalScale(root, preset.mode || "major");
  const notes = {};
  let walk = Math.floor(scale.length / 3);
  for (let bar = 0; bar < bars; bar += 1) {
    const positions = [0];
    rhythm.forEach((p) => {
      if (chance(bassy ? density * 0.6 : density)) {
        positions.push(p);
      }
    });
    positions.sort((a, b) => a - b);
    positions.forEach((p) => {
      const move = (chance(0.5) ? 1 : -1) * (chance(0.3) ? 2 : 1);
      walk = ((walk + move) % scale.length + scale.length) % scale.length;
      notes[bar * STEPS_PER_BAR + p] = [scale[walk]];
    });
  }
  return { len, notes };
}

// Fill a region track's pattern/stepNotes by tiling its phrase (or repeating its clip)
// across the region's current length.
function retileRegion(track) {
  const total = totalSteps();
  const startPos = Math.max(0, Math.min(track.regionStart || 0, Math.max(0, total - 1)));
  const len = Math.min(track.regionLen || total, total - startPos);
  const offset = track.regionOffset || 0;
  const pattern = new Array(total).fill(0);
  const stepNotes = {};
  const globalTempo = Number(elements.tempo.value) || 120;
  const scale = track.tempo ? globalTempo / track.tempo : 1; // <1 = faster clip, >1 = slower
  if (track.kind === "sample") {
    const unit = Math.max(1, Math.round(sampleRegionSteps(track.instrumentId) * scale));
    for (let i = 0; i < len; i += unit) {
      pattern[startPos + i] = 1;
    }
  } else if (track.phrase) {
    const phrase = scale === 1 ? track.phrase : scalePhrase(track.phrase, scale);
    const phraseLen = phrase.len || STEPS_PER_BAR;
    for (let i = 0; i < len; i += 1) {
      const rel = (((i + offset) % phraseLen) + phraseLen) % phraseLen;
      if (phrase.notes && phrase.notes[rel]) {
        pattern[startPos + i] = 1;
        stepNotes[startPos + i] = phrase.notes[rel].slice();
      } else if (phrase.stepsSet && phrase.stepsSet.has(rel)) {
        pattern[startPos + i] = 1;
      }
    }
  }
  track.pattern = pattern;
  if (track.kind !== "drum") {
    track.stepNotes = Object.keys(stepNotes).length ? stepNotes : null;
  }
}

// Resample a phrase to a new length (per-clip tempo: scale < 1 compresses = plays faster).
function scalePhrase(phrase, scale) {
  const newLen = Math.max(1, Math.round((phrase.len || STEPS_PER_BAR) * scale));
  const out = { len: newLen };
  if (phrase.notes) {
    out.notes = {};
    Object.keys(phrase.notes).forEach((p) => {
      const np = Math.max(0, Math.min(newLen - 1, Math.round(Number(p) * scale)));
      out.notes[np] = phrase.notes[p];
    });
  }
  if (phrase.stepsSet) {
    out.stepsSet = new Set();
    phrase.stepsSet.forEach((p) => {
      out.stepsSet.add(Math.max(0, Math.min(newLen - 1, Math.round(p * scale))));
    });
  }
  return out;
}

function regionMinLen(track) {
  // GarageBand-style: clips can be trimmed down to a single bar (content repeats/tiles).
  return STEPS_PER_BAR;
}

// Real melodic samples drop as a full-length music region (repeating phrase you can drag).
function generateMelodicPart(instrumentId, rootNote, style) {
  const track = makeTrack(instrumentId, { pattern: new Array(totalSteps()).fill(0) });
  track.region = true;
  track.tempo = Number(elements.tempo.value) || 120;
  track.phrase = buildMelodicPhrase(instrumentId, rootNote, 4, style);
  track.regionLen = totalSteps();
  retileRegion(track);
  return track;
}

// A drum groove region (1-bar phrase tiled full length, draggable).
function generateDrumPart(piece) {
  const grooves = {
    kick: [0, 4, 8, 12],
    snare: [4, 12],
    hihat: [0, 2, 4, 6, 8, 10, 12, 14],
    tom1: [6, 14],
    tom2: [7, 15],
    tom3: [3, 11]
  };
  const per = grooves[piece] || [0, 8];
  const track = makeTrack("drums", { piece, pattern: new Array(totalSteps()).fill(0) });
  track.region = true;
  track.tempo = Number(elements.tempo.value) || 120;
  track.phrase = { len: STEPS_PER_BAR, stepsSet: new Set(per) };
  track.regionLen = totalSteps();
  retileRegion(track);
  return track;
}

// Drop a recorded sample onto the timeline as a full-length audio region (like GarageBand).
function generateSamplePart(instrumentId) {
  const track = makeTrack(instrumentId, { pattern: new Array(totalSteps()).fill(0) });
  track.region = true;
  track.tempo = Number(elements.tempo.value) || 120;
  track.regionLen = Math.max(1, sampleRegionSteps(instrumentId));
  retileRegion(track);
  return track;
}

// Build a vocal line that sings lyrics across the timeline.
function generateVocalPart() {
  const total = totalSteps();
  const pattern = new Array(total).fill(0);
  const custom = parseLyrics(elements.lyricsInput ? elements.lyricsInput.value : "");
  const pool = custom.length ? custom : shuffle(BIG_LYRICS.slice());
  const stepText = {};
  let lineIndex = 0;
  for (let bar = 0; bar < state.bars; bar += 2) {
    const step = bar * STEPS_PER_BAR;
    pattern[step] = 1;
    stepText[step] = pool[lineIndex % pool.length];
    lineIndex += 1;
  }
  const track = makeTrack("vocals", { pattern });
  track.stepText = stepText;
  track.vocalPitch = 1;
  return track;
}

// Play the same notes through several voices at once (layer the real instrument with a synth).
function makeLayeredVoice(voices) {
  return {
    triggerAttackRelease(notes, duration, time, velocity) {
      voices.forEach((voice) => {
        try { voice.triggerAttackRelease(notes, duration, time, velocity); } catch (error) { /* ignore */ }
      });
    }
  };
}

// "Generate Music" (beside Rec Sample): make a musical clip for the selected instrument in
// the chosen Music Style and drop it on the timeline as a draggable, tempo-tagged region.
// Render a short piece of real music from the sample instruments (in the chosen style)
// offline into an AudioBuffer, so Generate Music can save it as a new sample.
async function renderStyleMusicBuffer(instrumentDef, style) {
  const preset = GEN_STYLES[style] || GEN_STYLES.pop;
  const STYLE_PROG = { pop: "pop", edm: "edm", electronic: "edm", techno: "minor", hiphop: "minor", rnb: "doowop", rock: "pop", funk: "minor", blues: "blues", jazz: "jazz", latin: "latin", reggae: "reggae", folk: "folk", ambient: "minor" };
  const prog = PROG[STYLE_PROG[style]] || PROG.pop;
  const bpm = Number(elements.tempo.value) || 112;
  const secondsPerStep = (60 / bpm) / 4;
  const seconds = 8;
  const stepCount = Math.max(16, Math.floor(seconds / secondsPerStep));
  const renderSeconds = seconds + 1.6;
  const density = preset.density != null ? preset.density : 0.55;
  const isDrums = instrumentDef.id === "drums";
  const isMelodic = !!(instrumentDef.sample && instrumentDef.sample.kind === "melodic");
  // Only the SELECTED instrument plays — no backing band.
  const soloDef = isMelodic ? instrumentDef : (isDrums ? getInstrumentDef("drums") : getInstrumentDef("piano"));
  const soundType = elements.genSoundType ? elements.genSoundType.value : "sampled";
  const soundDef = GEN_SOUND_TYPES[soundType] || null;
  const scale = musicalScale("C4", preset.mode || "major");
  const rendered = await Tone.Offline(async () => {
    const reverb = new Tone.Reverb({ decay: 2.4, wet: 0.16 }).toDestination();
    let lead = null;
    let drums = null;
    let drumKit = null;
    if (isDrums) {
      // Instrument (real kit) + Sound Type (synth kit) + Style (groove), layered together.
      drums = new Tone.Players({ urls: soloDef.sample.urls, baseUrl: soloDef.sample.baseUrl }).connect(reverb);
      drums.volume.value = soundDef ? -7 : -2;
      if (soundDef) {
        drumKit = buildSynthDrumKit(soundType, reverb);
      }
    } else if (soundDef) {
      let dest = reverb;
      if (soundDef.dist > 0) {
        dest = new Tone.Distortion({ distortion: soundDef.dist, wet: 0.5 }).connect(reverb);
      }
      const synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: soundDef.osc }, envelope: soundDef.envelope }).connect(dest);
      synth.volume.value = soundDef.volume;
      // Layer the real INSTRUMENT sample together with the Sound Type synth.
      const layers = [synth];
      if (isMelodic) {
        const sampler = new Tone.Sampler({ urls: soloDef.sample.urls, baseUrl: soloDef.sample.baseUrl }).connect(reverb);
        sampler.volume.value = -2;
        layers.push(sampler);
      }
      lead = layers.length > 1 ? makeLayeredVoice(layers) : synth;
    } else {
      lead = new Tone.Sampler({ urls: soloDef.sample.urls, baseUrl: soloDef.sample.baseUrl }).connect(reverb);
      lead.volume.value = -1;
    }
    await Tone.loaded();
    const last = new Map();
    const nextTime = (key, desired) => {
      const prev = last.get(key);
      const safe = prev === undefined ? desired : Math.max(desired, prev + 0.004);
      last.set(key, safe);
      return safe;
    };
    const hitDrum = (piece, key, t, vel) => {
      const at = nextTime(key, t);
      if (drumKit) { drumKit.trigger(piece, at, vel); }
      if (drums && drums.has(piece)) { drums.player(piece).start(at); }
    };
    let walk = Math.floor(scale.length / 3);
    for (let step = 0; step < stepCount; step += 1) {
      const t = step * secondsPerStep;
      const inBar = step % 16;
      const chord = prog[Math.floor(step / 16) % prog.length];
      if (isDrums) {
        if (inBar % 4 === 0) { hitDrum("kick", "k", t, 0.9); }
        if (inBar === 4 || inBar === 12) { hitDrum("snare", "s", t, 0.9); }
        if (inBar % 2 === 0) { hitDrum("hihat", "h", t, 0.7); }
      } else if (lead) {
        // Chords + melody, all on the selected instrument.
        if (inBar === 0) {
          lead.triggerAttackRelease(chord.notes, "2n", nextTime("l", t), 0.4);
        }
        if (inBar % 2 === 0 && Math.random() < density) {
          const move = (Math.random() < 0.5 ? 1 : -1) * (Math.random() < 0.3 ? 2 : 1);
          walk = ((walk + move) % scale.length + scale.length) % scale.length;
          lead.triggerAttackRelease(scale[walk], "8n", nextTime("l", t), 0.85);
        }
      }
    }
  }, renderSeconds, 2);
  const buffer = rendered.get();
  normalizeBuffer(buffer, 0.95); // layered voices can sum past 0dB -> scale to a safe peak (no clipping)
  return buffer;
}

// Scale an AudioBuffer in place so its loudest sample sits at `target` (prevents clipping).
function normalizeBuffer(buffer, target = 0.95) {
  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i += 1) {
      const a = Math.abs(data[i]);
      if (a > peak) { peak = a; }
    }
  }
  if (peak > 0) {
    const gain = target / peak;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i += 1) { data[i] *= gain; }
    }
  }
  return buffer;
}

// "Generate Music" makes real music from the sample instruments (in the chosen style) and
// adds it as a new sample in the instrument list.
async function generateMusicForSelected() {
  const id = state.selectedInstrument;
  const def = getInstrumentDef(id);
  const style = elements.genMusicStyle ? elements.genMusicStyle.value : "pop";
  const soundType = elements.genSoundType ? elements.genSoundType.value : "sampled";
  const styleLabel = GEN_STYLE_LABELS[style] || style;
  const soundTag = soundType !== "sampled" ? ` ${soundType.charAt(0).toUpperCase()}${soundType.slice(1)}` : "";
  const ready = await startAudio();
  if (!ready) {
    return;
  }
  const button = elements.generateMusic;
  const originalLabel = button ? button.innerHTML : "";
  if (button) {
    button.disabled = true;
    button.innerHTML = `<i data-lucide="loader"></i><span>Making\u2026</span>`;
    refreshIcons();
  }
  elements.statusText.textContent = `Generating ${styleLabel}${soundTag} music\u2026`;
  try {
    const buffer = await renderStyleMusicBuffer(def, style);
    const baseName = (def.sample && def.sample.kind === "melodic") ? def.short : (def.id === "drums" ? "Drums" : "Music");
    const name = `${styleLabel}${soundTag} ${baseName}`.slice(0, 24);
    await addSampleBuffer(buffer, name, { autoRename: false, persist: true });
    const newId = state.selectedInstrument;
    startSamplePreview(newId, getInstrumentDef(newId));
    elements.statusText.textContent = `${name} — playing, press Stop Sample to end`;
  } catch (error) {
    console.error(error);
    elements.statusText.textContent = "Music generation failed";
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalLabel;
      refreshIcons();
    }
  }
}

async function addSampleBuffer(audioBuffer, name, options = {}) {
  const { autoRename = false, persist = true, key, select = true } = options;
  const id = nextSampleSlot();
  const definition = getInstrumentDef(id);
  if (name && definition) {
    definition.name = name;
    definition.short = name.length > 9 ? name.slice(0, 9) : name;
    const option = addOptions.find((entry) => entry.value === id);
    if (option) {
      option.label = `${name} (Recorded)`;
    }
  }
  if (definition) {
    definition.sampleKey = key || `smp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  buildSampleSampler(id, audioBuffer, { autoRename, select });
  renderInstrumentRack();
  renderMixer();
  populateBuilder();
  refreshIcons();
  if (persist && definition && definition.sampleKey) {
    try {
      const wav = audioBufferToWav(audioBuffer);
      saveSampleToDb(definition.sampleKey, definition.name, wav).catch((error) => {
        console.warn("Sample persist failed", error);
      });
    } catch (error) {
      console.warn("Sample encode failed", error);
    }
  }
  return id;
}

function onSampleFileChange(event) {
  const input = event.target;
  const file = input.files && input.files[0];
  input.value = "";
  if (file) {
    loadWavFile(file);
  }
}

async function loadWavFile(file) {
  const ready = await startAudio();
  if (!ready) {
    return;
  }
  elements.statusText.textContent = `Loading ${file.name}\u2026`;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const context = Tone.getContext().rawContext;
    const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
    const name = (file.name.replace(/\.[^.]+$/, "").trim() || "Upload").slice(0, 24);
    await addSampleBuffer(audioBuffer, name, { autoRename: false, persist: true });
    elements.statusText.textContent = `${name} loaded & saved to your browser`;
  } catch (error) {
    console.error(error);
    elements.statusText.textContent = "Could not load that audio file";
  }
}

/* ---------- Sample persistence (IndexedDB) ---------- */
function openSampleDb() {
  if (state.sampleDb) {
    return Promise.resolve(state.sampleDb);
  }
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    let settled = false;
    const request = indexedDB.open("musicband-studio", 1);
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("IndexedDB open timed out"));
      }
    }, 6000);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("samples")) {
        db.createObjectStore("samples", { keyPath: "key" });
      }
    };
    request.onsuccess = () => {
      window.clearTimeout(timer);
      if (settled) {
        return;
      }
      settled = true;
      state.sampleDb = request.result;
      state.sampleDb.onversionchange = () => {
        try {
          state.sampleDb.close();
        } catch (error) {
          /* ignore */
        }
        state.sampleDb = null;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      window.clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(request.error);
      }
    };
    request.onblocked = () => {
      window.clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(new Error("IndexedDB blocked"));
      }
    };
  });
}

function saveSampleToDb(key, name, wavBlob) {
  return openSampleDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction("samples", "readwrite");
    tx.objectStore("samples").put({ key, name, wav: wavBlob, created: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

function updateSampleName(key, name) {
  openSampleDb().then((db) => {
    const tx = db.transaction("samples", "readwrite");
    const store = tx.objectStore("samples");
    const getRequest = store.get(key);
    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (record) {
        record.name = name;
        store.put(record);
      }
    };
  }).catch(() => { /* ignore */ });
}

function loadSamplesFromDb() {
  return openSampleDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction("samples", "readonly");
    const request = tx.objectStore("samples").getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  }));
}

async function restoreSamplesFromDb() {
  let records;
  try {
    records = await loadSamplesFromDb();
  } catch (error) {
    return;
  }
  if (!records || !records.length) {
    return;
  }
  records.sort((a, b) => (a.created || 0) - (b.created || 0));
  let context;
  try {
    context = new (window.AudioContext || window.webkitAudioContext)();
  } catch (error) {
    return;
  }
  let restored = 0;
  for (const record of records) {
    if (!record || !record.wav) {
      continue;
    }
    try {
      const arrayBuffer = await record.wav.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
      const id = nextSampleSlot();
      const definition = getInstrumentDef(id);
      if (definition) {
        const name = record.name || definition.name;
        definition.name = name;
        definition.short = name.length > 9 ? name.slice(0, 9) : name;
        definition.sampleKey = record.key;
        const option = addOptions.find((entry) => entry.value === id);
        if (option) {
          option.label = `${name} (Recorded)`;
        }
      }
      state.pendingSampleBuffers[id] = audioBuffer;
      restored += 1;
    } catch (error) {
      console.warn("Could not restore sample", error);
    }
  }
  try {
    context.close();
  } catch (error) {
    /* ignore */
  }
  if (restored) {
    renderInstrumentRack();
    renderMixer();
    populateBuilder();
    refreshIcons();
    elements.statusText.textContent = `Restored ${restored} saved sample${restored > 1 ? "s" : ""} \u2014 press Start Audio to play`;
  }
}

/* ---------- Mixer ---------- */
function renderMixer() {
  elements.mixerGrid.innerHTML = "";
  instrumentDefs.forEach((definition) => {
    if (definition.vocal) {
      return;
    }
    if (!state.channelSettings[definition.id]) {
      state.channelSettings[definition.id] = { volume: 0, mute: false, solo: false };
    }
    const channel = document.createElement("div");
    channel.className = "mixer-channel";
    channel.style.setProperty("--channel-color", definition.color);

    const name = document.createElement("span");
    name.className = "channel-name";
    name.textContent = definition.short;

    const fader = document.createElement("input");
    fader.type = "range";
    fader.className = "channel-fader";
    fader.min = "-36";
    fader.max = "6";
    fader.step = "1";
    fader.value = String(state.channelSettings[definition.id].volume);
    fader.setAttribute("aria-label", `${definition.name} volume`);
    fader.addEventListener("input", () => {
      state.channelSettings[definition.id].volume = Number(fader.value);
      applyMixerSettings();
    });

    const buttons = document.createElement("div");
    buttons.className = "channel-buttons";
    const muteButton = document.createElement("button");
    muteButton.type = "button";
    muteButton.className = "mute";
    muteButton.textContent = "M";
    muteButton.addEventListener("click", () => {
      const settings = state.channelSettings[definition.id];
      settings.mute = !settings.mute;
      muteButton.classList.toggle("is-active", settings.mute);
      applyMixerSettings();
    });
    const soloButton = document.createElement("button");
    soloButton.type = "button";
    soloButton.className = "solo";
    soloButton.textContent = "S";
    soloButton.addEventListener("click", () => {
      const settings = state.channelSettings[definition.id];
      settings.solo = !settings.solo;
      soloButton.classList.toggle("is-active", settings.solo);
      if (settings.solo) {
        state.soloed.add(definition.id);
      } else {
        state.soloed.delete(definition.id);
      }
      applyMixerSettings();
    });

    buttons.append(muteButton, soloButton);
    channel.append(name, fader, buttons);
    elements.mixerGrid.append(channel);
  });
}

function applyMixerSettings() {
  if (!state.ready) {
    return;
  }
  const anySolo = state.soloed.size > 0;
  instrumentDefs.forEach((definition) => {
    const channel = state.channels[definition.id];
    if (!channel) {
      return;
    }
    const settings = state.channelSettings[definition.id];
    const muted = settings.mute || (anySolo && !settings.solo);
    channel.mute = muted;
    channel.volume.rampTo(settings.volume, 0.05);
  });
}

/* ---------- Sequencer builder ---------- */
function populateBuilder() {
  elements.addInstrument.innerHTML = "";
  addOptions.forEach((option) => {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    elements.addInstrument.append(element);
  });
  elements.addInstrument.value = "bass";

  elements.addNote.innerHTML = "";
  NOTE_CHOICES.forEach((note) => {
    const element = document.createElement("option");
    element.value = note;
    element.textContent = note;
    elements.addNote.append(element);
  });
  elements.addNote.value = "C3";
  updateBuilderMode();
}

function updateBuilderMode() {
  const value = elements.addInstrument.value;
  const isVocals = value === "vocals";
  const hideNote = value.startsWith("drums:") || isVocals;
  elements.sequencerBuilder.classList.toggle("note-hidden", hideNote);
  elements.sequencerBuilder.classList.toggle("vocals-mode", isVocals);
  if (isVocals && (!state.voiceCatalog || !state.voiceCatalog.length)) {
    populateVoices();
  }
}

function parseLyrics(text) {
  return String(text || "").split(/[|\n]/).map((line) => line.trim()).filter(Boolean);
}

function previewVoice() {
  const custom = parseLyrics(elements.lyricsInput ? elements.lyricsInput.value : "");
  const text = custom.length ? custom[state.testLyricIndex % custom.length] : pick(BIG_LYRICS);
  state.testLyricIndex = (state.testLyricIndex || 0) + 1;
  speakLine(text, 1);
}

function previewSongVoice() {
  const custom = parseLyrics(elements.songLyrics ? elements.songLyrics.value : "");
  const text = custom.length ? custom[state.songTestIndex % custom.length] : pick(BIG_LYRICS);
  state.songTestIndex = (state.songTestIndex || 0) + 1;
  speakLine(text, 1);
}

function addTrackFromBuilder() {
  const value = elements.addInstrument.value;
  let track;
  if (value.startsWith("drums:")) {
    const piece = value.split(":")[1];
    track = generateDrumPart(piece);
  } else if (value === "vocals") {
    track = generateVocalPart();
  } else {
    const def = getInstrumentDef(value);
    track = def && def.recorded ? generateSamplePart(value) : generateMelodicPart(value, elements.addNote.value);
  }
  state.seqTracks.push(track);
  ensureInstrument(track.instrumentId);
  renderSequencer();
  const grid = elements.sequenceGrid;
  grid.scrollTop = grid.scrollHeight;
  elements.statusText.textContent = "Added a musical part across the loop";
}

function removeTrack(uid) {
  state.seqTracks = state.seqTracks.filter((track) => track.uid !== uid);
  renderSequencer();
}

/* ---------- Sequencer grid ---------- */
function trackLabel(track) {
  const def = getInstrumentDef(track.instrumentId);
  if (track.kind === "drum") {
    return { name: DRUM_PIECE_LABELS[track.piece] || def.short, sub: "" };
  }
  if (track.kind === "vocal") {
    return { name: "Vocals", sub: "lyrics" };
  }
  if (track.kind === "sample") {
    return { name: def.short, sub: "clip" };
  }
  if (track.stepNotes) {
    return { name: def.short, sub: "line" };
  }
  return { name: def.short, sub: track.notes ? track.notes.join(" ") : "" };
}

function renderSequencer() {
  const total = totalSteps();
  const template = `128px repeat(${total}, ${STEP_W}px)`;

  elements.stepLabels.style.gridTemplateColumns = template;
  const labelFrag = document.createDocumentFragment();
  const corner = document.createElement("span");
  labelFrag.append(corner);
  for (let step = 0; step < total; step += 1) {
    const label = document.createElement("span");
    if (step % STEPS_PER_BAR === 0) {
      label.textContent = String(step / STEPS_PER_BAR + 1);
      label.classList.add("bar-start");
    } else if (step % 4 === 0) {
      label.classList.add("beat");
    }
    labelFrag.append(label);
  }
  elements.stepLabels.innerHTML = "";
  elements.stepLabels.append(labelFrag);

  state.stepColumns = Array.from({ length: total }, () => []);
  state.currentColumn = null;
  const gridFrag = document.createDocumentFragment();

  state.seqTracks.forEach((track) => {
    const row = document.createElement("div");
    row.className = "sequence-row";
    row.style.gridTemplateColumns = template;
    row.style.setProperty("--track-color", track.color);

    const nameCell = document.createElement("span");
    nameCell.className = "track-name";
    const label = trackLabel(track);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "track-remove";
    remove.textContent = "×";
    remove.title = "Remove track";
    remove.setAttribute("aria-label", `Remove ${label.name}`);
    remove.addEventListener("click", () => removeTrack(track.uid));
    nameCell.innerHTML = `<span class="track-dot"></span><span class="track-label">${label.name}${label.sub ? ` <span class="track-sub">${label.sub}</span>` : ""}</span>`;
    if (track.region) {
      const tempoInput = document.createElement("input");
      tempoInput.type = "number";
      tempoInput.className = "track-tempo";
      tempoInput.min = "40";
      tempoInput.max = "260";
      tempoInput.step = "1";
      tempoInput.value = String(Math.round(track.tempo || Number(elements.tempo.value) || 120));
      tempoInput.title = "Clip tempo (BPM)";
      tempoInput.addEventListener("click", (event) => event.stopPropagation());
      tempoInput.addEventListener("change", () => {
        const value = Number(tempoInput.value);
        if (Number.isFinite(value) && value >= 40) {
          track.tempo = value;
          retileRegion(track);
          renderSequencer();
        }
      });
      nameCell.append(tempoInput);
    }
    nameCell.append(remove);
    row.append(nameCell);

    // Every track has an adjustable window [winStart, winStart+winLen) (trim/expand like GarageBand).
    const winStart = Math.max(0, Math.min(track.regionStart || 0, total));
    const winLen = Math.min(track.regionLen != null ? track.regionLen : (total - winStart), total - winStart);
    const trimmed = track.regionLen != null;

    for (let step = 0; step < total; step += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "step-cell";
      if (step % STEPS_PER_BAR === 0) {
        cell.classList.add("bar-start");
      } else if (step % 4 === 0) {
        cell.classList.add("beat");
      }
      cell.dataset.uid = String(track.uid);
      cell.dataset.step = String(step);
      if (track.pattern[step]) {
        cell.classList.add("is-active");
      }
      const inWindow = step >= winStart && step < winStart + winLen;
      if (track.region) {
        if (inWindow) { cell.classList.add("in-region"); }
      } else if (trimmed && !inWindow) {
        cell.classList.add("out-region");
      }
      state.stepColumns[step].push(cell);
      row.append(cell);
    }

    // Trim/expand handles for every track; clips also get a draggable body to move them.
    row.style.position = "relative";
    const leftPx = 128 + winStart * STEP_W;
    const widthPx = winLen * STEP_W;
    if (track.region) {
      const body = document.createElement("div");
      body.className = "region-body";
      body.title = "Drag to move the clip \u00b7 drag either edge to trim";
      body.style.left = `${leftPx}px`;
      body.style.width = `${widthPx}px`;
      body.addEventListener("pointerdown", (event) => startRegionMove(event, track, row));
      row.append(body);
    }
    const leftHandle = document.createElement("div");
    leftHandle.className = "region-handle region-handle-left";
    leftHandle.title = "Drag to trim the start";
    leftHandle.style.left = `${leftPx - 6}px`;
    leftHandle.addEventListener("pointerdown", (event) => startRegionResize(event, track, row, "left"));
    row.append(leftHandle);
    const rightHandle = document.createElement("div");
    rightHandle.className = "region-handle region-handle-right";
    rightHandle.title = "Drag to trim or expand the end";
    rightHandle.style.left = `${leftPx + widthPx - 6}px`;
    rightHandle.addEventListener("pointerdown", (event) => startRegionResize(event, track, row, "right"));
    row.append(rightHandle);

    gridFrag.append(row);
  });

  elements.sequenceGrid.innerHTML = "";
  elements.sequenceGrid.append(gridFrag);
  setActiveStep(state.activeStep);
}

function onSeqGridClick(event) {
  const cell = event.target.closest(".step-cell");
  if (!cell) {
    return;
  }
  const uid = Number(cell.dataset.uid);
  const step = Number(cell.dataset.step);
  const track = state.seqTracks.find((entry) => entry.uid === uid);
  if (!track) {
    return;
  }
  if (track.region) {
    return; // regions are resized by dragging their edge, not toggled per-cell
  }
  track.pattern[step] = track.pattern[step] ? 0 : 1;
  cell.classList.toggle("is-active", Boolean(track.pattern[step]));
}

// GarageBand-style clip editing: drag either edge to trim/extend, drag the body to move.
function startRegionResize(event, track, row, edge) {
  event.preventDefault();
  event.stopPropagation();
  const handle = event.currentTarget;
  const startX = event.clientX;
  const startPos0 = Math.max(0, track.regionStart || 0);
  const startLen0 = track.regionLen || totalSteps();
  const startOffset0 = track.regionOffset || 0;
  const minLen = regionMinLen(track);
  const maxLen = MAX_BARS * STEPS_PER_BAR;
  let preview = { start: startPos0, len: startLen0, offset: startOffset0 };
  try { handle.setPointerCapture(event.pointerId); } catch (error) { /* ignore */ }

  const onMove = (moveEvent) => {
    const dSteps = Math.round((moveEvent.clientX - startX) / STEP_W);
    const dBars = Math.round(dSteps / STEPS_PER_BAR) * STEPS_PER_BAR;
    let start = startPos0;
    let len = startLen0;
    let offset = startOffset0;
    if (edge === "right") {
      len = Math.max(minLen, Math.min(maxLen, startLen0 + dBars));
    } else {
      let delta = dBars;
      delta = Math.max(-startPos0, delta);          // start can't go below bar 0
      delta = Math.min(delta, startLen0 - minLen);  // keep at least the min length
      start = startPos0 + delta;
      len = startLen0 - delta;
      offset = startOffset0 + delta;                // keep content anchored in time
    }
    if (start === preview.start && len === preview.len) {
      return;
    }
    preview = { start, len, offset };
    updateRegionPreviewBlock(row, track, start, len);
    const bars = Math.round(len / STEPS_PER_BAR);
    elements.statusText.textContent = `Clip: ${bars} bar${bars === 1 ? "" : "s"}`;
  };
  const onUp = () => {
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onUp);
    handle.removeEventListener("pointercancel", onUp);
    try { handle.releasePointerCapture(event.pointerId); } catch (error) { /* ignore */ }
    commitRegion(track, preview.start, preview.len, preview.offset);
  };
  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", onUp);
  handle.addEventListener("pointercancel", onUp);
}

// Drag the clip body to slide the whole region along the timeline (content moves with it).
function startRegionMove(event, track, row) {
  event.preventDefault();
  event.stopPropagation();
  const body = event.currentTarget;
  const startX = event.clientX;
  const startPos0 = Math.max(0, track.regionStart || 0);
  const len = Math.min(track.regionLen || totalSteps(), totalSteps());
  const offset = track.regionOffset || 0;
  const maxStart = MAX_BARS * STEPS_PER_BAR - len;
  let previewStart = startPos0;
  try { body.setPointerCapture(event.pointerId); } catch (error) { /* ignore */ }
  body.classList.add("is-grabbing");

  const onMove = (moveEvent) => {
    const dSteps = Math.round((moveEvent.clientX - startX) / STEP_W);
    const dBars = Math.round(dSteps / STEPS_PER_BAR) * STEPS_PER_BAR;
    const start = Math.max(0, Math.min(maxStart, startPos0 + dBars));
    if (start === previewStart) {
      return;
    }
    previewStart = start;
    updateRegionPreviewBlock(row, track, start, len);
    const bar = Math.round(start / STEPS_PER_BAR) + 1;
    elements.statusText.textContent = `Clip start: bar ${bar}`;
  };
  const onUp = () => {
    body.removeEventListener("pointermove", onMove);
    body.removeEventListener("pointerup", onUp);
    body.removeEventListener("pointercancel", onUp);
    try { body.releasePointerCapture(event.pointerId); } catch (error) { /* ignore */ }
    body.classList.remove("is-grabbing");
    commitRegion(track, previewStart, len, offset);
  };
  body.addEventListener("pointermove", onMove);
  body.addEventListener("pointerup", onUp);
  body.addEventListener("pointercancel", onUp);
}

// Live drag feedback: move the block + handles and repaint the window cells.
function updateRegionPreviewBlock(row, track, start, len) {
  const cells = row.querySelectorAll(".step-cell");
  cells.forEach((cell, index) => {
    const inside = index >= start && index < start + len;
    if (track.region) {
      cell.classList.toggle("in-region", inside);
    } else {
      cell.classList.toggle("out-region", !inside);
    }
  });
  const leftPx = 128 + start * STEP_W;
  const widthPx = len * STEP_W;
  const body = row.querySelector(".region-body");
  const leftHandle = row.querySelector(".region-handle-left");
  const rightHandle = row.querySelector(".region-handle-right");
  if (body) {
    body.style.left = `${leftPx}px`;
    body.style.width = `${widthPx}px`;
  }
  if (leftHandle) {
    leftHandle.style.left = `${leftPx - 6}px`;
  }
  if (rightHandle) {
    rightHandle.style.left = `${leftPx + widthPx - 6}px`;
  }
}

// Snap to bars, grow the song if the clip runs past the end, and re-tile the region.
function commitRegion(track, start, len, offset) {
  const minLen = regionMinLen(track);
  let startPos = Math.max(0, Math.round((start || 0) / STEPS_PER_BAR) * STEPS_PER_BAR);
  len = Math.max(minLen, Math.round((len || minLen) / STEPS_PER_BAR) * STEPS_PER_BAR);
  len = Math.min(len, MAX_BARS * STEPS_PER_BAR);
  const neededBars = Math.ceil((startPos + len) / STEPS_PER_BAR);
  if (neededBars > state.bars) {
    setBars(neededBars); // drag past the end grows the song
  }
  const total = totalSteps();
  startPos = Math.min(startPos, Math.max(0, total - minLen));
  track.regionStart = startPos;
  track.regionLen = Math.min(len, total - startPos);
  track.regionOffset = offset || 0;
  if (track.region) {
    retileRegion(track);
  }
  renderSequencer();
  const bars = Math.round(track.regionLen / STEPS_PER_BAR);
  const startBar = Math.round(track.regionStart / STEPS_PER_BAR) + 1;
  elements.statusText.textContent = `Clip: ${bars} bar${bars === 1 ? "" : "s"} @ bar ${startBar}`;
}

// Re-tile every region (e.g. after the global tempo changes) so each keeps its own tempo.
function retileAllRegions() {
  let changed = false;
  state.seqTracks.forEach((track) => {
    if (track.region) {
      retileRegion(track);
      changed = true;
    }
  });
  if (changed) {
    renderSequencer();
  }
}

/* ---------- Genre-authentic randomization ---------- */
function chance(probability) {
  return Math.random() < probability;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function withChance(steps, candidates, probability) {
  const result = steps.slice();
  candidates.forEach((step) => {
    if (chance(probability) && !result.includes(step)) {
      result.push(step);
    }
  });
  return result;
}

// Assemble a full-song track: perBar(section, absBar, barInSection, isLast) => { steps, notes }.
function buildTrack(instrumentId, base, form, perBar) {
  const pattern = [];
  const stepNotes = {};
  let bar = 0;
  form.forEach((section) => {
    for (let b = 0; b < section.bars; b += 1, bar += 1) {
      const info = perBar(section.name, bar, b, b === section.bars - 1) || {};
      const steps = info.steps || [];
      const notes = info.notes || null;
      const barBase = bar * STEPS_PER_BAR;
      const barPattern = new Array(STEPS_PER_BAR).fill(0);
      steps.forEach((s) => {
        if (s >= 0 && s < STEPS_PER_BAR) {
          barPattern[s] = 1;
          if (notes && notes[s]) {
            stepNotes[barBase + s] = notes[s];
          }
        }
      });
      barPattern.forEach((value) => pattern.push(value));
    }
  });
  return makeTrack(instrumentId, {
    piece: base.piece || null,
    notes: base.notes || null,
    pattern,
    stepNotes: Object.keys(stepNotes).length ? stepNotes : null
  });
}

function formBars(form) {
  return form.reduce((total, section) => total + section.bars, 0);
}

/* ---------- Real human voice (SpeechSynthesis) ---------- */
function pickAutoVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    return;
  }
  state.voice = voices.find((v) => /en[-_]?(US|GB)/i.test(v.lang) && /female|samantha|zira|google|aria/i.test(v.name))
    || voices.find((v) => /^en/i.test(v.lang))
    || voices[0];
}

function buildVoiceCatalog() {
  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter((v) => /^en/i.test(v.lang));
  const others = voices.filter((v) => !/^en/i.test(v.lang));
  const pool = english.concat(others);
  const pitches = [
    { k: "SubDeep", v: 0.4 }, { k: "Deep", v: 0.6 }, { k: "Low", v: 0.8 }, { k: "MidLow", v: 0.95 },
    { k: "Mid", v: 1.1 }, { k: "High", v: 1.3 }, { k: "Higher", v: 1.55 }, { k: "Soprano", v: 1.8 }
  ];
  const rates = [
    { k: "Slow", v: 0.8 }, { k: "Relaxed", v: 0.92 }, { k: "Talk", v: 1.05 }, { k: "Brisk", v: 1.18 }, { k: "Fast", v: 1.3 }, { k: "Rap", v: 1.45 }
  ];
  const catalog = [];
  for (const voice of pool) {
    const shortName = voice.name.replace(/Microsoft |Google |Apple /gi, "").split(/[ (]/)[0];
    for (const pitch of pitches) {
      for (const rate of rates) {
        catalog.push({ voice, rate: rate.v, pitch: pitch.v, label: `${shortName} · ${pitch.k}/${rate.k}` });
        if (catalog.length >= 100) {
          return catalog;
        }
      }
    }
  }
  return catalog;
}

function syncVoiceSliders() {
  if (elements.vocalRate) {
    elements.vocalRate.value = String(state.vocalRate);
    elements.vocalRateValue.value = `${Number(state.vocalRate).toFixed(2)}x`;
  }
  if (elements.vocalPitch) {
    elements.vocalPitch.value = String(state.vocalPitch);
    elements.vocalPitchValue.value = Number(state.vocalPitch).toFixed(1);
  }
  if (elements.vocalVolume) {
    elements.vocalVolume.value = String(state.vocalVolume);
    elements.vocalVolumeValue.value = `${Math.round(state.vocalVolume * 100)}%`;
  }
  if (elements.vocalVariation) {
    elements.vocalVariation.value = String(state.vocalVariation);
    elements.vocalVariationValue.value = `${Math.round(state.vocalVariation * 100)}%`;
  }
  if (elements.vocalVibrato) {
    elements.vocalVibrato.value = String(state.vocalVibrato);
    elements.vocalVibratoValue.value = `${Math.round(state.vocalVibrato * 100)}%`;
  }
}

function populateVoices() {
  if (!("speechSynthesis" in window)) {
    return;
  }
  state.voiceCatalog = buildVoiceCatalog();
  fillVoiceSelect(elements.voiceSelect);
  fillVoiceSelect(elements.bandVoiceSelect);
}

function fillVoiceSelect(select) {
  if (!select) {
    return;
  }
  const current = select.value || "auto";
  select.innerHTML = "";
  select.append(new Option("Auto Voice", "auto"));
  select.append(new Option("Random Mix", "random"));
  state.voiceCatalog.forEach((preset, index) => {
    select.append(new Option(`${String(index + 1).padStart(3, "0")} · ${preset.label}`, `cat:${index}`));
  });
  if ([...select.options].some((option) => option.value === current)) {
    select.value = current;
  }
}

function applyVoiceSelection(value) {
  if (value === "auto") {
    state.voiceMode = "auto";
    pickAutoVoice();
  } else if (value === "random") {
    state.voiceMode = "random";
  } else if (value.startsWith("cat:")) {
    const preset = state.voiceCatalog[Number(value.slice(4))];
    if (preset) {
      state.voiceMode = "fixed";
      state.voice = preset.voice;
      state.vocalRate = preset.rate;
      state.vocalPitch = preset.pitch;
      syncVoiceSliders();
    }
  } else {
    state.voiceMode = "fixed";
    const chosen = window.speechSynthesis.getVoices()[Number(value)];
    if (chosen) {
      state.voice = chosen;
    }
  }
  syncVoiceSelects(value);
}

function syncVoiceSelects(value) {
  [elements.voiceSelect, elements.bandVoiceSelect].forEach((select) => {
    if (select && select.value !== value && [...select.options].some((option) => option.value === value)) {
      select.value = value;
    }
  });
}

function onVoiceChange() {
  applyVoiceSelection(elements.voiceSelect.value);
}

function onBandVoiceChange() {
  applyVoiceSelection(elements.bandVoiceSelect.value);
  selectInstrument("vocals");
}

/* ---------- Voice delivery styles (Rap, Singing, etc.) ---------- */
const VOICE_STYLES = {
  natural: { rate: 0.95, pitch: 1.0, volume: 0.95, variation: 0.12, vibrato: 0 },
  rap: { rate: 1.3, pitch: 0.85, volume: 1.0, variation: 0.06, vibrato: 0 },
  sing: { rate: 0.8, pitch: 1.35, volume: 1.0, variation: 0.18, vibrato: 0.4 },
  croon: { rate: 0.78, pitch: 1.15, volume: 0.9, variation: 0.2, vibrato: 0.55 },
  opera: { rate: 0.7, pitch: 1.5, volume: 1.0, variation: 0.28, vibrato: 0.85 },
  soft: { rate: 0.9, pitch: 1.05, volume: 0.55, variation: 0.14, vibrato: 0.2 },
  powerful: { rate: 0.92, pitch: 1.2, volume: 1.0, variation: 0.22, vibrato: 0.3 },
  announcer: { rate: 0.95, pitch: 0.8, volume: 1.0, variation: 0.05, vibrato: 0 },
  robot: { rate: 1.0, pitch: 0.5, volume: 0.95, variation: 0, vibrato: 0 },
  whisper: { rate: 0.9, pitch: 1.1, volume: 0.4, variation: 0.1, vibrato: 0 },
  deep: { rate: 0.85, pitch: 0.55, volume: 1.0, variation: 0.1, vibrato: 0 },
  monster: { rate: 0.7, pitch: 0.35, volume: 1.0, variation: 0.15, vibrato: 0.25 },
  baby: { rate: 1.15, pitch: 1.75, volume: 0.9, variation: 0.2, vibrato: 0 },
  chipmunk: { rate: 1.4, pitch: 1.8, volume: 0.95, variation: 0.1, vibrato: 0 }
};

function applyVoiceStyle(styleId) {
  const preset = VOICE_STYLES[styleId] || VOICE_STYLES.natural;
  state.voiceStyle = styleId;
  state.vocalRate = preset.rate;
  state.vocalPitch = preset.pitch;
  state.vocalVolume = preset.volume;
  if (preset.variation !== undefined) {
    state.vocalVariation = preset.variation;
  }
  if (preset.vibrato !== undefined) {
    state.vocalVibrato = preset.vibrato;
  }
  syncVoiceSliders();
}

function initVoices() {
  if (!("speechSynthesis" in window)) {
    return;
  }
  const load = () => {
    if (!window.speechSynthesis.getVoices().length) {
      return;
    }
    if (state.voiceMode === "auto") {
      pickAutoVoice();
    }
    populateVoices();
  };
  load();
  window.speechSynthesis.onvoiceschanged = load;
}

function speakLine(text, pitch) {
  if (!("speechSynthesis" in window) || !text) {
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    let rate = state.vocalRate || 0.95;
    let voice = state.voice;
    let basePitch = (pitch || 1) * (state.vocalPitch || 1);
    // Humanize each line so it doesn't sound flat/robotic: jitter pitch + rate a little,
    // and add extra pitch wobble for the vibrato setting.
    const variation = state.vocalVariation || 0;
    const vibrato = state.vocalVibrato || 0;
    if (variation || vibrato) {
      const amount = variation + vibrato * 0.25;
      basePitch += (Math.random() * 2 - 1) * amount;
      rate *= 1 + (Math.random() * 2 - 1) * variation * 0.3;
    }
    // Sine sound curve: shape the pitch as a sine wave that rises and falls across the lines.
    if (state.voiceSineDepth > 0) {
      state.voiceSinePhase = (state.voiceSinePhase || 0) + (state.voiceSineRate || 0.5) * Math.PI;
      basePitch += state.voiceSineDepth * 0.6 * Math.sin(state.voiceSinePhase);
    }
    if (state.voiceMode === "random") {
      const all = window.speechSynthesis.getVoices();
      const english = all.filter((v) => /^en/i.test(v.lang));
      const pool = english.length ? english : all;
      if (pool.length) {
        voice = pool[Math.floor(Math.random() * pool.length)];
      }
      basePitch = 0.6 + Math.random() * 1.2;
    }
    utterance.rate = Math.max(0.3, Math.min(2, rate));
    utterance.volume = state.vocalVolume;
    utterance.pitch = Math.max(0, Math.min(2, basePitch));
    if (voice) {
      utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    /* ignore speech errors */
  }
}

function toggleVocals() {
  state.vocalsOn = !state.vocalsOn;
  elements.vocalsToggle.setAttribute("aria-pressed", String(state.vocalsOn));
  if (!state.vocalsOn && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/* ---------- Lyrics (original, royalty-free) ---------- */
const LYRICS = {
  pop: { verse: ["I've been waiting for the sunrise", "Every heartbeat feels alive", "Dancing shadows on the wall"], hook: ["This is our moment tonight", "Oh, we are shining so bright", "Never gonna let it go"] },
  dance: { verse: ["Feel the rhythm in your body", "Hands up, reaching for the sky", "The night is only starting"], hook: ["Turn it up and let it play", "We could dance until the day", "Feel the beat, don't stop now"] },
  hiphop: { verse: ["Started from the corner block", "Words hit heavy like a rock", "Grind never stop, watch the clock"], hook: ["We keep rolling, stay true", "This the sound of something new", "Turn it loud, feel the groove"] },
  rnb: { verse: ["Slow it down and hold me closer", "Whisper softly in the dark", "Every touch a little warmer"], hook: ["Baby you're my melody", "Stay right here, close to me", "Feel this love wash over me"] },
  soul: { verse: ["Been down but I am rising", "Gospel in my beating heart", "Truth is worth the fighting"], hook: ["Lift me higher, take me home", "I will never walk alone", "Feel it deep down in my soul"] },
  rock: { verse: ["Engine roaring down the highway", "Thunder rolling in my chest", "Nothing gonna slow me down"], hook: ["We are electric tonight", "Turn it up and hold on tight", "Rock and roll will never die"] },
  metal: { verse: ["Steel and fire in the darkness", "Rising from the ashes cold", "Break the chains that bind us"], hook: ["Stand and fight, we won't fall", "Raise your fist above it all", "Hear the thunder, feel the call"] },
  punk: { verse: ["Kicking down the same old doors", "Shouting loud, we won't conform", "Three chords and the honest truth"], hook: ["We won't back down, no", "Scream it out and let it go", "This is our anthem now"] },
  country: { verse: ["Dirt road winding back home", "Old truck and a fading song", "Fields of gold beneath the sun"], hook: ["Take me back where I belong", "Sing it loud and sing it strong", "Home is calling me along"] },
  folk: { verse: ["Quiet morning by the river", "Stories carried on the wind", "Simple times we won't forget"], hook: ["Sing along, everyone", "Underneath the setting sun", "We'll be here when day is done"] },
  blues: { verse: ["Woke up to an empty morning", "Rain keeps falling on my door", "Been walking this road so long"], hook: ["Oh, these blues won't let me be", "Somebody come rescue me", "Lord, I have paid my dues"] },
  jazz: { verse: ["Midnight in a smoky room", "Notes are floating soft and blue", "Time slows down to a swing"], hook: ["Doo ba doo, feel the swing", "Let the saxophone sing", "Snap along to everything"] },
  latin: { verse: ["Bajo la luna bailamos", "Corazon, sigue el ritmo", "Fuego en la noche caliente"], hook: ["Baila, baila, mi amor", "Siente el ritmo del tambor", "Vamos todos a bailar"] },
  afro: { verse: ["Sunrise over the city", "Drums are calling everyone", "Move your feet to the rhythm"], hook: ["We are vibing all night long", "Sing this celebration song", "Feel the groove and come along"] },
  reggae: { verse: ["Sunshine on a lazy morning", "One love in the air we breathe", "Riddim easy, feeling irie"], hook: ["Every little thing's alright", "Dance under the moonlight", "One heart, we unite"] },
  synth: { verse: ["Neon lights on empty streets", "Driving through the midnight glow", "Echoes of a distant dream"], hook: ["We are lost inside the night", "Chasing that electric light", "Hold the feeling, don't let go"] },
  oohs: { verse: ["Ooooooh", "Aaaaaah", "Mmmmmm"], hook: ["Aaaah, ooooh", "La la la la la", "Oooh, aaaah"] }
};

/* ---------- Big pool of many different lyrics for manual vocal tracks ---------- */
const AD_LIBS = ["Hey!", "Oh yeah", "Come on", "Sing it out", "Woah oh oh", "Let it go", "One more time", "Feel it now", "Alright now", "Here we go", "Na na na na", "Yeah yeah yeah"];
const BIG_LYRICS = Object.values(LYRICS).reduce((all, theme) => all.concat(theme.verse, theme.hook), []).concat(AD_LIBS);

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/* ---------- Chord progressions (bass root + chord voicing) ---------- */
const CH = (bass, notes) => ({ bass, notes });
const PROG = {
  pop: [CH("C2", ["C3", "E3", "G3"]), CH("G2", ["G3", "B3", "D4"]), CH("A2", ["A3", "C4", "E4"]), CH("F2", ["F3", "A3", "C4"])],
  fifties: [CH("C2", ["C3", "E3", "G3"]), CH("A2", ["A3", "C4", "E4"]), CH("F2", ["F3", "A3", "C4"]), CH("G2", ["G3", "B3", "D4"])],
  doowop: [CH("C2", ["C3", "E3", "G3"]), CH("A2", ["A3", "C4", "E4"]), CH("F2", ["F3", "A3", "C4"]), CH("G2", ["G3", "B3", "D4"])],
  minor: [CH("A2", ["A3", "C4", "E4"]), CH("F2", ["F3", "A3", "C4"]), CH("C2", ["C3", "E3", "G3"]), CH("G2", ["G3", "B3", "D4"])],
  edm: [CH("A2", ["A3", "C4", "E4"]), CH("F2", ["F3", "A3", "C4"]), CH("C2", ["C3", "E3", "G3"]), CH("G2", ["G3", "B3", "D4"])],
  blues: [CH("C2", ["C3", "E3", "G3", "Bb3"]), CH("F2", ["F3", "A3", "C4", "Eb4"]), CH("C2", ["C3", "E3", "G3", "Bb3"]), CH("G2", ["G3", "B3", "D4", "F4"])],
  jazz: [CH("D2", ["D3", "F3", "A3", "C4"]), CH("G2", ["G3", "B3", "D4", "F4"]), CH("C2", ["C3", "E3", "G3", "B3"]), CH("C2", ["C3", "E3", "G3", "B3"])],
  latin: [CH("A2", ["A3", "C4", "E4"]), CH("E2", ["E3", "G#3", "B3"]), CH("F2", ["F3", "A3", "C4"]), CH("E2", ["E3", "G#3", "B3"])],
  reggae: [CH("A2", ["A3", "C4", "E4"]), CH("D2", ["D3", "F3", "A3"]), CH("E2", ["E3", "G3", "B3"]), CH("A2", ["A3", "C4", "E4"])],
  folk: [CH("G2", ["G3", "B3", "D4"]), CH("C3", ["C3", "E3", "G3"]), CH("D2", ["D3", "F#3", "A3"]), CH("G2", ["G3", "B3", "D4"])]
};

/* ---------- Drum kits ---------- */
const KIT = {
  fourfloor: { kick: [0, 4, 8, 12], snare: [4, 12], hats: [2, 6, 10, 14], hatsC: [0, 2, 4, 6, 8, 10, 12, 14], fill: true },
  backbeat: { kick: [0, 8], kickC: [0, 8, 11], snare: [4, 12], hats: [0, 2, 4, 6, 8, 10, 12, 14], fill: true },
  rock: { kick: [0, 8, 11], kickC: [0, 3, 8, 11], snare: [4, 12], hats: [0, 2, 4, 6, 8, 10, 12, 14], fill: true },
  punk: { kick: [0, 2, 4, 6, 8, 10, 12, 14], snare: [4, 12], hats: [0, 2, 4, 6, 8, 10, 12, 14], fill: true },
  boombap: { kick: [0, 8], kickC: [0, 6, 8], snare: [4, 12], hats: [0, 2, 4, 6, 8, 10, 12, 14], fill: false },
  trap: { kick: [0, 10], kickC: [0, 7, 10], snare: [8], hats: [0, 2, 3, 4, 6, 8, 10, 11, 12, 14, 15], fill: false },
  trainbeat: { kick: [0, 8], snare: [4, 12], snareC: [0, 2, 4, 6, 8, 10, 12, 14], hats: [0, 2, 4, 6, 8, 10, 12, 14], fill: true },
  swing: { jazz: true, ride: [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15], kick: [0, 8], snare: [4, 12] },
  reggae: { kick: [8], snare: [8], hats: [2, 6, 10, 14], fill: false },
  ambient: { kick: [0], kickC: [0, 8], snare: [], hats: [], hatsC: [8], fill: false }
};

/* ---------- Song builders ---------- */
function raiseOctave(note) {
  return noteFromMidi(midiFromNote(note) + 12);
}

function buildForm(targetBars) {
  const form = [];
  let remaining = Math.max(4, targetBars);
  const push = (name, count) => {
    if (remaining <= 0) { return; }
    const take = Math.min(count, remaining);
    form.push({ name, bars: take });
    remaining -= take;
  };
  push("intro", 2);
  let toggle = 0;
  while (remaining > 2) {
    push(toggle % 2 === 0 ? "verse" : "chorus", 4);
    toggle += 1;
  }
  if (remaining > 0) {
    push("outro", remaining);
  }
  return form;
}

function chosenSongLength(profile) {
  const value = elements.songLength ? elements.songLength.value : "auto";
  if (value === "auto") {
    return profile.bars || 24;
  }
  return Math.max(4, Math.min(MAX_BARS, Number(value)));
}

function buildDrums(kit, form) {
  if (kit.jazz) {
    return [
      buildTrack("drums", { piece: "hihat" }, form, () => ({ steps: kit.ride })),
      buildTrack("drums", { piece: "kick" }, form, () => ({ steps: kit.kick })),
      buildTrack("drums", { piece: "snare" }, form, (s, bar, b, last) => ({ steps: last ? [4, 12, 14, 15] : kit.snare }))
    ];
  }
  const busy = (s) => s === "chorus" || s === "hook";
  const out = [];
  out.push(buildTrack("drums", { piece: "kick" }, form, (s) => ({ steps: busy(s) && kit.kickC ? kit.kickC : kit.kick })));
  out.push(buildTrack("drums", { piece: "snare" }, form, (s, bar, b, last) => {
    let base = busy(s) && kit.snareC ? kit.snareC : kit.snare;
    if (last && kit.fill) {
      base = base.concat([13, 14, 15]);
    }
    return { steps: base };
  }));
  if ((kit.hats && kit.hats.length) || (kit.hatsC && kit.hatsC.length)) {
    out.push(buildTrack("drums", { piece: "hihat" }, form, (s) => ({ steps: busy(s) && kit.hatsC ? kit.hatsC : (kit.hats || []) })));
  }
  return out;
}

function buildBass(style, form, chordAt) {
  if (style === "none") {
    return null;
  }
  if (style === "walking") {
    return buildTrack("bass", { notes: ["C2"] }, form, (s, bar) => {
      const chord = chordAt(bar);
      const tones = [chord.bass, chord.notes[0], chord.notes[1], chord.notes[2] || chord.bass];
      const notes = {};
      [0, 4, 8, 12].forEach((st, i) => { notes[st] = [tones[i]]; });
      return { steps: [0, 4, 8, 12], notes };
    });
  }
  const byStyle = {
    root8: [0, 2, 4, 6, 8, 10, 12, 14],
    quarter: [0, 4, 8, 12],
    sub: [0, 10],
    offbeat: [2, 6, 10, 14],
    syncop: [0, 3, 6, 8, 11, 14]
  };
  const steps = byStyle[style] || byStyle.quarter;
  return buildTrack("bass", { notes: ["C2"] }, form, (s, bar) => {
    const chord = chordAt(bar);
    const notes = {};
    steps.forEach((st) => { notes[st] = [chord.bass]; });
    return { steps, notes };
  });
}

function buildChords(inst, style, form, chordAt) {
  if (style === "none") {
    return null;
  }
  const rhythm = { pad: [0], half: [0, 8], strum: [0, 2, 4, 6, 8, 10, 12, 14], stab: [2, 6, 10, 14], arp: [0, 2, 4, 6, 8, 10, 12, 14] };
  const steps = rhythm[style] || rhythm.half;
  return buildTrack(inst, { notes: ["C3", "E3", "G3"] }, form, (s, bar) => {
    const chord = chordAt(bar);
    if (style === "arp") {
      const notes = {};
      steps.forEach((st, i) => { notes[st] = [chord.notes[i % chord.notes.length]]; });
      return { steps, notes };
    }
    if (s === "intro" && style !== "pad") {
      return { steps: [0], notes: { 0: chord.notes } };
    }
    const notes = {};
    steps.forEach((st) => { notes[st] = chord.notes; });
    return { steps, notes };
  });
}

function buildLead(inst, form, chordAt) {
  return buildTrack(inst, { notes: ["C4"] }, form, (s, bar, b) => {
    if (s !== "chorus" && s !== "solo" && s !== "hook" && s !== "head") {
      return null;
    }
    const tones = chordAt(bar).notes;
    const steps = [0, 4, 8, 12].filter(() => chance(0.7));
    const notes = {};
    steps.forEach((st, i) => { notes[st] = [raiseOctave(tones[(b + i) % tones.length])]; });
    return { steps, notes };
  });
}

function buildVocals(theme, form) {
  const custom = elements.songLyrics ? parseLyrics(elements.songLyrics.value) : [];
  const lines = LYRICS[theme] || LYRICS.pop;
  const length = formBars(form) * STEPS_PER_BAR;
  const pattern = new Array(length).fill(0);
  const stepText = {};
  let bar = 0;
  let verseIndex = 0;
  let hookIndex = 0;
  let customIndex = 0;
  form.forEach((section) => {
    for (let b = 0; b < section.bars; b += 1, bar += 1) {
      const singingSection = ["verse", "chorus", "hook", "head"].includes(section.name);
      if (singingSection && b % 2 === 0) {
        const base = bar * STEPS_PER_BAR;
        pattern[base] = 1;
        if (custom.length) {
          stepText[base] = custom[customIndex % custom.length];
          customIndex += 1;
        } else {
          const isChorus = section.name === "chorus" || section.name === "hook";
          const pool = isChorus ? lines.hook : lines.verse;
          stepText[base] = pool[(isChorus ? hookIndex++ : verseIndex++) % pool.length];
        }
      }
    }
  });
  const track = makeTrack("vocals", { pattern });
  track.stepText = stepText;
  track.vocalPitch = 1;
  return track;
}

function buildSongFromProfile(profile) {
  const bars = chosenSongLength(profile);
  const form = buildForm(bars);
  const prog = PROG[profile.progression] || PROG.pop;
  const chordAt = (bar) => prog[bar % prog.length];
  const tempo = Math.max(60, Math.round(randInt(profile.tempo[0], profile.tempo[1]) * 0.85));
  const tracks = [];

  buildDrums(KIT[profile.kit] || KIT.backbeat, form).forEach((track) => tracks.push(track));

  const bassTrack = buildBass(profile.bass || "quarter", form, chordAt);
  if (bassTrack) {
    tracks.push(bassTrack);
  }
  const chordTrack = buildChords(profile.chordInst || "piano", profile.chord || "half", form, chordAt);
  if (chordTrack) {
    tracks.push(chordTrack);
  }
  if (profile.pad) {
    const padTrack = buildChords(profile.pad, "pad", form, chordAt);
    if (padTrack) {
      tracks.push(padTrack);
    }
  }
  if (profile.lead) {
    tracks.push(buildLead(profile.lead, form, chordAt));
  }
  if (profile.lyrics) {
    tracks.push(buildVocals(profile.lyrics, form));
  }

  return { name: profile.name, group: profile.group, tempo, swing: profile.swing || 0, bars: formBars(form), tracks };
}

/* ---------- Genre / subgenre profiles ---------- */
const genreProfiles = {
  "contemporary-pop": { name: "Contemporary Pop", group: "Pop & Dance", tempo: [100, 120], swing: 0.02, kit: "fourfloor", bass: "root8", chord: "half", chordInst: "piano", progression: "pop", lead: "flute", lyrics: "pop", bars: 24 },
  "synthpop": { name: "Synthpop / Electropop", group: "Pop & Dance", tempo: [110, 128], swing: 0, kit: "fourfloor", bass: "root8", chord: "arp", chordInst: "organ", progression: "minor", pad: "organ", lyrics: "synth", bars: 24 },
  "kpop": { name: "K-Pop / J-Pop", group: "Pop & Dance", tempo: [110, 130], swing: 0.02, kit: "fourfloor", bass: "root8", chord: "stab", chordInst: "piano", progression: "pop", lead: "saxophone", lyrics: "dance", bars: 24 },
  "edm": { name: "EDM", group: "Pop & Dance", tempo: [122, 130], swing: 0, kit: "fourfloor", bass: "root8", chord: "arp", chordInst: "organ", progression: "edm", pad: "violin", lyrics: "dance", bars: 24 },
  "hiphop": { name: "Hip-Hop / Rap", group: "Hip-Hop & R&B", tempo: [86, 96], swing: 0.18, kit: "boombap", bass: "sub", chord: "stab", chordInst: "piano", progression: "minor", lyrics: "hiphop", bars: 24 },
  "rnb": { name: "Contemporary R&B", group: "Hip-Hop & R&B", tempo: [72, 92], swing: 0.16, kit: "boombap", bass: "syncop", chord: "half", chordInst: "piano", progression: "doowop", lead: "saxophone", lyrics: "rnb", bars: 24 },
  "soul": { name: "Soul / Neo-Soul", group: "Hip-Hop & R&B", tempo: [82, 100], swing: 0.12, kit: "backbeat", bass: "syncop", chord: "half", chordInst: "organ", progression: "doowop", lead: "trumpet", lyrics: "soul", bars: 24 },
  "classic-rock": { name: "Classic Rock", group: "Rock & Metal", tempo: [120, 140], swing: 0, kit: "rock", bass: "quarter", chord: "strum", chordInst: "guitar-electric", progression: "pop", lead: "guitar-electric", lyrics: "rock", bars: 24 },
  "alt-indie": { name: "Alternative / Indie", group: "Rock & Metal", tempo: [110, 135], swing: 0, kit: "backbeat", bass: "root8", chord: "strum", chordInst: "guitar-electric", progression: "minor", lyrics: "rock", bars: 24 },
  "heavy-metal": { name: "Heavy Metal", group: "Rock & Metal", tempo: [140, 176], swing: 0, kit: "rock", bass: "root8", chord: "strum", chordInst: "guitar-electric", progression: "minor", lead: "guitar-electric", lyrics: "metal", bars: 24 },
  "punk": { name: "Punk Rock", group: "Rock & Metal", tempo: [158, 190], swing: 0, kit: "punk", bass: "root8", chord: "strum", chordInst: "guitar-electric", progression: "pop", lyrics: "punk", bars: 20 },
  "ambient": { name: "Ambient / Chillout", group: "Electronic & Ambient", tempo: [68, 90], swing: 0, kit: "ambient", bass: "quarter", chord: "pad", chordInst: "violin", progression: "minor", pad: "organ", lyrics: "oohs", bars: 16 },
  "lofi": { name: "Lo-Fi Beats", group: "Electronic & Ambient", tempo: [72, 86], swing: 0.24, kit: "boombap", bass: "quarter", chord: "half", chordInst: "piano", progression: "jazz", lyrics: "oohs", bars: 16 },
  "synthwave": { name: "Synthwave", group: "Electronic & Ambient", tempo: [100, 118], swing: 0, kit: "fourfloor", bass: "root8", chord: "arp", chordInst: "organ", progression: "minor", pad: "violin", lyrics: "synth", bars: 24 },
  "country": { name: "Country", group: "Traditional & Roots", tempo: [104, 130], swing: 0.12, kit: "trainbeat", bass: "quarter", chord: "strum", chordInst: "guitar-acoustic", progression: "folk", lead: "violin", lyrics: "country", bars: 24 },
  "folk": { name: "Folk / Acoustic", group: "Traditional & Roots", tempo: [92, 118], swing: 0.06, kit: "backbeat", bass: "quarter", chord: "strum", chordInst: "guitar-acoustic", progression: "folk", lead: "flute", lyrics: "folk", bars: 20 },
  "blues": { name: "Blues", group: "Traditional & Roots", tempo: [80, 110], swing: 0.33, kit: "swing", bass: "walking", chord: "strum", chordInst: "guitar-electric", progression: "blues", lead: "guitar-electric", lyrics: "blues", bars: 24 },
  "classical": { name: "Classical", group: "Jazz & Classical", tempo: [80, 120], swing: 0, kit: "ambient", bass: "quarter", chord: "pad", chordInst: "violin", progression: "fifties", pad: "cello", lead: "flute", lyrics: "oohs", bars: 24 },
  "jazz": { name: "Jazz", group: "Jazz & Classical", tempo: [120, 160], swing: 0.4, kit: "swing", bass: "walking", chord: "stab", chordInst: "piano", progression: "jazz", lead: "saxophone", lyrics: "jazz", bars: 28 },
  "latin": { name: "Latin", group: "Global & Regional", tempo: [92, 112], swing: 0.08, kit: "fourfloor", bass: "syncop", chord: "stab", chordInst: "piano", progression: "latin", lead: "trumpet", lyrics: "latin", bars: 24 },
  "afrobeats": { name: "Afrobeats", group: "Global & Regional", tempo: [100, 116], swing: 0.1, kit: "fourfloor", bass: "syncop", chord: "stab", chordInst: "guitar-electric", progression: "minor", lyrics: "afro", bars: 24 },
  "reggae": { name: "Reggae / Dancehall", group: "Global & Regional", tempo: [70, 92], swing: 0.1, kit: "reggae", bass: "offbeat", chord: "stab", chordInst: "organ", progression: "reggae", lead: "trumpet", lyrics: "reggae", bars: 24 }
};

function randomizeSequencer() {
  const choice = elements.genreSelect ? elements.genreSelect.value : "random";
  const ids = Object.keys(genreProfiles);
  const profileId = choice === "random" || !genreProfiles[choice] ? pick(ids) : choice;
  const profile = genreProfiles[profileId];

  const result = buildSongFromProfile(profile);
  state.bars = Math.min(MAX_BARS, result.bars);
  state.seqTracks = result.tracks;
  state.nextStep = 0;
  elements.tempo.value = String(result.tempo);
  elements.swingMix.value = String(result.swing);
  updateControlLabels();
  updateBarCount();
  if (state.ready) {
    Tone.Transport.bpm.rampTo(result.tempo, 0.1);
    Tone.Transport.swing = result.swing;
    preloadInstruments();
  }
  renderSequencer();
  showGenre(result.name, result.bars);
}

function showGenre(name, bars) {
  if (elements.randomGenre) {
    elements.randomGenre.textContent = bars ? `${name} · ${bars} bars` : name;
  }
  elements.statusText.textContent = `Song · ${name}`;
  window.clearTimeout(state.genreStatusTimer);
  state.genreStatusTimer = window.setTimeout(updateLoadingStatus, 1800);
}

/* ---------- Timeline length ---------- */
function updateBarCount() {
  if (elements.barCount) {
    elements.barCount.textContent = `${state.bars} bars`;
  }
  if (elements.barsInput) {
    elements.barsInput.value = String(state.bars);
  }
}

function setBars(bars) {
  const clamped = Math.max(2, Math.min(MAX_BARS, bars));
  if (clamped === state.bars) {
    return;
  }
  state.bars = clamped;
  const length = totalSteps();
  state.seqTracks.forEach((track) => {
    if (track.pattern.length < length) {
      track.pattern = track.pattern.concat(new Array(length - track.pattern.length).fill(0));
    } else if (track.pattern.length > length) {
      track.pattern = track.pattern.slice(0, length);
      if (track.stepNotes) {
        Object.keys(track.stepNotes).forEach((keyStep) => {
          if (Number(keyStep) >= length) {
            delete track.stepNotes[keyStep];
          }
        });
      }
    }
    if (track.region) {
      const startPos = Math.max(0, Math.min(track.regionStart || 0, Math.max(0, length - STEPS_PER_BAR)));
      track.regionStart = startPos;
      if (startPos + (track.regionLen || 0) > length) {
        track.regionLen = Math.max(STEPS_PER_BAR, length - startPos);
      }
      retileRegion(track);
    } else if (track.regionLen != null) {
      // Keep a trimmed plain track's window inside the (possibly shrunk) timeline.
      const startPos = Math.max(0, Math.min(track.regionStart || 0, Math.max(0, length - STEPS_PER_BAR)));
      track.regionStart = startPos;
      if (startPos + track.regionLen > length) {
        track.regionLen = Math.max(STEPS_PER_BAR, length - startPos);
      }
    }
  });
  if (state.nextStep >= length) {
    state.nextStep = 0;
  }
  updateBarCount();
  renderSequencer();
}

function addBars(amount) {
  setBars(state.bars + amount);
}

function clearSequencer() {
  const length = totalSteps();
  state.seqTracks.forEach((track) => {
    track.pattern = new Array(length).fill(0);
    track.stepNotes = null;
  });
  renderSequencer();
}

/* ---------- Transport ---------- */
async function toggleTransport() {
  const canPlay = await startAudio();
  if (!canPlay) {
    return;
  }
  if (!state.repeatId) {
    state.repeatId = Tone.Transport.scheduleRepeat(onTick, "16n");
  }
  if (state.isPlaying) {
    stopTransport();
    return;
  }
  state.nextStep = 0;
  state.isPlaying = true;
  Tone.Transport.start("+0.05");
  elements.statusText.textContent = state.isRecording ? "Recording" : "Playing";
  renderPlayButton();
}

function stopTransport() {
  if (state.ready) {
    Tone.Transport.stop();
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  state.isPlaying = false;
  state.nextStep = 0;
  setActiveStep(-1);
  if (state.isRecording) {
    toggleRecording();
  }
  state.silentRecord = false;
  elements.statusText.textContent = state.ready ? "Ready" : "Standby";
  elements.positionText.textContent = "1 : 1";
  renderPlayButton();
}

function renderPlayButton() {
  const label = state.isPlaying
    ? `<i data-lucide="pause"></i><span>Pause</span>`
    : `<i data-lucide="play"></i><span>Play</span>`;
  elements.playStop.innerHTML = label;
  if (elements.seqPlay) {
    elements.seqPlay.innerHTML = label;
  }
  refreshIcons();
}

function onTick(time) {
  const total = totalSteps();
  const step = state.nextStep % total;

  // While recording from a stopped state, keep the backing sequencer/song silent
  // so only the live performance is captured (record without playing the music).
  if (!state.silentRecord) {
    state.seqTracks.forEach((track) => {
      if (!track.pattern[step]) {
        return;
      }
      // Respect each track's trim/expand window: skip steps outside [start, start+len).
      if (track.regionLen != null) {
        const ws = track.regionStart || 0;
        if (step < ws || step >= ws + track.regionLen) {
          return;
        }
      }
      if (track.kind === "vocal") {
        if (state.vocalsOn) {
          let text = track.stepText && track.stepText[step];
          if (!text && track.lyricPool && track.lyricPool.length) {
            text = track.lyricPool[track.lyricIndex % track.lyricPool.length];
            track.lyricIndex = (track.lyricIndex || 0) + 1;
          }
          if (!text) {
            text = track.notes ? track.notes[0] : "la";
          }
          Tone.Draw.schedule(() => speakLine(text, track.vocalPitch || 1), time);
        }
        return;
      }
      if (track.kind === "drum") {
        playDrum(track.piece, time, 0.9);
      } else if (track.kind === "sample") {
        const tempoRate = track.tempo ? ((Number(elements.tempo.value) || 120) / track.tempo) : 1;
        playSampleRegion(track.instrumentId, time, tempoRate);
      } else {
        const notes = track.stepNotes && track.stepNotes[step] ? track.stepNotes[step] : track.notes;
        playInstrument(track.instrumentId, notes, track.duration, time, 0.8);
      }
    });
  }

  state.recordedEvents.forEach((event) => {
    if (event.step !== step) {
      return;
    }
    if (event.kind === "drum") {
      playDrum(event.drum, time, 0.8);
    } else {
      playInstrument(event.instrument, event.notes, event.duration, time, 0.75);
    }
  });

  if (state.metronomeOn) {
    const isDownbeat = step % 4 === 0;
    state.nodes.metronome.triggerAttackRelease(isDownbeat ? "C5" : "C4", "32n", time, isDownbeat ? 0.9 : 0.5);
  }

  Tone.Draw.schedule(() => {
    if (!state.isPlaying) {
      return;
    }
    setActiveStep(step);
    const bar = Math.floor(step / STEPS_PER_BAR) + 1;
    const beat = Math.floor((step % STEPS_PER_BAR) / 4) + 1;
    elements.positionText.textContent = `${bar} : ${beat}`;
  }, time);

  state.nextStep = (step + 1) % total;
}

/* ---------- Recording ---------- */
function updateRecordButtons() {
  const pressed = String(state.isRecording);
  if (elements.recordToggle) {
    elements.recordToggle.setAttribute("aria-pressed", pressed);
  }
  if (elements.seqRecord) {
    elements.seqRecord.setAttribute("aria-pressed", pressed);
  }
  document.body.classList.toggle("is-recording", state.isRecording);
}

function toggleRecording() {
  state.isRecording = !state.isRecording;
  updateRecordButtons();
  if (state.isRecording) {
    if (!state.isPlaying) {
      // Start the clock for timing but keep the backing music muted.
      state.silentRecord = true;
      toggleTransport();
    } else {
      // Already playing: overdub on top of the music that is running.
      state.silentRecord = false;
    }
    elements.statusText.textContent = "Recording";
    return;
  }
  const wasSilent = state.silentRecord;
  state.silentRecord = false;
  if (wasSilent && state.isPlaying) {
    stopTransport();
  }
  elements.statusText.textContent = state.isPlaying ? "Playing" : (state.ready ? "Ready" : "Standby");
  openDownloadModal();
}

function clearRecording() {
  state.recordedEvents = [];
  elements.statusText.textContent = state.ready ? "Ready" : "Standby";
}

function recordEvent(payload) {
  if (!state.isRecording || !state.isPlaying) {
    return;
  }
  state.recordedEvents.push({ ...payload, step: state.activeStep >= 0 ? state.activeStep : state.nextStep });
}

/* ---------- Metronome ---------- */
function toggleMetronome() {
  state.metronomeOn = !state.metronomeOn;
  elements.metronomeToggle.setAttribute("aria-pressed", String(state.metronomeOn));
}

/* ---------- Sound triggering ---------- */
function getInstrumentVoice(instrumentId) {
  const def = getInstrumentDef(instrumentId);
  if (def.recorded) {
    return state.sampleSamplers[instrumentId] || null;
  }
  const soundVoice = getSoundTypeVoice(instrumentId);
  if (soundVoice) {
    return soundVoice;
  }
  const entry = ensureInstrument(instrumentId);
  if (!entry) {
    return null;
  }
  if (entry.useFallback && entry.fallback) {
    return entry.fallback;
  }
  if (entry.sampler && entry.loaded) {
    return entry.sampler;
  }
  return null;
}

// ---- Sound Type: optionally re-voice melodic instruments with a synth timbre ----
// The #genSoundType dropdown ("Sampled (real)" by default) lets the player swap the real
// sampled tone of any melodic instrument for a synth timbre (electronic/techno/synth/retro/
// bass). "sampled" keeps the real Tone.Sampler. Drums, recorded samples and vocals are
// unaffected. The chosen synth is cached per instrument and routed through that instrument's
// mixer channel so volume/FX still apply.
function currentSoundType() {
  return elements.genSoundType ? elements.genSoundType.value : "sampled";
}

// Fill both Sound Type dropdowns (Band Instruments + Loop Sequencer) from SOUND_TYPE_OPTIONS.
function populateSoundTypeSelects() {
  [elements.genSoundType, elements.genSoundTypeSeq].forEach((select) => {
    if (!select) {
      return;
    }
    const current = select.value || "sampled";
    select.innerHTML = "";
    SOUND_TYPE_OPTIONS.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      select.append(option);
    });
    select.value = SOUND_TYPE_OPTIONS.some((opt) => opt.value === current) ? current : "sampled";
  });
}

function getSoundTypeVoice(instrumentId) {
  const def = getInstrumentDef(instrumentId);
  if (!def || !def.sample || def.sample.kind !== "melodic") {
    return null;
  }
  const soundType = currentSoundType();
  const soundDef = GEN_SOUND_TYPES[soundType];
  if (!soundDef) {
    return null;
  }
  const channel = state.channels[instrumentId];
  if (!channel) {
    return null;
  }
  const cached = state.soundTypeSynths[instrumentId];
  if (cached && cached.type === soundType) {
    return cached.synth;
  }
  if (cached) {
    disposeSoundTypeVoice(cached);
  }
  let dest = channel;
  let dist = null;
  if (soundDef.dist > 0) {
    dist = new Tone.Distortion({ distortion: soundDef.dist, wet: 0.5 }).connect(channel);
    dest = dist;
  }
  const synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: soundDef.osc }, envelope: soundDef.envelope }).connect(dest);
  synth.volume.value = soundDef.volume;
  state.soundTypeSynths[instrumentId] = { type: soundType, synth, dist };
  return synth;
}

function disposeSoundTypeVoice(entry) {
  if (!entry) {
    return;
  }
  try { entry.synth.dispose(); } catch (error) { /* ignore */ }
  if (entry.dist) {
    try { entry.dist.dispose(); } catch (error) { /* ignore */ }
  }
}

function disposeSoundTypeSynths() {
  Object.keys(state.soundTypeSynths).forEach((id) => {
    disposeSoundTypeVoice(state.soundTypeSynths[id]);
    delete state.soundTypeSynths[id];
  });
  if (state.soundTypeDrums) {
    disposeDrumKit(state.soundTypeDrums.kit);
    state.soundTypeDrums = null;
  }
}

// Build a synthesized drum kit for a sound type, routed through the drums mixer channel.
function buildSynthDrumKit(soundType, channel) {
  const k = DRUM_SYNTH_KITS[soundType] || DRUM_SYNTH_KITS[DRUM_KIT_ALIAS[soundType]] || DRUM_SYNTH_KITS.electronic;
  if (!k) {
    return null;
  }
  let dest = channel;
  let dist = null;
  if (k.dist > 0) {
    dist = new Tone.Distortion({ distortion: k.dist, wet: 0.5 }).connect(channel);
    dest = dist;
  }
  const kick = new Tone.MembraneSynth({ pitchDecay: k.pitchDecay, octaves: k.octaves, oscillator: { type: k.osc }, envelope: { attack: 0.001, decay: k.kickDecay, sustain: 0.02, release: 0.18 } }).connect(dest);
  const snare = new Tone.NoiseSynth({ noise: { type: k.snareType }, envelope: { attack: 0.001, decay: k.snareDecay, sustain: 0, release: 0.08 } }).connect(dest);
  const hatFilter = new Tone.Filter({ type: "highpass", frequency: k.hatFreq }).connect(dest);
  const hat = new Tone.NoiseSynth({ noise: { type: k.hatType }, envelope: { attack: 0.001, decay: k.hatDecay, sustain: 0, release: 0.02 } }).connect(hatFilter);
  const tom = new Tone.MembraneSynth({ pitchDecay: k.pitchDecay * 1.5, octaves: Math.max(3, k.octaves - 2), oscillator: { type: k.osc }, envelope: { attack: 0.001, decay: k.kickDecay * 0.7, sustain: 0.03, release: 0.16 } }).connect(dest);
  // Per-voice monotonic time guard so rapid/overlapping hits never schedule out of order.
  const last = new Map();
  const safeTime = (key, t) => {
    const at = t ?? Tone.now();
    const prev = last.get(key);
    const val = prev === undefined ? at : Math.max(at, prev + 0.002);
    last.set(key, val);
    return val;
  };
  const trigger = (piece, time, velocity) => {
    if (piece === "kick") {
      kick.triggerAttackRelease("C1", "8n", safeTime("k", time), velocity);
    } else if (piece === "snare") {
      snare.triggerAttackRelease("16n", safeTime("s", time), velocity);
    } else if (piece === "hihat") {
      hat.triggerAttackRelease("16n", safeTime("h", time), velocity);
    } else {
      const pitch = piece === "tom3" ? "G1" : piece === "tom2" ? "A1" : "C2";
      tom.triggerAttackRelease(pitch, safeTime("t", time), velocity);
    }
  };
  return { trigger, nodes: [kick, snare, hatFilter, hat, tom, dist].filter(Boolean) };
}

// Return the synthesized drum kit for the current sound type, or null for "sampled" (real samples).
function getSoundTypeDrumKit() {
  const soundType = currentSoundType();
  if (soundType === "sampled") {
    return null;
  }
  const channel = state.channels.drums;
  if (!channel) {
    return null;
  }
  if (state.soundTypeDrums && state.soundTypeDrums.type === soundType) {
    return state.soundTypeDrums.kit;
  }
  if (state.soundTypeDrums) {
    disposeDrumKit(state.soundTypeDrums.kit);
  }
  const kit = buildSynthDrumKit(soundType, channel);
  state.soundTypeDrums = { type: soundType, kit };
  return kit;
}

function disposeDrumKit(kit) {
  if (!kit || !kit.nodes) {
    return;
  }
  kit.nodes.forEach((node) => {
    try { node.dispose(); } catch (error) { /* ignore */ }
  });
}

// Rebuild voices on change and give immediate audible feedback on the selected instrument.
function onSoundTypeChange() {
  disposeSoundTypeSynths();
  if (elements.genSoundTypeSeq && elements.genSoundType && elements.genSoundTypeSeq.value !== elements.genSoundType.value) {
    elements.genSoundTypeSeq.value = elements.genSoundType.value;
  }
  const select = elements.genSoundType;
  const label = select && select.selectedOptions[0] ? select.selectedOptions[0].textContent : currentSoundType();
  elements.statusText.textContent = `Sound: ${label}`;
  const def = getInstrumentDef(state.selectedInstrument);
  if (state.ready && !state.isRecording && def) {
    if (def.sample && def.sample.kind === "melodic") {
      playInstrument(def.id, ["C4", "E4", "G4"], "8n", undefined, 0.7);
    } else if (def.id === "drums") {
      const now = Tone.now() + 0.05;
      playDrum("kick", now, 0.9);
      playDrum("hihat", now + 0.14, 0.7);
      playDrum("snare", now + 0.28, 0.85);
      playDrum("hihat", now + 0.42, 0.7);
    }
  }
}

function playInstrument(instrumentId, notes, duration, time, velocity) {
  const def = getInstrumentDef(instrumentId);
  if (def.recorded) {
    const sampler = state.sampleSamplers[instrumentId];
    if (sampler) {
      const list = Array.isArray(notes) ? notes : [notes];
      sampler.triggerAttackRelease(list, duration, time ?? Tone.now(), velocity);
    }
    return;
  }
  const voice = getSoundTypeVoice(instrumentId);
  if (voice) {
    const list = Array.isArray(notes) ? notes : [notes];
    voice.triggerAttackRelease(list, duration, time ?? Tone.now(), velocity);
    return;
  }
  const entry = ensureInstrument(instrumentId);
  if (!entry) {
    return;
  }
  const eventTime = time ?? Tone.now();
  const list = Array.isArray(notes) ? notes : [notes];
  if (entry.useFallback && entry.fallback) {
    entry.fallback.triggerAttackRelease(list, duration, eventTime, velocity);
    return;
  }
  if (entry.sampler && entry.loaded) {
    entry.sampler.triggerAttackRelease(list, duration, eventTime, velocity);
  }
}

function playDrum(piece, time, velocity) {
  const eventTime = time ?? Tone.now();
  const kit = getSoundTypeDrumKit();
  if (kit) {
    kit.trigger(piece, eventTime, velocity);
    return;
  }
  const entry = ensureInstrument("drums");
  if (!entry) {
    return;
  }
  if (entry.useFallback && entry.fallback) {
    entry.fallback(piece, eventTime, velocity);
    return;
  }
  if (entry.players && entry.loaded && entry.players.has(piece)) {
    entry.players.player(piece).start(eventTime);
  }
}

// ---- Recorded-sample regions: play the whole clip (with time-stretch) on the timeline ----
function sampleRegionSteps(id) {
  const dur = state.sampleDurations[id] || 0;
  if (!dur) {
    return 1;
  }
  const stretch = state.sampleStretch[id] || 1;
  const bpm = Number(elements.tempo.value) || 120;
  const secondsPerStep = (60 / bpm) / 4;
  return Math.max(1, Math.round((dur * stretch) / secondsPerStep));
}

function playSampleRegion(id, time, tempoRate, loop) {
  const eventTime = time ?? Tone.now();
  const rate = tempoRate || 1;
  const buffer = state.sampleBuffers[id];
  const stretch = state.sampleStretch[id] || 1;
  const playbackRate = (1 / stretch) * rate;
  if (!buffer || !state.channels[id]) {
    if (state.sampleSamplers[id]) {
      state.sampleSamplers[id].triggerAttackRelease("C4", (state.sampleDurations[id] || 1) / playbackRate, eventTime, 0.9);
    }
    return null;
  }
  let player;
  try {
    // GrainPlayer time-stretches while preserving pitch (playbackRate < 1 => longer/slower).
    player = new Tone.GrainPlayer({ url: buffer, grainSize: 0.14, overlap: 0.08, playbackRate, loop: !!loop }).connect(state.channels[id]);
  } catch (error) {
    return null;
  }
  try {
    player.start(eventTime);
  } catch (error) {
    try { player.dispose(); } catch (disposeError) { /* ignore */ }
    return null;
  }
  if (!loop) {
    const lifeMs = ((state.sampleDurations[id] || buffer.duration || 1) / playbackRate + 0.6) * 1000;
    window.setTimeout(() => {
      try { player.dispose(); } catch (error) { /* ignore */ }
    }, Math.min(Math.max(lifeMs, 400), 120000));
  }
  return player;
}

function lastRecordedSampleId() {
  const recorded = instrumentDefs.filter((def) => def.recorded
    && (state.sampleBuffers[def.id] || state.sampleSamplers[def.id] || state.pendingSampleBuffers[def.id]));
  return recorded.length ? recorded[recorded.length - 1].id : null;
}

/* ---------- Sequencer UI feedback ---------- */
function setActiveStep(step) {
  if (state.currentColumn) {
    state.currentColumn.forEach((cell) => cell.classList.remove("is-current"));
    state.currentColumn = null;
  }
  state.activeStep = step;
  if (step < 0 || !state.stepColumns[step]) {
    return;
  }
  const column = state.stepColumns[step];
  column.forEach((cell) => cell.classList.add("is-current"));
  state.currentColumn = column;
  autoScrollTo(step);
}

function autoScrollTo(step) {
  const scroller = elements.sequencerScroll;
  if (!scroller) {
    return;
  }
  const x = 128 + step * STEP_W;
  if (x < scroller.scrollLeft || x > scroller.scrollLeft + scroller.clientWidth - 80) {
    scroller.scrollLeft = Math.max(0, x - 100);
  }
}

function flashPad(button) {
  button.classList.add("is-hit");
  window.setTimeout(() => button.classList.remove("is-hit"), 150);
}

/* ---------- Labels ---------- */
function updateControlLabels() {
  elements.tempoValue.value = `${elements.tempo.value} BPM`;
  elements.masterValue.value = `${elements.masterVolume.value} dB`;
  elements.octaveValue.value = state.octaveOffset > 0 ? `+${state.octaveOffset}` : String(state.octaveOffset);
  if (elements.tempoBottom) {
    elements.tempoBottom.value = elements.tempo.value;
    elements.tempoBottomValue.value = `${elements.tempo.value} BPM`;
  }
  if (elements.timelineSpeed) {
    elements.timelineSpeed.value = elements.tempo.value;
    elements.timelineSpeedValue.value = `${elements.tempo.value} BPM`;
  }
  if (elements.masterBottom) {
    elements.masterBottom.value = elements.masterVolume.value;
    elements.masterBottomValue.value = `${elements.masterVolume.value} dB`;
  }
  if (elements.octaveBottom) {
    elements.octaveBottom.value = elements.octaveShift.value;
    elements.octaveBottomValue.value = state.octaveOffset > 0 ? `+${state.octaveOffset}` : String(state.octaveOffset);
  }
  elements.reverbValue.value = toPercent(elements.reverbMix.value);
  elements.delayValue.value = toPercent(elements.delayMix.value);
  elements.delayFeedbackValue.value = toPercent(elements.delayFeedback.value);
  elements.chorusValue.value = toPercent(elements.chorusMix.value);
  elements.distortionValue.value = toPercent(elements.distortionMix.value);
  elements.bitcrushValue.value = toPercent(elements.bitcrushMix.value);
  elements.swingValue.value = toPercent(elements.swingMix.value);
  const freq = Number(elements.filterFreq.value);
  elements.filterValue.value = freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : `${freq}`;
}

function toPercent(value) {
  return `${Math.round(Number(value) * 100)}%`;
}

/* ---------- WAV export (offline render with real samples) ---------- */
async function exportWav() {
  if (!state.ready) {
    return;
  }
  const originalLabel = elements.exportWav.innerHTML;
  elements.exportWav.disabled = true;
  elements.exportWav.innerHTML = `<i data-lucide="loader"></i><span>Rendering…</span>`;
  refreshIcons();
  try {
    const audio = await renderCompositionBuffer(false);
    downloadAudio(audio, "wav", "musicband-band-loop");
    elements.statusText.textContent = "Exported WAV";
  } catch (error) {
    elements.statusText.textContent = "Export failed";
    console.error(error);
  } finally {
    elements.exportWav.disabled = false;
    elements.exportWav.innerHTML = originalLabel;
    refreshIcons();
    updateLoadingStatus();
  }
}

// Offline-render the sequencer song (+ optional recorded performance) to an AudioBuffer.
async function renderCompositionBuffer(includeRecorded) {
  const bpm = Number(elements.tempo.value);
  const secondsPerStep = (60 / bpm) / 4;
  const songSteps = totalSteps();
  const duration = secondsPerStep * songSteps + 2.5;
  const seqTracks = state.seqTracks
    .filter((track) => track.kind !== "vocal")
    .map((track) => ({
      instrumentId: track.instrumentId,
      kind: track.kind,
      piece: track.piece,
      notes: track.notes,
      stepNotes: track.stepNotes,
      duration: track.duration,
      tempo: track.tempo,
      pattern: track.pattern.slice()
    }));
  const recorded = includeRecorded ? state.recordedEvents.slice() : [];
  const recIds = recorded.map((event) => (event.kind === "drum" ? "drums" : event.instrument));
  const usedIds = [...new Set([...seqTracks.map((track) => track.instrumentId), ...recIds])];

  const buffer = await Tone.Offline(async () => {
    const reverb = new Tone.Reverb({ decay: 3.2, wet: Number(elements.reverbMix.value) }).toDestination();
    const delay = new Tone.FeedbackDelay({ delayTime: "8n", feedback: Number(elements.delayFeedback.value), wet: Number(elements.delayMix.value) }).connect(reverb);

    const renderMap = {};
    usedIds.forEach((id) => {
      const def = getInstrumentDef(id);
      if (!def || def.vocal || def.recorded || !def.sample) {
        return;
      }
      if (def.sample.kind === "drum") {
        renderMap[id] = new Tone.Players({ urls: def.sample.urls, baseUrl: def.sample.baseUrl }).connect(delay);
      } else {
        renderMap[id] = new Tone.Sampler({ urls: def.sample.urls, baseUrl: def.sample.baseUrl }).connect(delay);
      }
    });

    await Tone.loaded();

    const last = new Map();
    const nextTime = (key, desired) => {
      const previous = last.get(key);
      const safe = previous === undefined ? desired : Math.max(desired, previous + 0.002);
      last.set(key, safe);
      return safe;
    };

    for (let step = 0; step < songSteps; step += 1) {
      const stepTime = step * secondsPerStep;
      seqTracks.forEach((track, trackIndex) => {
        if (!track.pattern[step]) {
          return;
        }
        // Honor each track's trim/expand window.
        if (track.regionLen != null) {
          const ws = track.regionStart || 0;
          if (step < ws || step >= ws + track.regionLen) {
            return;
          }
        }
        const base = stepTime + trackIndex * 0.0004;
        if (track.kind === "sample") {
          const buf = state.sampleBuffers[track.instrumentId];
          if (buf) {
            try {
              const tempoRate = track.tempo ? (bpm / track.tempo) : 1;
              const clip = new Tone.GrainPlayer({ url: buf, grainSize: 0.14, overlap: 0.08, playbackRate: (1 / (state.sampleStretch[track.instrumentId] || 1)) * tempoRate }).connect(delay);
              clip.start(nextTime(`s:${track.instrumentId}:${step}`, base));
            } catch (error) {
              /* ignore */
            }
          }
          return;
        }
        const instrument = renderMap[track.instrumentId];
        if (!instrument) {
          return;
        }
        if (track.kind === "drum") {
          if (instrument.has(track.piece)) {
            instrument.player(track.piece).start(nextTime(`d:${track.piece}`, base));
          }
        } else {
          const notes = track.stepNotes && track.stepNotes[step] ? track.stepNotes[step] : track.notes;
          instrument.triggerAttackRelease(notes, track.duration || "8n", nextTime(`m:${track.instrumentId}`, base), 0.8);
        }
      });
    }

    recorded.forEach((event) => {
      const step = ((event.step % songSteps) + songSteps) % songSteps;
      const base = step * secondsPerStep + 0.0006;
      if (event.kind === "drum") {
        const instrument = renderMap.drums;
        if (instrument && instrument.has(event.drum)) {
          instrument.player(event.drum).start(nextTime(`d:${event.drum}`, base));
        }
      } else {
        const instrument = renderMap[event.instrument];
        if (instrument) {
          instrument.triggerAttackRelease(event.notes, event.duration || "8n", nextTime(`m:${event.instrument}`, base), 0.85);
        }
      }
    });
  }, duration, 2);

  return buffer.get();
}

/* ---------- Download modal (WAV / MP3) ---------- */
function openDownloadModal() {
  if (!state.ready || !state.recordedEvents.length || !elements.downloadModal) {
    return;
  }
  state.downloadBaseName = "musicband-recording";
  if (elements.downloadTitle) {
    elements.downloadTitle.textContent = "Download Recording";
  }
  elements.downloadModal.hidden = false;
  elements.downloadStatus.textContent = "Rendering your track…";
  elements.downloadWav.disabled = true;
  elements.downloadMp3.disabled = true;
  refreshIcons();
  renderCompositionBuffer(true).then((buffer) => {
    state.recordingBuffer = buffer;
    const seconds = Math.round(buffer.duration * 10) / 10;
    elements.downloadStatus.textContent = `Ready — ${seconds}s mix (song + your take).`;
    elements.downloadWav.disabled = false;
    if (window.lamejs) {
      elements.downloadMp3.disabled = false;
    } else {
      elements.downloadMp3.title = "MP3 encoder not available";
    }
  }).catch((error) => {
    console.error(error);
    elements.downloadStatus.textContent = "Rendering failed.";
  });
}

function closeDownloadModal() {
  if (elements.downloadModal) {
    elements.downloadModal.hidden = true;
  }
}

function downloadAudio(audioBuffer, format, baseName) {
  const blob = format === "mp3" ? encodeMp3(audioBuffer) : audioBufferToWav(audioBuffer);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${baseName}.${format}`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function floatTo16(samples) {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function encodeMp3(audioBuffer) {
  if (!window.lamejs) {
    throw new Error("lamejs not loaded");
  }
  const channels = Math.min(2, audioBuffer.numberOfChannels);
  const sampleRate = audioBuffer.sampleRate;
  const encoder = new window.lamejs.Mp3Encoder(channels, sampleRate, 192);
  const left = floatTo16(audioBuffer.getChannelData(0));
  const right = channels > 1 ? floatTo16(audioBuffer.getChannelData(1)) : left;
  const blockSize = 1152;
  const chunks = [];
  for (let i = 0; i < left.length; i += blockSize) {
    const leftChunk = left.subarray(i, i + blockSize);
    const rightChunk = right.subarray(i, i + blockSize);
    const encoded = channels > 1 ? encoder.encodeBuffer(leftChunk, rightChunk) : encoder.encodeBuffer(leftChunk);
    if (encoded.length > 0) {
      chunks.push(new Int8Array(encoded));
    }
  }
  const flushed = encoder.flush();
  if (flushed.length > 0) {
    chunks.push(new Int8Array(flushed));
  }
  return new Blob(chunks, { type: "audio/mpeg" });
}

function downloadWav(audioBuffer) {
  const wavBlob = audioBufferToWav(audioBuffer);
  const url = URL.createObjectURL(wavBlob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "musicband-band-loop.wav";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function audioBufferToWav(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const channels = [];
  for (let channel = 0; channel < numChannels; channel += 1) {
    channels.push(audioBuffer.getChannelData(channel));
  }

  let offset = 44;
  for (let frame = 0; frame < numFrames; frame += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel][frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view, offset, text) {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

/* ---------- Icons ---------- */
function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/* ---------- Visualizer + meters ---------- */
// Draw the voice sine sound curve (Depth = amplitude, Rate = frequency).
function drawVoiceCurve() {
  const canvas = elements.voiceCurve;
  if (!canvas || !canvas.getContext) {
    return;
  }
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  const depth = state.voiceSineDepth || 0;
  const rate = state.voiceSineRate || 0.5;
  const amp = (h / 2 - 6) * Math.max(0.05, depth);
  const cycles = Math.max(0.5, rate * 2);
  const color = (getComputedStyle(document.documentElement).getPropertyValue("--instrument-color") || "#ffd166").trim() || "#ffd166";
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 1) {
    const phase = (x / w) * cycles * Math.PI * 2;
    const y = h / 2 - Math.sin(phase) * amp;
    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

function setupVisualizer() {
  const canvas = elements.visualizer;
  const context = canvas.getContext("2d");

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const waveform = state.nodes.analyser ? state.nodes.analyser.getValue() : idleWaveform();

    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(12, 12, 10, 0.22)";
    context.fillRect(0, 0, width, height);

    drawWave(context, waveform, width, height, "#ffd166", 0);
    drawWave(context, waveform, width, height, "#76f7bf", 10);
    updateMeters();
    window.requestAnimationFrame(draw);
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  draw();
}

function updateMeters() {
  if (!state.nodes.meter) {
    return;
  }
  const value = state.nodes.meter.getValue();
  const left = Array.isArray(value) ? value[0] : value;
  const right = Array.isArray(value) ? value[1] : value;
  elements.meterL.style.width = `${Math.min(100, left * 140)}%`;
  elements.meterR.style.width = `${Math.min(100, right * 140)}%`;
}

function idleWaveform() {
  const values = new Float32Array(256);
  const now = performance.now() / 700;
  for (let index = 0; index < values.length; index += 1) {
    values[index] = Math.sin(index * 0.18 + now) * 0.18 + Math.sin(index * 0.035 - now * 1.8) * 0.09;
  }
  return values;
}

function drawWave(context, waveform, width, height, color, offset) {
  context.beginPath();
  context.lineWidth = 2;
  context.strokeStyle = color;
  for (let index = 0; index < waveform.length; index += 1) {
    const x = (index / (waveform.length - 1)) * width;
    const y = height / 2 + waveform[index] * (height * 0.4) + offset;
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
}

/* ---------- Deferred init (runs after all module constants are defined) ---------- */
populateSoundTypeSelects();
