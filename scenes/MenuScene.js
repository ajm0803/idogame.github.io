import Phaser from 'phaser';
import { audioManager } from '../AudioManager.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const { width, height } = this.scale;
        
        // Remove any leftover input elements
        const oldInputs = document.querySelectorAll('input[style*="z-index"]');
        oldInputs.forEach(el => el.remove());

        // Background
        this.add.image(width / 2, height / 2, 'background').setDisplaySize(width, height);
        
        // Animated particles/confetti in background
        this.createBackgroundFlair();

        // Title with shadow
        this.add.text(width / 2 + 4, height / 4 + 4, 'Anneline & Stephens Great\nWedding Quest', {
            fontFamily: '"Press Start 2P"',
            fontSize: '56px',
            color: '#000000',
            align: 'center',
            lineSpacing: 15
        }).setOrigin(0.5).setAlpha(0.4);
        
        const titleText = this.add.text(width / 2, height / 4, 'Anneline & Stephens Great\nWedding Quest', {
            fontFamily: '"Press Start 2P"',
            fontSize: '56px',
            color: '#ff69b4',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
            lineSpacing: 15
        }).setOrigin(0.5);
        
        // Gentle title pulse
        this.tweens.add({
            targets: titleText,
            scaleX: 1.03,
            scaleY: 1.03,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // --- NAME ENTRY UI GROUP ---
        const nameLabel = this.add.text(width / 2, height / 2 - 120, 'ENTER YOUR NAME:', {
            fontFamily: '"Press Start 2P"',
            fontSize: '24px',
            color: '#5e593eff'
        }).setOrigin(0.5);

        const savedName = localStorage.getItem('wedding-player-name') || '';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = savedName;
        input.placeholder = 'Your Name';
        input.maxLength = 15;
        input.style.position = 'absolute';
        input.style.left = '50%';
        input.style.top = '48%';
        input.style.transform = 'translate(-50%, -50%)';
        input.style.padding = '10px';
        input.style.fontSize = '24px';
        input.style.fontFamily = '"Press Start 2P"';
        input.style.textAlign = 'center';
        input.style.border = '4px solid #ff69b4';
        input.style.borderRadius = '8px';
        input.style.backgroundColor = '#000';
        input.style.color = '#fff';
        input.style.zIndex = '100';
        input.style.outline = 'none';
        input.style.width = '300px';
        document.body.appendChild(input);
        
        // Store reference for cleanup
        this.nameInput = input;

        const nextButton = this.add.text(width / 2, height / 2 + 100, "LET'S GO!", {
            fontFamily: '"Press Start 2P"',
            fontSize: '40px',
            color: '#00ff00'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        nextButton.on('pointerover', () => nextButton.setColor('#ffd700'));
        nextButton.on('pointerout', () => nextButton.setColor('#00ff00'));
        
        nextButton.on('pointerdown', async () => {
            await audioManager.init();
            const name = input.value.trim();
            if (name.length > 0) {
                localStorage.setItem('wedding-player-name', name);
                input.style.display = 'none';
                nameLabel.visible = false;
                nextButton.visible = false;
                if (this.skipHint) this.skipHint.visible = false;
                showCharacterSelection();
            } else {
                input.style.borderColor = '#ff0000';
                this.cameras.main.shake(200, 0.01);
            }
        });

        // If name already saved, allow skipping straight to menu
        if (savedName.length > 0) {
            this.skipHint = this.add.text(width / 2, height / 2 + 180, 'Press ENTER to continue', {
                fontFamily: '"Press Start 2P"',
                fontSize: '14px',
                color: '#aaaaaa'
            }).setOrigin(0.5);
            this.tweens.add({ targets: this.skipHint, alpha: 0.3, duration: 1000, yoyo: true, repeat: -1 });
        }

        // Selector Ring
        const selector = this.add.text(0, 0, '💍', { fontSize: '48px' }).setOrigin(0.5).setVisible(false);

        // --- CHARACTER SELECTION GROUP ---
        const charSelectContainer = this.add.container(0, 0).setVisible(false);
        const charTitle = this.add.text(width / 2, 150, 'SELECT YOUR HERO', {
            fontFamily: '"Press Start 2P"',
            fontSize: '32px',
            color: '#ff0000ff'
        }).setOrigin(0.5);

        const brideOption = this.add.sprite(width / 2 - 200, height / 2, 'bride').setScale(0.35).setInteractive({ useHandCursor: true });
        const groomOption = this.add.sprite(width / 2 + 200, height / 2, 'groom').setScale(0.20).setInteractive({ useHandCursor: true });
        
        const brideLabel = this.add.text(width / 2 - 200, height / 2 + 200, 'BRIDE', {
            fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#ffffff'
        }).setOrigin(0.5);

        const groomLabel = this.add.text(width / 2 + 200, height / 2 + 200, 'GROOM', {
            fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#ffffff'
        }).setOrigin(0.5);

        this.selectedPlayerType = 'bride';

        const updateCharSelection = (type) => {
            this.selectedPlayerType = type;
            brideLabel.setColor(type === 'bride' ? '#ffd700' : '#ffffff');
            groomLabel.setColor(type === 'groom' ? '#ffd700' : '#ffffff');
            brideOption.setAlpha(type === 'bride' ? 1 : 0.5);
            groomOption.setAlpha(type === 'groom' ? 1 : 0.5);
            brideOption.setScale(type === 'bride' ? 0.38 : 0.32);
            groomOption.setScale(type === 'groom' ? 0.22 : 0.18);
        };

        brideOption.on('pointerdown', () => { updateCharSelection('bride'); confirmSelection(); });
        groomOption.on('pointerdown', () => { updateCharSelection('groom'); confirmSelection(); });

        const confirmSelection = () => {
            charSelectContainer.setVisible(false);
            showMainMenu();
        };

        charSelectContainer.add([charTitle, brideOption, groomOption, brideLabel, groomLabel]);

        // --- MAIN MENU LINKS GROUP ---
        const mainMenuContainer = this.add.container(0, 0).setVisible(false);
        const mainMenuLinks = [];

        const createLink = (x, y, label, callback) => {
            const text = this.add.text(x, y, label, {
                fontFamily: '"Press Start 2P"',
                fontSize: '40px',
                color: '#ffffff'
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            text.on('pointerover', () => {
                updateSelection(links.indexOf(text));
            });

            text.on('pointerdown', callback);
            return text;
        };

        const startGameLink = createLink(width / 2, height / 2, 'START GAME', () => {
            input.remove();
            this.scene.start('GameScene', { playerType: this.selectedPlayerType, level: 1 });
        });

        const leaderboardLink = createLink(width / 2, height / 2 + 100, 'LEADERBOARD', () => {
            input.remove();
            this.scene.start('LeaderboardScene');
        });

        mainMenuLinks.push(startGameLink, leaderboardLink);

        const heroLink = createLink(width / 2, height / 2 + 200, 'CHANGE HERO', () => {
            mainMenuContainer.setVisible(false);
            selector.setVisible(false);
            showCharacterSelection();
        });
        mainMenuLinks.push(heroLink);

        mainMenuContainer.add(mainMenuLinks);

        let currentMenu = 'none';
        let links = [];
        let currentIndex = 0;

        const updateSelection = (index) => {
            currentIndex = index;
            links.forEach((link, i) => {
                if (i === currentIndex) {
                    link.setColor('#ffd700');
                    selector.setVisible(true);
                    selector.setPosition(link.x - link.width / 2 - 60, link.y);
                } else {
                    link.setColor('#ffffff');
                }
            });
        };

        const showCharacterSelection = () => {
            currentMenu = 'charSelect';
            charSelectContainer.setVisible(true);
            updateCharSelection(this.selectedPlayerType);
        };

        const showMainMenu = () => {
            currentMenu = 'main';
            links = mainMenuLinks;
            mainMenuContainer.setVisible(true);
            updateSelection(0);
        };

        // Keyboard Input
        this.input.keyboard.on('keydown-UP', () => {
            if (currentMenu === 'none') return;
            const newIndex = (currentIndex - 1 + links.length) % links.length;
            updateSelection(newIndex);
        });

        this.input.keyboard.on('keydown-DOWN', () => {
            if (currentMenu === 'none') return;
            const newIndex = (currentIndex + 1) % links.length;
            updateSelection(newIndex);
        });

        this.input.keyboard.on('keydown-ENTER', () => {
            if (currentMenu === 'none') {
                if (nextButton.visible) {
                    nextButton.emit('pointerdown');
                }
                return;
            }
            links[currentIndex].emit('pointerdown');
        });

        // Instructions
        this.add.text(width / 2, height * 0.92, '⌨️ Arrows + ENTER  |  📱 Touch Supported', {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
    }
    
    createBackgroundFlair() {
        const { width, height } = this.scale;
        const emojis = ['💍', '❤️', '✨', '💕', '🌸', '🎀'];
        
        for (let i = 0; i < 8; i++) {
            const x = Phaser.Math.Between(50, width - 50);
            const emoji = Phaser.Utils.Array.GetRandom(emojis);
            const txt = this.add.text(x, height + 30, emoji, { fontSize: '28px' }).setAlpha(0.4);
            
            this.tweens.add({
                targets: txt,
                y: -50,
                x: x + Phaser.Math.Between(-100, 100),
                alpha: { from: 0.4, to: 0 },
                duration: Phaser.Math.Between(5000, 10000),
                repeat: -1,
                delay: Phaser.Math.Between(0, 5000)
            });
        }
    }

    shutdown() {
        // Clean up DOM input on scene change
        if (this.nameInput && this.nameInput.parentNode) {
            this.nameInput.remove();
        }
    }

    createButton(x, y, label, color, callback, width = 300) {
        const button = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, width, 100, 0x000000, 0.7)
            .setStrokeStyle(4, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', callback)
            .on('pointerover', () => bg.setStrokeStyle(4, color))
            .on('pointerout', () => bg.setStrokeStyle(4, 0xffffff));

        const text = this.add.text(0, 0, label, {
            fontFamily: '"Press Start 2P"',
            fontSize: '32px',
            color: color
        }).setOrigin(0.5);

        button.add([bg, text]);
        return button;
    }
}