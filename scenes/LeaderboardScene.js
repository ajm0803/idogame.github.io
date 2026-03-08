import Phaser from 'phaser';

export default class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super('LeaderboardScene');
    }

    get isMobile() { return this.sys.game.device.input.touch; }
    get s() { return this.isMobile ? 1.5 : 1; }

    create() {
        const { width, height } = this.scale;
        const s = this.s;

        // Background
        this.add.image(width / 2, height / 2, 'background').setDisplaySize(width, height);
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);

        // Title
        const titleFS = Math.round(48 * s);
        this.add.text(width / 2, Math.round(80 * s), '🏆 HALL OF FAME 🏆', {
            fontFamily: '"Press Start 2P"',
            fontSize: `${titleFS}px`,
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: Math.round(8 * s),
            wordWrap: { width: width * 0.9 },
            align: 'center'
        }).setOrigin(0.5);

        const subFS = Math.round(20 * s);
        this.add.text(width / 2, Math.round(150 * s), 'Fastest Wedding Arrivals', {
            fontFamily: '"Press Start 2P"',
            fontSize: `${subFS}px`,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: Math.round(2 * s)
        }).setOrigin(0.5);

        // Header
        const headerFS = Math.round(20 * s);
        const headerY = Math.round(220 * s);
        const headerStyle = { fontFamily: '"Press Start 2P"', fontSize: `${headerFS}px`, color: '#ff69b4', stroke: '#000000', strokeThickness: Math.round(2 * s) };
        this.add.text(width * 0.25, headerY, 'RANK', headerStyle).setOrigin(0.5);
        this.add.text(width * 0.45, headerY, 'GUEST NAME', headerStyle).setOrigin(0.5);
        this.add.text(width * 0.75, headerY, 'TIME', headerStyle).setOrigin(0.5);

        const leaderboard = JSON.parse(localStorage.getItem('wedding-leaderboard') || '[]');
        
        const rowFS = Math.round(20 * s);
        const rowSpacing = Math.round(55 * s);
        const rowStartY = Math.round(280 * s);

        if (leaderboard.length === 0) {
            this.add.text(width / 2, height / 2, 'NO RECORDS YET. BE THE FIRST!', {
                fontFamily: '"Press Start 2P"',
                fontSize: `${Math.round(24 * s)}px`,
                color: '#aaaaaa',
                stroke: '#000000',
                strokeThickness: Math.round(3 * s),
                wordWrap: { width: width * 0.8 },
                align: 'center'
            }).setOrigin(0.5);
        } else {
            leaderboard.forEach((entry, index) => {
                if (index >= 10) return; // Top 10 only
                
                const y = rowStartY + (index * rowSpacing);
                const color = index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#ffffff';
                const rowStyle = { fontFamily: '"Press Start 2P"', fontSize: `${rowFS}px`, color: color, stroke: '#000000', strokeThickness: Math.round(2 * s) };

                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1).toString();
                
                this.add.text(width * 0.25, y, medal, rowStyle).setOrigin(0.5);
                this.add.text(width * 0.45, y, entry.name.toUpperCase(), rowStyle).setOrigin(0.5);
                this.add.text(width * 0.75, y, `${entry.time}s`, rowStyle).setOrigin(0.5);

                // Add character icon next to name
                const iconFS = Math.round(24 * s);
                const icon = entry.player === 'bride' ? '💍' : '🤵';
                this.add.text(width * 0.35, y, icon, { fontSize: `${iconFS}px` }).setOrigin(0.5);
            });
        }

        // Back Button
        const backFS = Math.round(30 * s);
        const backBtn = this.add.text(width / 2, height - Math.round(100 * s), '◀ BACK TO MENU', {
            fontFamily: '"Press Start 2P"',
            fontSize: `${backFS}px`,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: Math.round(4 * s),
            padding: { y: Math.round(10 * s) }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backBtn.on('pointerover', () => backBtn.setColor('#ff69b4'));
        backBtn.on('pointerout', () => backBtn.setColor('#ffffff'));
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

        // Keyboard Shortcut
        this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));
        this.input.keyboard.on('keydown-BACKSPACE', () => this.scene.start('MenuScene'));
    }
}