import Phaser from 'phaser';

export default class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super('LeaderboardScene');
    }

    create() {
        const { width, height } = this.scale;

        // Background
        this.add.image(width / 2, height / 2, 'background').setDisplaySize(width, height);
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);

        // Title
        this.add.text(width / 2, 80, '🏆 HALL OF FAME 🏆', {
            fontFamily: '"Press Start 2P"',
            fontSize: '48px',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);

        this.add.text(width / 2, 140, 'Fastest Wedding Arrivals', {
            fontFamily: '"Press Start 2P"',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Header
        const headerStyle = { fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#ff69b4' };
        this.add.text(width * 0.25, 220, 'RANK', headerStyle).setOrigin(0.5);
        this.add.text(width * 0.45, 220, 'GUEST NAME', headerStyle).setOrigin(0.5);
        this.add.text(width * 0.75, 220, 'TIME', headerStyle).setOrigin(0.5);

        const leaderboard = JSON.parse(localStorage.getItem('wedding-leaderboard') || '[]');
        
        if (leaderboard.length === 0) {
            this.add.text(width / 2, height / 2, 'NO RECORDS YET. BE THE FIRST!', {
                fontFamily: '"Press Start 2P"',
                fontSize: '24px',
                color: '#aaaaaa'
            }).setOrigin(0.5);
        } else {
            leaderboard.forEach((entry, index) => {
                if (index >= 10) return; // Top 10 only
                
                const y = 280 + (index * 55);
                const color = index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#ffffff';
                const rowStyle = { fontFamily: '"Press Start 2P"', fontSize: '20px', color: color };

                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1).toString();
                
                this.add.text(width * 0.25, y, medal, rowStyle).setOrigin(0.5);
                this.add.text(width * 0.45, y, entry.name.toUpperCase(), rowStyle).setOrigin(0.5);
                this.add.text(width * 0.75, y, `${entry.time}s`, rowStyle).setOrigin(0.5);

                // Add character icon next to name
                const icon = entry.player === 'bride' ? '💍' : '🤵';
                this.add.text(width * 0.35, y, icon, { fontSize: '24px' }).setOrigin(0.5);
            });
        }

        // Back Button
        const backBtn = this.add.text(width / 2, height - 100, '◀ BACK TO MENU', {
            fontFamily: '"Press Start 2P"',
            fontSize: '28px',
            color: '#ffffff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backBtn.on('pointerover', () => backBtn.setColor('#ff69b4'));
        backBtn.on('pointerout', () => backBtn.setColor('#ffffff'));
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

        // Keyboard Shortcut
        this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));
        this.input.keyboard.on('keydown-BACKSPACE', () => this.scene.start('MenuScene'));
    }
}
