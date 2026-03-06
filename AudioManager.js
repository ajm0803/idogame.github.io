import * as Tone from 'tone';

class AudioManager {
    constructor() {
        this.isInitialized = false;
        this.synth = null;
        this.collectSynth = null;
        this.damageSynth = null;
        this.bgMusicLoop = null;
        this.isMuted = false;
        this.currentLevel = null;
        this.tempo = 120;
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            // Jump synth
            this.synth = new Tone.MonoSynth({
                oscillator: { type: "square" },
                envelope: {
                    attack: 0.001,
                    decay: 0.1,
                    sustain: 0,
                    release: 0.1
                }
            }).toDestination();

            // Item collection
            this.collectSynth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: "triangle" },
                envelope: {
                    attack: 0.005,
                    decay: 0.1,
                    sustain: 0.3,
                    release: 1
                }
            }).toDestination();

            // Damage/hit synth
            this.damageSynth = new Tone.MonoSynth({
                oscillator: { type: "sawtooth" },
                envelope: {
                    attack: 0.001,
                    decay: 0.15,
                    sustain: 0,
                    release: 0.1
                },
                filterEnvelope: {
                    attack: 0.001,
                    decay: 0.1,
                    sustain: 0,
                    release: 0.2,
                    baseFrequency: 200,
                    octaves: 3
                }
            }).toDestination();

            // Music instruments
            this.bassSynth = new Tone.MonoSynth({
                oscillator: { type: "square" },
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.1 }
            }).toDestination();
            this.bassSynth.volume.value = -12;

            this.melodySynth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: "sawtooth" },
                envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.8 }
            }).toDestination();
            this.melodySynth.volume.value = -18;

            this.drumSynth = new Tone.MembraneSynth().toDestination();
            this.drumSynth.volume.value = -10;

            await Tone.start();
            this.isInitialized = true;
        } catch (e) {
            console.warn('Audio init failed:', e);
        }
    }

    startMusic(level) {
        if (!this.isInitialized || this.isMuted) return;
        if (this.currentLevel === level) return;
        
        this.stopMusic();
        this.currentLevel = level;
        
        const now = Tone.now();
        Tone.Transport.cancel();
        
        if (level === 1) { // Nightclub - Energetic techno
            Tone.Transport.bpm.value = 128;
            const sequence = new Tone.Sequence((time, note) => {
                this.drumSynth.triggerAttackRelease(note, "8n", time);
            }, ["C1", "C1", "C1", "C1"], "4n").start(0);

            const bassSeq = new Tone.Sequence((time, note) => {
                this.bassSynth.triggerAttackRelease(note, "16n", time);
            }, ["C2", null, "G1", null, "C2", "G1", "Bb1", null], "8n").start(0);

            const melSeq = new Tone.Sequence((time, note) => {
                if (note) this.melodySynth.triggerAttackRelease(note, "8n", time);
            }, ["C4", null, "Eb4", "F4", "G4", null, "Bb4", "G4"], "4n").start(0);
        } 
        else if (level === 2) { // Park - Whimsical upbeat
            Tone.Transport.bpm.value = 110;
            const bassSeq = new Tone.Sequence((time, note) => {
                this.bassSynth.triggerAttackRelease(note, "8n", time);
            }, ["F2", "C2", "F2", "Bb2"], "4n").start(0);

            const melSeq = new Tone.Sequence((time, note) => {
                if (note) this.melodySynth.triggerAttackRelease(note, "4n", time);
            }, ["A4", "Bb4", "C5", "F4", "G4", "A4", "F4", "D4"], "2n").start(0);
            
            const drumSeq = new Tone.Sequence((time, note) => {
                this.drumSynth.triggerAttackRelease(note, "16n", time);
            }, ["F1", null, "F1", null], "4n").start(0);
        }

        Tone.Transport.start();
    }

    stopMusic() {
        Tone.Transport.stop();
        Tone.Transport.cancel();
        this.currentLevel = null;
    }

    playJump() {
        if (!this.isInitialized || this.isMuted) return;
        try {
            const now = Tone.now();
            this.synth.triggerAttackRelease("C3", "16n", now);
            this.synth.frequency.rampTo("C5", 0.1, now);
        } catch (e) {}
    }

    playCollect() {
        if (!this.isInitialized || this.isMuted) return;
        try {
            // Arpeggio for collection
            const now = Tone.now();
            const notes = ["E5", "G5", "C6"];
            notes.forEach((note, i) => {
                this.collectSynth.triggerAttackRelease(note, "32n", now + i * 0.05);
            });
        } catch (e) {}
    }

    playPowerUp() {
        if (!this.isInitialized || this.isMuted) return;
        try {
            const now = Tone.now();
            const notes = ["C5", "E5", "G5", "C6"];
            notes.forEach((note, i) => {
                this.collectSynth.triggerAttackRelease(note, "16n", now + i * 0.1);
            });
        } catch (e) {}
    }

    playKey() {
        if (!this.isInitialized || this.isMuted) return;
        try {
            const now = Tone.now();
            this.collectSynth.triggerAttackRelease(["C6", "E6", "G6"], "8n", now);
        } catch (e) {}
    }

    playHit() {
        if (!this.isInitialized || this.isMuted) return;
        try {
            const now = Tone.now();
            this.damageSynth.triggerAttackRelease("G1", "8n", now);
            // Add a little noise for impact
            const noise = new Tone.NoiseSynth({
                noise: { type: "white" },
                envelope: { attack: 0.001, decay: 0.1, sustain: 0 }
            }).toDestination();
            noise.volume.value = -10;
            noise.triggerAttackRelease("16n", now);
        } catch (e) {}
    }

    playRhythmHit(quality) {
        if (!this.isInitialized || this.isMuted) return;
        try {
            if (quality === 'perfect') {
                this.collectSynth.triggerAttackRelease(["C6", "E6"], "32n");
            } else if (quality === 'good') {
                this.collectSynth.triggerAttackRelease(["E5", "G5"], "32n");
            } else {
                this.collectSynth.triggerAttackRelease(["C5"], "32n");
            }
        } catch (e) {}
    }

    playRhythmMiss() {
        if (!this.isInitialized || this.isMuted) return;
        try {
            this.damageSynth.triggerAttackRelease("E2", "16n");
        } catch (e) {}
    }

    playVictory() {
        if (!this.isInitialized || this.isMuted) return;
        try {
            const now = Tone.now();
            this.collectSynth.triggerAttackRelease(["C5", "E5", "G5"], "8n", now);
            this.collectSynth.triggerAttackRelease(["E5", "G5", "C6"], "8n", now + 0.2);
            this.collectSynth.triggerAttackRelease(["G5", "C6", "E6"], "4n", now + 0.4);
        } catch (e) {}
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }
}

export const audioManager = new AudioManager();