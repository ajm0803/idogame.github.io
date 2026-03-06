import Phaser from 'phaser';
import { audioManager } from '../AudioManager.js';

export default class DanceScene extends Phaser.Scene {
    constructor() {
        super('DanceScene');
    }

    init(data) {
        this.playerType = data.playerType || 'bride';
        this.level = data.level || 1;
        this.score = 0;
        this.totalNotes = 20;
        this.notesProcessed = 0;
        this.isGameOver = false;
        this.combo = 0;
        this.maxCombo = 0;
        this.perfectCount = 0;
        this.goodCount = 0;
        this.missCount = 0;
    }

    create() {
        const { width, height } = this.scale;

        // Background
        this.add.image(width / 2, height / 2, 'nightclub-bg').setDisplaySize(width, height).setAlpha(0.6);
        
        // Pulsing dance floor effect
        this.danceFloor = this.add.rectangle(width / 2, height - 50, width, 100, 0x220033, 0.5);
        this.tweens.add({
            targets: this.danceFloor,
            fillAlpha: 0.8,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        // Characters
        if (this.playerType === 'groom') {
            this.player = this.add.sprite(width * 0.2, height * 0.65, 'groom-idle').setScale(0.17);
            this.player.play('groom-anim-idle');
        } else {
            this.player = this.add.sprite(width * 0.2, height * 0.65, 'bride').setScale(0.30);
            this.player.play('bride-idle');
        }
        
        this.dj = this.add.sprite(width * 0.82, height * 0.65, 'dj').setScale(0.45);
        
        // VS text
        this.add.text(width / 2, height * 0.4, 'VS', {
            fontFamily: '"Press Start 2P"',
            fontSize: '36px',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        this.add.text(width * 0.82, height * 0.38, 'BOSS DJ', {
            fontFamily: '"Press Start 2P"',
            fontSize: '20px',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // UI - Score & Combo
        this.scoreText = this.add.text(width / 2, 30, 'Score: 0', {
            fontFamily: '"Press Start 2P"',
            fontSize: '28px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.comboText = this.add.text(width / 2, 65, '', {
            fontFamily: '"Press Start 2P"',
            fontSize: '18px',
            color: '#ff69b4',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Progress bar
        this.progressBg = this.add.rectangle(width / 2, 100, 300, 16, 0x333333, 0.8).setStrokeStyle(2, 0xffffff);
        this.progressFill = this.add.rectangle(width / 2 - 147, 100, 4, 12, 0x00ff00, 0.9).setOrigin(0, 0.5);

        this.instructionText = this.add.text(width / 2, height - 30, '⌨️ Arrow Keys  |  📱 Tap the arrows!', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Rhythm Lanes - more spread out for touch
        const laneStartX = width * 0.35;
        const laneSpacing = width * 0.1;
        const laneX = [laneStartX, laneStartX + laneSpacing, laneStartX + laneSpacing * 2, laneStartX + laneSpacing * 3];
        const arrowKeys = ['left', 'up', 'down', 'right'];
        const arrowAssets = ['rhythm-arrow-left', 'rhythm-arrow-up', 'rhythm-arrow-down', 'rhythm-arrow-right'];
        
        // Target zone line
        this.add.rectangle(width / 2, 180, laneSpacing * 3.5, 4, 0xffffff, 0.2);
        
        this.lanes = arrowKeys.map((key, i) => {
            const target = this.add.image(laneX[i], 180, arrowAssets[i]).setScale(0.12).setAlpha(0.25);
            
            // Touch buttons at bottom of lane
            const touchZone = this.add.circle(laneX[i], height - 100, 45, 0xffffff, 0.15)
                .setInteractive().setDepth(100);
            const touchLabel = this.add.image(laneX[i], height - 100, arrowAssets[i]).setScale(0.08).setAlpha(0.5).setDepth(101);
            
            touchZone.on('pointerdown', () => {
                this.processLaneInput(key);
                touchZone.setFillStyle(0xffffff, 0.4);
                this.time.delayedCall(100, () => touchZone.setFillStyle(0xffffff, 0.15));
            });
            
            return { key, target, x: laneX[i], touchZone, touchLabel };
        });

        this.notes = this.physics.add.group();

        // Spawn Notes
        this.time.addEvent({
            delay: 900,
            callback: this.spawnNote,
            callbackScope: this,
            repeat: this.totalNotes - 1
        });

        // Keyboard Input
        this.input.keyboard.on('keydown', this.handleInput, this);
    }

    processLaneInput(pressedKey) {
        if (this.isGameOver) return;
        
        let hit = false;
        let bestNote = null;
        let bestDist = Infinity;
        
        // Find closest note in this lane
        this.notes.getChildren().forEach(note => {
            if (note.getData('key') === pressedKey) {
                const distance = Math.abs(note.y - 180);
                if (distance < bestDist) {
                    bestDist = distance;
                    bestNote = note;
                }
            }
        });
        
        if (bestNote && bestDist < 80) {
            hit = true;
            let scoreAdd = 0;
            let feedbackText = '';
            let feedbackColor = '';
            
            if (bestDist < 25) {
                // Perfect
                scoreAdd = 15;
                feedbackText = 'PERFECT!';
                feedbackColor = '#00ff00';
                this.perfectCount++;
            } else if (bestDist < 50) {
                // Good
                scoreAdd = 10;
                feedbackText = 'GOOD!';
                feedbackColor = '#ffff00';
                this.goodCount++;
            } else {
                // OK
                scoreAdd = 5;
                feedbackText = 'OK';
                feedbackColor = '#ff8800';
            }
            
            // Combo multiplier
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            if (this.combo >= 5) scoreAdd = Math.floor(scoreAdd * 1.5);
            if (this.combo >= 10) scoreAdd = Math.floor(scoreAdd * 2);
            
            this.score += scoreAdd;
            this.scoreText.setText(`Score: ${this.score}`);
            this.updateComboDisplay();
            
            this.showFeedback(feedbackText, bestNote.x, bestNote.y, feedbackColor);
            bestNote.destroy();
            this.notesProcessed++;
            
            // Visual feedback
            this.dj.setTint(0xff0000);
            this.time.delayedCall(100, () => { if (this.dj) this.dj.clearTint(); });
            
            // Player dance bounce
            this.tweens.add({
                targets: this.player,
                scaleY: this.player.scaleY * 1.1,
                duration: 80,
                yoyo: true
            });
            
            // Play quality-appropriate SFX
            if (bestDist < 25) audioManager.playRhythmHit('perfect');
            else if (bestDist < 50) audioManager.playRhythmHit('good');
            else audioManager.playRhythmHit('ok');
            
            // Highlight target
            const lane = this.lanes.find(l => l.key === pressedKey);
            if (lane) {
                lane.target.setAlpha(0.8);
                this.time.delayedCall(150, () => lane.target.setAlpha(0.25));
            }
        }
        
        if (!hit) {
            this.combo = 0;
            this.updateComboDisplay();
            this.cameras.main.shake(80, 0.003);
            audioManager.playRhythmMiss();
        }
    }

    updateComboDisplay() {
        if (this.combo >= 3) {
            this.comboText.setText(`🔥 ${this.combo}x COMBO!`);
            if (this.combo >= 10) {
                this.comboText.setColor('#ff0000');
            } else if (this.combo >= 5) {
                this.comboText.setColor('#ff69b4');
            } else {
                this.comboText.setColor('#ffaa00');
            }
        } else {
            this.comboText.setText('');
        }
    }

    spawnNote() {
        if (this.isGameOver) return;
        const { height } = this.scale;
        const laneIndex = Phaser.Math.Between(0, 3);
        const lane = this.lanes[laneIndex];
        const arrowAssets = ['rhythm-arrow-left', 'rhythm-arrow-up', 'rhythm-arrow-down', 'rhythm-arrow-right'];
        
        const note = this.notes.create(lane.x, height + 50, arrowAssets[laneIndex]);
        note.setScale(0.12);
        note.setData('key', lane.key);
        note.setVelocityY(-320);
        
        // DJ bounce
        this.tweens.add({
            targets: this.dj,
            scaleY: 0.5,
            duration: 100,
            yoyo: true
        });
    }

    handleInput(event) {
        const keyMap = {
            'ArrowLeft': 'left',
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowRight': 'right'
        };

        const pressedKey = keyMap[event.code];
        if (!pressedKey) return;
        
        this.processLaneInput(pressedKey);
    }

    showFeedback(text, x, y, color) {
        const feedback = this.add.text(x, y, text, {
            fontFamily: '"Press Start 2P"',
            fontSize: '18px',
            color: color,
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.tweens.add({
            targets: feedback,
            y: y - 60,
            alpha: 0,
            scale: 1.3,
            duration: 600,
            onComplete: () => feedback.destroy()
        });
    }

    update() {
        if (this.isGameOver) return;

        // Update progress bar
        const progress = Math.min(this.notesProcessed / this.totalNotes, 1);
        this.progressFill.setSize(294 * progress, 12);

        this.notes.getChildren().forEach(note => {
            if (note.y < -50) {
                // Missed note
                this.showFeedback('MISS', note.x, 100, '#ff0000');
                note.destroy();
                this.notesProcessed++;
                this.missCount++;
                this.combo = 0;
                this.updateComboDisplay();
            }
        });

        if (this.notesProcessed >= this.totalNotes) {
            this.endDanceOff();
        }
    }

    endDanceOff() {
        this.isGameOver = true;
        const { width, height } = this.scale;
        const win = this.score >= 100;
        
        // Dim everything
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5).setDepth(200);
        
        // Result panel
        const panel = this.add.container(width / 2, height / 2).setDepth(201);
        panel.add(this.add.rectangle(0, 0, 600, 350, 0x111122, 0.95).setStrokeStyle(4, win ? 0x00ff00 : 0xff0000));
        
        if (win) audioManager.playVictory();
        
        const resultTitle = win ? '🎉 YOU WIN! 🎉' : '💀 DEFEATED...';
        panel.add(this.add.text(0, -130, resultTitle, {
            fontFamily: '"Press Start 2P"',
            fontSize: '32px',
            color: win ? '#00ff00' : '#ff0000'
        }).setOrigin(0.5));
        
        // Stats
        const statStyle = { fontFamily: '"Press Start 2P"', fontSize: '16px', color: '#ffffff' };
        panel.add(this.add.text(0, -70, `Final Score: ${this.score}`, statStyle).setOrigin(0.5));
        panel.add(this.add.text(0, -40, `Perfect: ${this.perfectCount} | Good: ${this.goodCount} | Miss: ${this.missCount}`, { ...statStyle, fontSize: '12px', color: '#aaaaaa' }).setOrigin(0.5));
        panel.add(this.add.text(0, -10, `Max Combo: ${this.maxCombo}x`, { ...statStyle, color: '#ff69b4' }).setOrigin(0.5));
        
        // Grade
        let grade, gradeColor;
        if (this.score >= 250) { grade = 'S'; gradeColor = '#ff69b4'; }
        else if (this.score >= 200) { grade = 'A'; gradeColor = '#00ff00'; }
        else if (this.score >= 150) { grade = 'B'; gradeColor = '#ffff00'; }
        else if (this.score >= 100) { grade = 'C'; gradeColor = '#ff8800'; }
        else { grade = 'D'; gradeColor = '#ff0000'; }
        
        panel.add(this.add.text(0, 40, `GRADE: ${grade}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '40px',
            color: gradeColor,
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5));

        // Continue prompt
        const continueText = win ? 'Tap or press ENTER to continue...' : 'Tap or press ENTER to retry...';
        const prompt = this.add.text(0, 120, continueText, {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#888888'
        }).setOrigin(0.5);
        panel.add(prompt);
        
        this.tweens.add({ targets: prompt, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });
        
        // Scale in panel
        panel.setScale(0);
        this.tweens.add({ targets: panel, scale: 1, duration: 500, ease: 'Back.easeOut' });

        // Input to continue (delayed to prevent accidental press)
        this.time.delayedCall(1500, () => {
            this.input.keyboard.on('keydown-ENTER', () => this.finishDance(win));
            this.input.on('pointerdown', () => this.finishDance(win));
        });
    }

    finishDance(win) {
        if (win) {
            this.scene.stop('DanceScene');
            this.scene.resume('GameScene', { danceWon: true });
        } else {
            this.scene.restart();
        }
    }
}