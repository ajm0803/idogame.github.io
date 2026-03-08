import Phaser from 'phaser';
import { audioManager } from '../AudioManager.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    get isMobile() { return this.sys.game.device.input.touch; }
    get s() { return this.isMobile ? 1.5 : 1; }

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
        const charSprite = this.add.sprite(width * 0.12, height * 0.55, this.playerType).setScale(charScale * this.s);
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
        const s = this.s;
        // Confetti/celebration particles
        this.createCelebration(width, height);

        // Title
        const titleFS = Math.round(48 * s);
        const title = this.add.text(width / 2, Math.round(65 * s), '🎉 LEVEL COMPLETE! 🎉', {
            fontFamily: '"Press Start 2P"',
            fontSize: `${titleFS}px`,
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: Math.round(8 * s),
            wordWrap: { width: width * 0.85 },
            align: 'center'
        }).setOrigin(0.5).setScale(0);
        
        this.tweens.add({
            targets: title,
            scale: 1,
            duration: 600,
            ease: 'Back.easeOut'
        });

        // Level & Time info
        const levelLabel = 'The Park';
        const infoFS = Math.round(24 * s);
        this.add.text(width / 2, Math.round(150 * s), `${levelLabel}  |  ⏱ ${this.completionTime}s`, {
            fontFamily: '"Press Start 2P"',
            fontSize: `${infoFS}px`,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: Math.round(3 * s)
        }).setOrigin(0.5);

        // Stars Display (animated pop-in)
        this.displayStars(width / 2, Math.round(230 * s));

        // Leaderboard section
        this.showLeaderboard(width, height);

        // Buttons
        const nextLevel = this.level + 1;
        const hasNextLevel = false; // Only one level now
        
        if (hasNextLevel) {
            this.createButton(width / 2 - Math.round(220 * s), height - Math.round(85 * s), 'NEXT LEVEL ▶', '#00ff00', () => {
                this.scene.start('GameScene', { playerType: this.playerType, level: nextLevel });
            }, Math.round(380 * s));
            
            this.createButton(width / 2 + Math.round(220 * s), height - Math.round(85 * s), 'RETRY 🔄', '#ffaa00', () => {
                this.scene.start('GameScene', { playerType: this.playerType, level: this.level });
            }, Math.round(250 * s));
        } else {
            // Final level completed
            title.setText('🎉 QUEST COMPLETE! 🎉');
            
            // Personalized Message
            const msgFS = Math.round(14 * s);
            const personalMsg = "Well done you have completed the quest,\nclick access invite using code 100426 to view your wedding invitation,\n dont forget to enter full name";
            this.add.text(width / 2, height - Math.round(190 * s), personalMsg, {
                fontFamily: '"Press Start 2P"',
                fontSize: `${msgFS}px`,
                color: '#ffffff',
                align: 'center',
                lineSpacing: Math.round(10 * s),
                stroke: '#000000',
                strokeThickness: Math.round(3 * s),
                wordWrap: { width: width * 0.85 }
            }).setOrigin(0.5);

            const btnY = height - Math.round(75 * s);
            const btnSpacing = Math.round(320 * s);
            const btnW = Math.round(280 * s);
            
            this.createButton(width / 2 - btnSpacing, btnY, 'RETRY 🔄', '#ffaa00', () => {
                this.scene.start('GameScene', { playerType: this.playerType, level: this.level });
            }, btnW);

            this.createButton(width / 2, btnY, 'ACCESS INVITE 💌', '#ff69b4', () => {
                window.open('https://theknot.com/annelineandstephenwedding', '_blank');
            }, Math.round(400 * s));

            this.createButton(width / 2 + btnSpacing, btnY, 'MAIN MENU', '#ffffff', () => {
                this.scene.start('MenuScene');
            }, btnW);
        }
    }

    createLoseScreen(width, height) {
        const s = this.s;
        
        // Title
        const titleFS = Math.round(64 * s);
        const title = this.add.text(width / 2, Math.round(120 * s), 'GAME OVER', {
            fontFamily: '"Press Start 2P"',
            fontSize: `${titleFS}px`,
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: Math.round(8 * s)
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
        
        const msgFS = Math.round(24 * s);
        this.add.text(width / 2, height / 2 - Math.round(40 * s), msg, {
            fontFamily: '"Press Start 2P"',
            fontSize: `${msgFS}px`,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: Math.round(4 * s),
            wordWrap: { width: width * 0.75 },
            align: 'center'
        }).setOrigin(0.5);

        // Level info
        const levelLabel = 'The Park';
        const lvlFS = Math.round(20 * s);
        this.add.text(width / 2, height / 2 + Math.round(30 * s), `Level: ${levelLabel}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: `${lvlFS}px`,
            color: '#aaaaaa',
            stroke: '#000000',
            strokeThickness: Math.round(2 * s)
        }).setOrigin(0.5);

        // Buttons - Retry + Menu
        const btnY = height - Math.round(100 * s);
        const btnSpacing = Math.round(260 * s);
        const btnW = Math.round(340 * s);
        
        this.createButton(width / 2 - btnSpacing, btnY, '🔄 RETRY', '#ff6600', () => {
            this.scene.start('GameScene', { playerType: this.playerType, level: this.level });
        }, btnW);

        this.createButton(width / 2 + btnSpacing, btnY, '🏠 MENU', '#ff69b4', () => {
            this.scene.start('MenuScene');
        }, btnW);

        // Keyboard shortcut hints
        const hintFS = Math.round(14 * s);
        this.add.text(width / 2, height - Math.round(25 * s), this.isMobile ? '' : 'Press ENTER to retry', {
            fontFamily: '"Press Start 2P"',
            fontSize: `${hintFS}px`,
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
            const emojiFS = Math.round(28 * this.s);
            const txt = this.add.text(x, -30, emoji, { fontSize: `${emojiFS}px` });
            
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
        const s = this.s;
        const lbTitleFS = Math.round(22 * s);
        const lbStartY = Math.round(320 * s);
        
        this.add.text(width / 2, lbStartY, 'TOP FASTEST ARRIVALS', {
            fontFamily: '"Press Start 2P"',
            fontSize: `${lbTitleFS}px`,
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: Math.round(3 * s)
        }).setOrigin(0.5);

        const leaderboard = JSON.parse(localStorage.getItem('wedding-leaderboard') || '[]');
        const playerName = localStorage.getItem('wedding-player-name') || 'YOU';
        
        // Filter to same level for relevance
        const levelEntries = leaderboard.filter(e => e.level === this.level).slice(0, 5);
        const entriesToShow = levelEntries.length > 0 ? levelEntries : leaderboard.slice(0, 5);
        
        const entryFS = Math.round(16 * s);
        const entrySpacing = Math.round(38 * s);
        const entriesStartY = lbStartY + Math.round(55 * s);
        
        entriesToShow.forEach((entry, index) => {
            const entryLvl = 'Park';
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
            const entryText = `${medal} ${entry.name || playerName} - ${entry.time}s (${entryLvl})`;
            this.add.text(width / 2, entriesStartY + (index * entrySpacing), entryText, {
                fontFamily: '"Press Start 2P"',
                fontSize: `${entryFS}px`,
                color: index === 0 ? '#ffd700' : '#ffffff',
                stroke: '#000000',
                strokeThickness: Math.round(2 * s)
            }).setOrigin(0.5);
        });
    }

    displayStars(x, y) {
        const s = this.s;
        const starCount = this.stars;
        const spacing = Math.round(90 * s);
        const startX = x - spacing;
        const starFS = Math.round(55 * s);

        for (let i = 0; i < 3; i++) {
            const earned = i < starCount;
            const star = this.add.text(startX + i * spacing, y, '★', {
                fontFamily: '"Press Start 2P"',
                fontSize: `${starFS}px`,
                color: earned ? '#ffd700' : '#333333',
                stroke: '#000000',
                strokeThickness: Math.round(4 * s)
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
        const rankFS = Math.round(22 * s);
        const rank = this.add.text(x, y + Math.round(55 * s), rankText, {
            fontFamily: '"Press Start 2P"',
            fontSize: `${rankFS}px`,
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: Math.round(3 * s)
        }).setOrigin(0.5).setAlpha(0);
        
        this.tweens.add({
            targets: rank,
            alpha: 1,
            duration: 400,
            delay: 1800
        });
    }

    createButton(x, y, label, color, callback, btnWidth = 400) {
        const s = this.s;
        const btnH = Math.round(75 * s);
        const btnFS = Math.round(22 * s);
        const btnStroke = Math.round(3 * s);
        
        const button = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, btnWidth, btnH, 0x000000, 0.8)
            .setStrokeStyle(btnStroke, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', callback)
            .on('pointerover', () => { bg.setStrokeStyle(btnStroke, color); text.setScale(1.05); })
            .on('pointerout', () => { bg.setStrokeStyle(btnStroke, 0xffffff); text.setScale(1); });

        const text = this.add.text(0, 0, label, {
            fontFamily: '"Press Start 2P"',
            fontSize: `${btnFS}px`,
            color: color,
            stroke: '#000000',
            strokeThickness: Math.round(2 * s)
        }).setOrigin(0.5);

        button.add([bg, text]);
        return button;
    }
}