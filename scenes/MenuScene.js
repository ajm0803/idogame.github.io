import Phaser from 'phaser';
import { audioManager } from '../AudioManager.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const { width, height } = this.scale;
        const isMobile = this.sys.game.device.input.touch;
        const s = isMobile ? 1.5 : 1; // UI scale multiplier
        
        // Remove any leftover input elements
        const oldInputs = document.querySelectorAll('input[style*="z-index"]');
        oldInputs.forEach(el => el.remove());

        // One-time interaction to start music
        this.input.once('pointerdown', async () => {
            await audioManager.init();
            audioManager.startMusic(0); // Start Menu music
        });

        // Background
        this.add.image(width / 2, height / 2, 'background').setDisplaySize(width, height);
        
        // Animated particles/confetti in background
        this.createBackgroundFlair();

        // Title with shadow
        const titleFS = Math.round(56 * s);
        const titleStroke = Math.round(8 * s);
        const titleLineSpacing = Math.round(15 * s);
        this.add.text(width / 2 + 4, height * 0.22 + 4, 'Anneline & Stephens Invitation\nWedding Quest.', {
            fontFamily: '"Press Start 2P"',
            fontSize: `${titleFS}px`,
            color: '#000000',
            align: 'center',
            lineSpacing: titleLineSpacing,
            wordWrap: { width: width * 0.9 }
        }).setOrigin(0.5).setAlpha(0.4);
        
        const titleText = this.add.text(width / 2, height * 0.22, 'Anneline & Stephens Invitation\nWedding Quest.', {
            fontFamily: '"Press Start 2P"',
            fontSize: `${titleFS}px`,
            color: '#ff69b4',
            stroke: '#000000',
            strokeThickness: titleStroke,
            align: 'center',
            lineSpacing: titleLineSpacing,
            wordWrap: { width: width * 0.9 }
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
        const nameLabelFS = Math.round(24 * s);
        const nameLabel = this.add.text(width / 2, height / 2 - Math.round(120 * s), 'ENTER YOUR NAME:', {
            fontFamily: '"Press Start 2P"',
            fontSize: `${nameLabelFS}px`,
            color: '#5e593eff'
        }).setOrigin(0.5);
    

        const savedName = localStorage.getItem('wedding-player-name') || '';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = '';
        input.placeholder = 'Your Name';
        input.maxLength = 15;
        input.style.position = 'absolute';
        input.style.left = '50%';
        input.style.top = '48%';
        input.style.transform = 'translate(-50%, -50%)';
        input.style.padding = isMobile ? '14px' : '10px';
        input.style.fontSize = isMobile ? '28px' : '24px';
        input.style.fontFamily = '"Press Start 2P"';
        input.style.textAlign = 'center';
        input.style.border = '4px solid #ff69b4';
        input.style.borderRadius = '8px';
        input.style.backgroundColor = '#000';
        input.style.color = '#fff';
        input.style.zIndex = '100';
        input.style.outline = 'none';
        input.style.width = isMobile ? '80%' : '300px';
        input.style.maxWidth = '400px';
        input.style.boxSizing = 'border-box';
        document.body.appendChild(input);
        
        // Store reference for cleanup
        this.nameInput = input;

        const goFS = Math.round(40 * s);
        const nextButton = this.add.text(width / 2, height / 2 + Math.round(120 * s), "LET'S GO!", {
            fontFamily: '"Press Start 2P"',
            fontSize: `${goFS}px`,
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: Math.round(4 * s),
            padding: { y: Math.round(10 * s) }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        nextButton.on('pointerover', () => nextButton.setColor('#ffd700'));
        nextButton.on('pointerout', () => nextButton.setColor('#00ff00'));
        
        nextButton.on('pointerdown', async () => {
            await audioManager.init();
            audioManager.startMusic(0); // Ensure menu music is playing
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
            this.skipHint = this.add.text(width / 2, height / 2 + Math.round(210 * s), isMobile ? 'Tap above to continue' : 'Press ENTER to continue', {
                fontFamily: '"Press Start 2P"',
                fontSize: `${Math.round(16 * s)}px`,
                color: '#aaaaaa'
            }).setOrigin(0.5);
            this.tweens.add({ targets: this.skipHint, alpha: 0.3, duration: 1000, yoyo: true, repeat: -1 });
        }

        // Selector Ring
        const selector = this.add.text(0, 0, '💍', { fontSize: `${Math.round(48 * s)}px` }).setOrigin(0.5).setVisible(false);

        // --- CHARACTER SELECTION GROUP ---
        const charSelectContainer = this.add.container(0, 0).setVisible(false);
        const charSpacing = Math.round(250 * s);
        const charTitle = this.add.text(width / 2, Math.round(150 * s), 'TAP MOBILE SCREEN TO JUMP', {
            fontFamily: '"Press Start 2P"',
            fontSize: `${Math.round(32 * s)}px`,
            color: '#ff0000ff',
            stroke: '#000000',
            strokeThickness: Math.round(4 * s)
        }).setOrigin(0.5);

        const brideOption = this.add.sprite(width / 2 - charSpacing, height / 2, 'bride').setScale(0.35 * s).setInteractive({ useHandCursor: true });
        const groomOption = this.add.sprite(width / 2 + charSpacing, height / 2, 'groom').setScale(0.20 * s).setInteractive({ useHandCursor: true });
        
        const charLabelFS = Math.round(28 * s);
        const brideLabel = this.add.text(width / 2 - charSpacing, height / 2 + Math.round(220 * s), 'BRIDE', {
            fontFamily: '"Press Start 2P"', fontSize: `${charLabelFS}px`, color: '#ffffff',
            stroke: '#000000', strokeThickness: Math.round(3 * s)
        }).setOrigin(0.5);

        const groomLabel = this.add.text(width / 2 + charSpacing, height / 2 + Math.round(220 * s), 'GROOM', {
            fontFamily: '"Press Start 2P"', fontSize: `${charLabelFS}px`, color: '#ffffff',
            stroke: '#000000', strokeThickness: Math.round(3 * s)
        }).setOrigin(0.5);

        this.selectedPlayerType = 'bride';

        const updateCharSelection = (type) => {
            this.selectedPlayerType = type;
            brideLabel.setColor(type === 'bride' ? '#ffd700' : '#ffffff');
            groomLabel.setColor(type === 'groom' ? '#ffd700' : '#ffffff');
            brideOption.setAlpha(type === 'bride' ? 1 : 0.5);
            groomOption.setAlpha(type === 'groom' ? 1 : 0.5);
            brideOption.setScale(type === 'bride' ? 0.38 * s : 0.32 * s);
            groomOption.setScale(type === 'groom' ? 0.22 * s : 0.18 * s);
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
        const menuLinkFS = Math.round(40 * s);
        const menuLinkSpacing = Math.round(110 * s);

        const createLink = (x, y, label, callback) => {
            const text = this.add.text(x, y, label, {
                fontFamily: '"Press Start 2P"',
                fontSize: `${menuLinkFS}px`,
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: Math.round(4 * s),
                padding: { y: Math.round(8 * s) }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            text.on('pointerover', () => {
                updateSelection(links.indexOf(text));
            });

            text.on('pointerdown', callback);
            return text;
        };

        const menuStartY = height / 2 - Math.round(20 * s);
        const startGameLink = createLink(width / 2, menuStartY, 'START GAME', () => {
            input.remove();
            this.scene.start('GameScene', { playerType: this.selectedPlayerType, level: 1 });
        });

        const leaderboardLink = createLink(width / 2, menuStartY + menuLinkSpacing, 'LEADERBOARD', () => {
            input.remove();
            this.scene.start('LeaderboardScene');
        });

        const heroLink = createLink(width / 2, menuStartY + menuLinkSpacing * 2, 'CHANGE HERO', () => {
            mainMenuContainer.setVisible(false);
            selector.setVisible(false);
            showCharacterSelection();
        });

        mainMenuLinks.push(startGameLink, leaderboardLink, heroLink);

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
                    selector.setPosition(link.x - link.width / 2 - Math.round(60 * s), link.y);
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
        const instrFS = Math.round(16 * s);
        this.add.text(width / 2, height * 0.93, isMobile ? '📱 Tap to interact' : '⌨️ Arrows + ENTER  |  📱 Touch Supported', {
            fontFamily: '"Press Start 2P"',
            fontSize: `${instrFS}px`,
            color: '#ffffff',
            align: 'center',
            stroke: '#000000',
            strokeThickness: Math.round(2 * s)
        }).setOrigin(0.5);
    }
    
    createBackgroundFlair() {
        const { width, height } = this.scale;
        const isMobile = this.sys.game.device.input.touch;
        const s = isMobile ? 1.5 : 1;
        const emojis = ['💍', '❤️', '✨', '💕', '🌸', '🎀'];
        const emojiFS = Math.round(28 * s);
        
        for (let i = 0; i < 8; i++) {
            const x = Phaser.Math.Between(50, width - 50);
            const emoji = Phaser.Utils.Array.GetRandom(emojis);
            const txt = this.add.text(x, height + 30, emoji, { fontSize: `${emojiFS}px` }).setAlpha(0.4);
            
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

    createButton(x, y, label, color, callback, btnWidth = 300) {
        const isMobile = this.sys.game.device.input.touch;
        const s = isMobile ? 1.5 : 1;
        const scaledW = Math.round(btnWidth * s);
        const scaledH = Math.round(100 * s);
        const btnFS = Math.round(32 * s);
        const strokeW = Math.round(4 * s);
        
        const button = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, scaledW, scaledH, 0x000000, 0.7)
            .setStrokeStyle(strokeW, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', callback)
            .on('pointerover', () => bg.setStrokeStyle(strokeW, color))
            .on('pointerout', () => bg.setStrokeStyle(strokeW, 0xffffff));

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