import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // === PROGRESS BAR ===
        const { width, height } = this.scale;
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 200, height / 2 - 25, 400, 50);
        
        const loadingText = this.add.text(width / 2, height / 2 - 60, 'Loading Wedding Quest...', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ff69b4'
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xff69b4, 1);
            progressBar.fillRect(width / 2 - 195, height / 2 - 20, 390 * value, 40);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        // === PARK BACKGROUNDS (5 variants for visual variety) ===
        this.load.image('background', 'https://rosebud.ai/assets/whimsical-park-bg.webp?JIro');
        this.load.image('park-autumn-bg', 'https://rosebud.ai/assets/park-autumn-bg.webp.webp?fLa8');
        this.load.image('park-sunset-bg', 'https://rosebud.ai/assets/park-sunset-bg.webp.webp?viHl');
        this.load.image('park-garden-bg', 'https://rosebud.ai/assets/park-garden-bg.webp.webp?Z6YV');
        this.load.image('park-night-bg', 'https://rosebud.ai/assets/park-night-bg.webp.webp?uUfa');
        
        // Load bridesmaid and bouquet
        this.load.image('bridesmaid', 'https://rosebud.ai/assets/bridesmaid-red-dress-blonde.webp?E3wl');
        this.load.image('bouquet', 'https://rosebud.ai/assets/wedding-bouquet.webp?caA9');
        this.load.image('beer', 'https://rosebud.ai/assets/beer-powerup.webp?LJfX');
        this.load.image('heart', 'https://rosebud.ai/assets/heart-item.webp?1Skw');
        this.load.image('chocolate', 'https://rosebud.ai/assets/chocolate-item.webp?6S86');
        this.load.image('steak', 'https://rosebud.ai/assets/steak-item.webp?VkkC');
        this.load.image('brandy', 'https://rosebud.ai/assets/brandy-item.webp?0b9G');
        this.load.image('key', 'https://rosebud.ai/assets/wedding-key-item.webp?7bPp');
        this.load.image('ring', 'https://rosebud.ai/assets/wedding-ring-item.webp?T5rR');
        this.load.image('church', 'https://rosebud.ai/assets/whimsical-church-venue.webp?LwQf');
        this.load.image('obstacle', 'https://rosebud.ai/assets/park-statue-obstacle.webp?uCZr');
        this.load.image('champagne', 'https://rosebud.ai/assets/champagne-powerup.webp?dTxo');
        
        // Flower seller enemy (nightclub)
        this.load.image('flower-seller', 'https://rosebud.ai/assets/flower-seller.webp?aCXv');
        
        // Park level collectibles & dog
        this.load.image('rose', 'https://rosebud.ai/assets/rose-item.webp?VryA');
        this.load.image('chasing-dog', 'https://rosebud.ai/assets/chasing-dog.webp?EPna');
        
        // Nightclub level assets
        this.load.image('nightclub-bg', 'https://rosebud.ai/assets/nightclub-bg.webp?sr4L');
        this.load.image('dj', 'https://rosebud.ai/assets/dj-character-sprite.webp?o7q6');
        this.load.image('nightclub-table', 'https://rosebud.ai/assets/nightclub-table.webp?3RS6');
        this.load.image('exit-door', 'https://rosebud.ai/assets/exit-door.webp?d40K');
        this.load.image('secret-door', 'https://rosebud.ai/assets/secret-door.webp?21M4');
        
        // Rhythm assets
        this.load.image('rhythm-arrow-up', 'https://rosebud.ai/assets/rhythm-arrow-up.webp?A7fX');
        this.load.image('rhythm-arrow-down', 'https://rosebud.ai/assets/rhythm-arrow-down.webp?aclD');
        this.load.image('rhythm-arrow-left', 'https://rosebud.ai/assets/rhythm-arrow-left.webp?MM59');
        this.load.image('rhythm-arrow-right', 'https://rosebud.ai/assets/rhythm-arrow-right.webp?vTv5');
        
        // === BRIDE & GROOM — single clean images ===
        this.load.spritesheet('bride', 'https://rosebud.ai/assets/bride-idle-strip2.webp?xcVg', {
            frameWidth: 235,
            frameHeight: 569,
            margin: 0,
            spacing: 0
        });

        this.load.spritesheet('groom', 'https://rosebud.ai/assets/groom-blonde-sprite.webp?0oxc', {
            frameWidth: 319,
            frameHeight: 889,
            margin: 0,
            spacing: 0
        });
    }

    create() {
        this.createCharacterAnims('bride');
        this.createCharacterAnims('groom');
        this.scene.start('MenuScene');
    }

    createCharacterAnims(type) {
        if (this.anims.exists(`${type}-idle`)) return;

        // Single frame spritesheets — all animations use frame 0
        this.anims.create({ key: `${type}-idle`,  frames: this.anims.generateFrameNumbers(type, { frames: [0] }),    frameRate: 4,  repeat: -1 });
        this.anims.create({ key: `${type}-walk`,  frames: this.anims.generateFrameNumbers(type, { frames: [0] }),    frameRate: 8,  repeat: -1 });
        this.anims.create({ key: `${type}-run`,   frames: this.anims.generateFrameNumbers(type, { frames: [0] }),    frameRate: 14, repeat: -1 });
        this.anims.create({ key: `${type}-jump`,  frames: this.anims.generateFrameNumbers(type, { frames: [0] }),    frameRate: 4,  repeat: 0  });
        this.anims.create({ key: `${type}-hit`,   frames: this.anims.generateFrameNumbers(type, { frames: [0] }),    frameRate: 8,  repeat: 0  });
        this.anims.create({ key: `${type}-smile`, frames: this.anims.generateFrameNumbers(type, { frames: [0] }),    frameRate: 5,  repeat: -1 });
    }
}
