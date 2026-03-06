import Phaser from 'phaser';
import { audioManager } from '../AudioManager.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    init(data) {
        this.result = data.result || 'lost';
        this.playerType = data.playerType || 'bride';
        this.completionTime = data.time || 0;
        this.level = data.level || 1;
        this.stars = data.stars || 0;
    }

    create() {
        const { width, height } = this.scale;

        // Stop level music
        audioManager.stopMusic();

        // Background
        this.add.image(width / 2, height / 2, 'background').setDisplaySize(width, height);
        
        // Darkened overlay
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, this.result === 'won' ? 0.3 : 0.5);

        // Character Portrait with animation
        const charAnim = this.result === 'won' ? `${this.playerType}-smile` : `${this.playerType}-idle`;
        const charScale = this.playerType === 'groom' ? 0.22 : 0.32;
        const charSprite = this.add.sprite(width * 0.15, height * 0.55, this.playerType).setScale(charScale);
        charSprite.play(charAnim);
        
        // Gentle bounce for character
        this.tweens.add({
            targets: charSprite,
            y: charSprite.y - 10,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        if (this.result === 'won') {
            this.createWinScreen(width, height);
        } else {
            this.createLoseScreen(width, height);
        }
    }

    createWinScreen(width, height) {
        // Confetti/celebration particles
        this.createCelebration(width, height);

        // Title
        const title = this.add.text(width / 2, 65, '🎉 LEVEL COMPLETE! 🎉', {
            fontFamily: '"Press Start 2P"',
            fontSize: '48px',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5).setScale(0);
        
        this.tweens.add({
            targets: title,
            scale: 1,
            duration: 600,
            ease: 'Back.easeOut'
        });

        // Level & Time info
        const levelLabel = this.level === 1 ? 'Nightclub' : `Park ${this.level - 1}`;
        this.add.text(width / 2, 145, `${levelLabel}  |  ⏱ ${this.completionTime}s`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Stars Display (animated pop-in)
        this.displayStars(width / 2, 230);

        // Leaderboard section
        this.showLeaderboard(width, height);

        // Buttons
        const nextLevel = this.level + 1;
        const hasNextLevel = nextLevel <= 2;
        
        if (hasNextLevel) {
            this.createButton(width / 2 - 220, height - 75, 'NEXT LEVEL ▶', '#00ff00', () => {
                this.scene.start('GameScene', { playerType: this.playerType, level: nextLevel });
            }, 380);
            
            this.createButton(width / 2 + 220, height - 75, 'RETRY 🔄', '#ffaa00', () => {
                this.scene.start('GameScene', { playerType: this.playerType, level: this.level });
            }, 250);
        } else {
            // Final level completed
            title.setText('🎉 QUEST COMPLETE! 🎉');
            
            // Personalized Message
            const personalMsg = "Well done you have completed the quest,\nclick access invite to view wedding invitation";
            this.add.text(width / 2, height - 160, personalMsg, {
                fontFamily: '"Press Start 2P"',
                fontSize: '14px',
                color: '#ffffff',
                align: 'center',
                lineSpacing: 10,
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);

            this.createButton(width / 2 - 320, height - 75, 'RETRY 🔄', '#ffaa00', () => {
                this.scene.start('GameScene', { playerType: this.playerType, level: this.level });
            }, 250);

            this.createButton(width / 2, height - 75, 'ACCESS INVITE 💌', '#ff69b4', () => {
                window.open('https://theknot.com/annelineandstephenwedding', '_blank');
            }, 360);

            this.createButton(width / 2 + 320, height - 75, 'MAIN MENU', '#ffffff', () => {
                this.scene.start('MenuScene');
            }, 250);
        }
    }

    createLoseScreen(width, height) {
        // Title
        const title = this.add.text(width / 2, 100, 'GAME OVER', {
            fontFamily: '"Press Start 2P"',
            fontSize: '64px',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);
        
        // Pulse effect on game over
        this.tweens.add({
            targets: title,
            alpha: 0.6,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Encouraging message
        const messages = [
            'Almost had it! Try again! 💪',
            "You'll get there! One more try! ✨",
            'The wedding awaits! Keep going! 💍',
            'Practice makes perfect! 🎯',
            'So close! Give it another shot! 🌟'
        ];
        const msg = Phaser.Utils.Array.GetRandom(messages);
        
        this.add.text(width / 2, height / 2 - 60, msg, {
            fontFamily: '"Press Start 2P"',
            fontSize: '22px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            wordWrap: { width: width * 0.7 },
            align: 'center'
        }).setOrigin(0.5);

        // Level info
        const levelLabel = this.level === 1 ? 'Nightclub' : `Park ${this.level - 1}`;
        this.add.text(width / 2, height / 2 + 10, `Level: ${levelLabel}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '18px',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        // Buttons - Retry + Menu
        this.createButton(width / 2 - 250, height - 75, '🔄 RETRY', '#ff6600', () => {
            this.scene.start('GameScene', { playerType: this.playerType, level: this.level });
        }, 320);

        this.createButton(width / 2 + 250, height - 75, '🏠 MENU', '#ff69b4', () => {
            this.scene.start('MenuScene');
        }, 300);

        // Keyboard shortcut hints
        this.add.text(width / 2, height - 20, 'Press ENTER to retry', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#666666'
        }).setOrigin(0.5);

        this.input.keyboard.on('keydown-ENTER', () => {
            this.scene.start('GameScene', { playerType: this.playerType, level: this.level });
        });
    }

    createCelebration(width, height) {
        const emojis = ['✨', '🎉', '💍', '❤️', '🌸', '🎀', '💕'];
        for (let i = 0; i < 12; i++) {
            const x = Phaser.Math.Between(100, width - 100);
            const emoji = Phaser.Utils.Array.GetRandom(emojis);
            const txt = this.add.text(x, -30, emoji, { fontSize: '28px' });
            
            this.tweens.add({
                targets: txt,
                y: height + 50,
                x: x + Phaser.Math.Between(-80, 80),
                angle: Phaser.Math.Between(-180, 180),
                duration: Phaser.Math.Between(3000, 6000),
                delay: Phaser.Math.Between(0, 2000),
                repeat: -1,
                ease: 'Sine.easeIn'
            });
        }
    }

    showLeaderboard(width, height) {
        this.add.text(width / 2, 320, 'TOP FASTEST ARRIVALS', {
            fontFamily: '"Press Start 2P"',
            fontSize: '22px',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        const leaderboard = JSON.parse(localStorage.getItem('wedding-leaderboard') || '[]');
        const playerName = localStorage.getItem('wedding-player-name') || 'YOU';
        
        // Filter to same level for relevance
        const levelEntries = leaderboard.filter(e => e.level === this.level).slice(0, 5);
        const entriesToShow = levelEntries.length > 0 ? levelEntries : leaderboard.slice(0, 5);
        
        entriesToShow.forEach((entry, index) => {
            const entryLvl = entry.level === 1 ? 'Club' : `Pk${entry.level - 1}`;
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
            const entryText = `${medal} ${entry.name || playerName} - ${entry.time}s (${entryLvl})`;
            this.add.text(width / 2, 370 + (index * 35), entryText, {
                fontFamily: '"Press Start 2P"',
                fontSize: '16px',
                color: index === 0 ? '#ffd700' : '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
        });
    }

    displayStars(x, y) {
        const starCount = this.stars;
        const spacing = 90;
        const startX = x - spacing;

        for (let i = 0; i < 3; i++) {
            const earned = i < starCount;
            const star = this.add.text(startX + i * spacing, y, '★', {
                fontFamily: '"Press Start 2P"',
                fontSize: '55px',
                color: earned ? '#ffd700' : '#333333',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5).setScale(0);
            
            // Animated pop-in with delay per star
            this.tweens.add({
                targets: star,
                scale: 1,
                duration: 400,
                delay: 600 + i * 300,
                ease: 'Back.easeOut',
                onStart: () => {
                    if (earned) {
                        this.cameras.main.shake(100, 0.005);
                    }
                }
            });
        }
        
        const rankText = starCount === 3 ? '✨ PERFECT! ✨' : starCount === 2 ? '🌟 GREAT!' : '👍 PASSED!';
        const rank = this.add.text(x, y + 55, rankText, {
            fontFamily: '"Press Start 2P"',
            fontSize: '22px',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setAlpha(0);
        
        this.tweens.add({
            targets: rank,
            alpha: 1,
            duration: 400,
            delay: 1800
        });
    }

    createButton(x, y, label, color, callback, btnWidth = 400) {
        const button = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, btnWidth, 65, 0x000000, 0.75)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', callback)
            .on('pointerover', () => { bg.setStrokeStyle(3, color); text.setScale(1.05); })
            .on('pointerout', () => { bg.setStrokeStyle(3, 0xffffff); text.setScale(1); });

        const text = this.add.text(0, 0, label, {
            fontFamily: '"Press Start 2P"',
            fontSize: '20px',
            color: color
        }).setOrigin(0.5);

        button.add([bg, text]);
        return button;
    }
}