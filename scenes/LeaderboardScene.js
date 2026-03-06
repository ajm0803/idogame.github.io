import Phaser from 'phaser';

export default class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super('LeaderboardScene');
    }

    create() {
        const { width, height } = this.scale;

        // Background
        this.add.image(width / 2, height / 2, 'background').setDisplaySize(width, height);

        // Floating Whimsical Elements
        this.createFloatingElements();

        // Title
        const title = this.add.text(width / 2, 80, 'GLOBAL WEDDING HALL OF FAME', {
            fontFamily: '"Press Start 2P"',
            fontSize: '40px',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);

        // Glowing effect for title
        this.tweens.add({
            targets: title,
            alpha: 0.7,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // Stats Summary
        const totalStars = this.calculateTotalStars();
        this.add.text(width / 2, 160, `YOUR TOTAL STARS: ${totalStars} / 33`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Leaderboard Headers
        const headerY = 240;
        const col1 = width * 0.12;
        const col2 = width * 0.22;
        const col3 = width * 0.42;
        const col4 = width * 0.62;
        const col5 = width * 0.75;
        const col6 = width * 0.88;

        const headerStyle = {
            fontFamily: '"Press Start 2P"',
            fontSize: '18px',
            color: '#ff69b4'
        };

        this.add.text(col1, headerY, 'RANK', headerStyle).setOrigin(0.5);
        this.add.text(col2, headerY, 'LOC', headerStyle).setOrigin(0.5);
        this.add.text(col3, headerY, 'PLAYER', headerStyle).setOrigin(0.5);
        this.add.text(col4, headerY, 'TIME', headerStyle).setOrigin(0.5);
        this.add.text(col5, headerY, 'STARS', headerStyle).setOrigin(0.5);
        this.add.text(col6, headerY, 'TOTAL ★', headerStyle).setOrigin(0.5);

        // Combine Local and Mock Global Data
        const leaderboardData = this.getLeaderboardData();
        
        leaderboardData.forEach((entry, index) => {
            const y = 300 + (index * 50);
            const isPlayer = entry.isPlayer;
            const rowStyle = {
                fontFamily: '"Press Start 2P"',
                fontSize: '16px',
                color: isPlayer ? '#00ff00' : '#ffffff'
            };

            this.add.text(col1, y, `#${index + 1}`, rowStyle).setOrigin(0.5);
            this.add.text(col2, y, entry.region, rowStyle).setOrigin(0.5);
            this.add.text(col3, y, entry.name.toUpperCase(), rowStyle).setOrigin(0.5);
            this.add.text(col4, y, entry.time === '--' ? '--' : `${entry.time}s`, rowStyle).setOrigin(0.5);
            this.add.text(col5, y, '★'.repeat(entry.stars), rowStyle).setOrigin(0.5);
            this.add.text(col6, y, entry.totalStars.toString(), rowStyle).setOrigin(0.5);

            if (isPlayer) {
                this.add.rectangle(width / 2, y, width * 0.9, 40, 0x00ff00, 0.1).setDepth(-1);
            }
        });

        // Back button
        this.createButton(width / 2, height - 80, 'BACK TO MENU', '#ffffff', () => {
            this.scene.start('MenuScene');
        });
    }

    createFloatingElements() {
        const { width, height } = this.scale;
        const emojis = ['❤️', '💍', '✨', '💕'];
        
        for (let i = 0; i < 15; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const emoji = Phaser.Utils.Array.GetRandom(emojis);
            
            const txt = this.add.text(x, y, emoji, { fontSize: '32px' }).setAlpha(0.3);
            
            this.tweens.add({
                targets: txt,
                y: y - 100,
                x: x + Phaser.Math.Between(-50, 50),
                alpha: 0,
                duration: Phaser.Math.Between(3000, 6000),
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    calculateTotalStars() {
        let total = 0;
        for (let i = 1; i <= 11; i++) {
            total += parseInt(localStorage.getItem(`wedding-level-${i}-stars`) || '0');
        }
        return total;
    }

    getLeaderboardData() {
        // Mock Global Data with Regions
        const mockData = [
            { name: 'RosebudAI', time: '12.4', stars: 3, totalStars: 30, region: '🇺🇸', isPlayer: false },
            { name: 'SpeedyGroom', time: '14.1', stars: 3, totalStars: 28, region: '🇬🇧', isPlayer: false },
            { name: 'HeartCatcher', time: '15.8', stars: 3, totalStars: 27, region: '🇯🇵', isPlayer: false },
            { name: 'ChampagnePop', time: '18.2', stars: 2, totalStars: 25, region: '🇫🇷', isPlayer: false },
            { name: 'CakeTester', time: '22.5', stars: 2, totalStars: 22, region: '🇩🇪', isPlayer: false }
        ];

        // Combine with all local leaderboard entries
        const localLeaderboard = JSON.parse(localStorage.getItem('wedding-leaderboard') || '[]');
        const careerTotalStars = this.calculateTotalStars();
        
        const localEntries = localLeaderboard.map(entry => {
            const levelStars = parseInt(localStorage.getItem(`wedding-level-${entry.level}-stars`) || '0');
            return {
                name: `${entry.name} (${entry.player})`,
                time: entry.time.toString(),
                stars: levelStars,
                totalStars: careerTotalStars, // Career total for current local user context
                region: '📍',
                isPlayer: true
            };
        });

        // Merge, sort, and slice
        const combined = [...mockData, ...localEntries].sort((a, b) => {
            if (b.totalStars !== a.totalStars) {
                return b.totalStars - a.totalStars;
            }
            return parseFloat(a.time || 999) - parseFloat(b.time || 999);
        });

        return combined.slice(0, 10);
    }

    createButton(x, y, label, color, callback) {
        const button = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, 400, 80, 0x000000, 0.7)
            .setStrokeStyle(4, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', callback)
            .on('pointerover', () => bg.setStrokeStyle(4, '#ff69b4'))
            .on('pointerout', () => bg.setStrokeStyle(4, 0xffffff));

        const text = this.add.text(0, 0, label, {
            fontFamily: '"Press Start 2P"',
            fontSize: '24px',
            color: color
        }).setOrigin(0.5);

        button.add([bg, text]);
        return button;
    }
}