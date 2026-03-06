import Phaser from 'phaser';
import { audioManager } from '../AudioManager.js';

// Background mapping for park levels (levels 2-3)
const PARK_BACKGROUNDS = {
    2: 'background',        // Original whimsical park (Park 1)
    3: 'church-interior-bg', // Church Interior
};

// Ground/platform colors per theme
const GROUND_COLORS = {
    'background': 0x556b2f,
    'church-interior-bg': 0x8b0000, // Deep red for church carpet
    'park-garden-bg': 0x4a7c59,
    'park-autumn-bg': 0x8b6914,
    'park-sunset-bg': 0x5c3a1e,
    'park-night-bg': 0x2a2a4a,
};

const PLATFORM_COLORS = {
    'background': 0x8b4513,
    'church-interior-bg': 0xffd700, // Gold platforms for church
    'park-garden-bg': 0x6b8e23,
    'park-autumn-bg': 0xa0522d,
    'park-sunset-bg': 0x704214,
    'park-night-bg': 0x3b3b6b,
};

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init(data) {
        this.playerType = data.playerType || 'bride';
        this.level = data.level || 1;
        this.isNightclub = this.level === 1;
        this.itemsCollected = {
            rose: 0,
            chocolate: 0,
            heart: 0,
            ring: 0,
            steak: 0,
            brandy: 0
        };
        this.hasKey = false;
        this.hasRing = false;
        this.isGameOver = false;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.isShielded = false;
        this.shieldTimeRemaining = 0;
        this.doorSpawned = false;
        this.secretDoorRevealed = false;
        this.allHeartsCollected = false;
        this.flowerSellersSpawned = false;
        this.isInvulnerable = false;
        
        // Item keys based on player
        this.item1Key = this.playerType === 'groom' ? 'brandy' : 'rose';
        this.item2Key = this.playerType === 'groom' ? 'steak' : 'chocolate';
        
        // Park level required items (scales with level)
        // Park 1 (level 2) = 8 items
        const parkNum = Math.max(1, this.level - 1);
        this.requiredItem1 = 7 + parkNum;
        this.requiredItem2 = 7 + parkNum;
        
        // Dog chase state (park levels)
        this.dogsSpawnedCount = 0;
        this.lastDogChocolateThreshold = 0;
        this.parkKeyDropped = false;
        this.churchCooldown = false;
        
        // Speed boost
        this.isSpeedBoosted = false;
        this.speedBoostTime = 0;
        this.speedTrailTimer = null;
        
        // Touch controls state
        this.touchLeft = false;
        this.touchRight = false;
        this.touchJump = false;
        this.touchRun = false;
    }

    create() {
        const { width, height } = this.scale;

        this.startTime = this.time.now;
        
        // Background - themed per level
        const bgKey = this.isNightclub ? 'nightclub-bg' : (PARK_BACKGROUNDS[this.level] || 'background');
        this.currentBgKey = bgKey;
        this.add.image(width / 2, height / 2, bgKey).setDisplaySize(width, height).setScrollFactor(0).setDepth(-100);

        // Create dust particle texture (small soft circle)
        this.createDustTexture();

        // Physics Groups
        this.platforms = this.physics.add.staticGroup();
        this.items = this.physics.add.group();
        this.obstacles = this.physics.add.group();
        this.playersmaids = this.physics.add.group();
        this.bouquets = this.physics.add.group();
        this.powerUps = this.physics.add.group();
        this.keyGroup = this.physics.add.group();
        this.djGroup = this.physics.add.group();
        this.flowerSellers = this.physics.add.group();
        this.dogs = this.physics.add.group();
        this.tables = this.physics.add.staticGroup();
        this.doors = this.physics.add.staticGroup();

        // Create Platforms
        this.createLevel();

        // Church (Goal) — placed on ground level at the far right
        // Using a plain image (not physics) + distance check in update() for reliable interaction
        if (!this.isNightclub) {
            const groundSurface = height - 100;
            this.church = this.add.image(width * 5.8, groundSurface, 'church').setOrigin(0.5, 1).setScale(0.5).setDepth(1);
            this.churchZoneX = width * 5.8;
            this.churchZoneY = groundSurface - (this.church.displayHeight * 0.4);
            this.churchDoorOpen = false;
        }

        // Player setup — uses selected playerType spritesheet
        const startX = 100;
        const startY = height - 400;
        
        this.player = this.physics.add.sprite(startX, startY, this.playerType);
        const baseScale = this.playerType === 'groom' ? 0.20 : 0.30;
        this.player.setScale(baseScale);
        this.player.setCollideWorldBounds(true).setDepth(200);
        this.player.body.setGravityY(1000);
        this.player.setAlpha(1);
        
        this.currentAnimKey = '';

        // OPTIMIZED HITBOX — consistent per character type
        this.player.body.setSize(this.player.width * 0.45, this.player.height * 0.85);
        this.player.body.setOffset(this.player.width * 0.275, this.player.height * 0.12);

        // === DUST / TRAIL PARTICLE EMITTER for running ===
        // Theme-aware dust colors
        const dustTints = this.isNightclub
            ? [0xff69b4, 0xda70d6, 0xff1493, 0xba55d3]    // Neon pink/purple for nightclub
            : this.getDustTintsForBg(this.currentBgKey);
        
        this.dustEmitter = this.add.particles(0, 0, 'dust-particle', {
            follow: this.player,
            followOffset: { x: 0, y: 60 },  // Emit from feet area
            frequency: -1,                   // Manual emission only
            lifespan: { min: 300, max: 600 },
            speed: { min: 15, max: 50 },
            angle: { min: 220, max: 320 },   // Spread upward and outward
            scale: { start: 0.8, end: 0.1 },
            alpha: { start: 0.6, end: 0 },
            gravityY: -30,                   // Slight upward drift
            tint: dustTints,
            emitting: false
        });
        this.dustEmitter.setDepth(150);
        
        // Track running state for particle emission
        this.isRunningOnGround = false;
        this.dustTimer = 0;

        this.itemNames = ['rose', 'chocolate'];
        this.itemLabels = ['Roses', 'Chocolates'];

        this.createHUD();
        this.createMobileControls();
        
        // Collisions
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.items, this.platforms);
        this.physics.add.collider(this.obstacles, this.platforms);
        this.physics.add.collider(this.playersmaids, this.platforms);
        this.physics.add.collider(this.powerUps, this.platforms);
        this.physics.add.collider(this.keyGroup, this.platforms);
        this.physics.add.collider(this.djGroup, this.platforms);
        this.physics.add.collider(this.flowerSellers, this.platforms);
        this.physics.add.collider(this.dogs, this.platforms);

        // Overlaps
        this.physics.add.overlap(this.player, this.items, this.collectItem, null, this);
        this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);
        this.physics.add.overlap(this.player, this.playersmaids, this.hitObstacle, null, this);
        this.physics.add.overlap(this.player, this.bouquets, this.hitObstacle, null, this);
        this.physics.add.overlap(this.player, this.powerUps, this.collectPowerUp, null, this);
        this.physics.add.overlap(this.player, this.keyGroup, this.collectKey, null, this);
        this.physics.add.overlap(this.player, this.flowerSellers, this.hitFlowerSeller, null, this);
        this.physics.add.overlap(this.player, this.dogs, this.hitByDog, null, this);
        
        if (!this.isNightclub) {
            // Church interaction handled via distance check in update() for reliability
        } else {
            this.physics.add.overlap(this.player, this.tables, this.hitTable, null, this);
            this.physics.add.overlap(this.player, this.doors, this.enterSecretDoor, null, this);
        }

        this.cursors = this.input.keyboard.createCursorKeys();
        
        if (this.isNightclub) {
            this.spawnNightclubItems();
            this.spawnNightclubTables();
        } else {
            this.spawnParkItems();
            this.spawnObstacles();
            // First dog spawns after collecting 3 chocolates (not at start)
            this.spawnPowerUps();
        }

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, width * 6, height);
        this.cameras.main.setRoundPixels(true);
        this.physics.world.setBounds(0, 0, width * 6, height);

        // Level intro flash
        this.cameras.main.fadeIn(500);

        // Start level music
        audioManager.init().then(() => {
            audioManager.startMusic(this.level);
        });

        // Scene events for cleanup
        this.events.on('shutdown', () => {
            audioManager.stopMusic();
        });
        this.events.on('destroy', () => {
            audioManager.stopMusic();
        });
    }

    getDustTintsForBg(bgKey) {
        // Return themed dust colors based on the park background
        const dustPalettes = {
            'background':       [0xc8a882, 0xb89a72, 0xd4b896, 0xa88a66],  // Classic earthy brown
            'park-garden-bg':   [0xa8c882, 0x98b872, 0xb4d496, 0x88a866],  // Greenish garden dust
            'park-autumn-bg':   [0xd4a050, 0xc89040, 0xe0b060, 0xb88030],  // Warm amber/orange
            'park-sunset-bg':   [0xd4966e, 0xc8865e, 0xe0a67e, 0xb8764e],  // Warm sunset brown
            'park-night-bg':    [0x8888bb, 0x7777aa, 0x9999cc, 0x6666aa],  // Cool blue/purple
        };
        return dustPalettes[bgKey] || dustPalettes['background'];
    }

    createDustTexture() {
        // Procedurally generate a soft circular dust particle texture
        if (this.textures.exists('dust-particle')) return;
        
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Radial gradient for a soft, cloud-like particle
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        
        this.textures.addCanvas('dust-particle', canvas);
    }

    createLevel() {
        const { width, height } = this.scale;
        const groundY = height - 50;
        
        const groundColor = this.isNightclub ? 0x2b2b2b : (GROUND_COLORS[this.currentBgKey] || 0x556b2f);
        const platColor = this.isNightclub ? 0x333333 : (PLATFORM_COLORS[this.currentBgKey] || 0x8b4513);
        
        for (let i = 0; i < 6; i++) {
            const rect = this.add.rectangle(width * i + width / 2, groundY, width, 100, groundColor);
            rect.setDepth(-10);
            this.physics.add.existing(rect, true);
            this.platforms.add(rect);
        }

        if (this.isNightclub) {
            const platformConfigs = [
                { x: 600, y: 870, w: 250 },
                { x: 1200, y: 800, w: 250 },
                { x: 1800, y: 730, w: 250 },
                { x: 2400, y: 850, w: 250 },
                { x: 3000, y: 770, w: 250 },
                { x: 3600, y: 900, w: 250 },
                { x: 4200, y: 820, w: 250 },
                { x: 4800, y: 750, w: 250 },
            ];
            platformConfigs.forEach(p => {
                const rect = this.add.rectangle(p.x, p.y, p.w, 40, platColor);
                this.physics.add.existing(rect, true);
                this.platforms.add(rect);
            });
        } else {
            // Generate platform layouts with slight variation per level
            // Platforms are kept low (y: 750-930) so they're easy to jump onto from ground
            const seed = this.level * 137;
            const basePlatforms = [
                { x: 400, y: 910, w: 200 }, { x: 800, y: 840, w: 200 },
                { x: 1200, y: 770, w: 200 }, { x: 1600, y: 870, w: 200 },
                { x: 2000, y: 800, w: 200 }, { x: 2400, y: 900, w: 200 },
                { x: 2800, y: 830, w: 200 }, { x: 3200, y: 750, w: 200 },
                { x: 3600, y: 910, w: 200 }, { x: 4000, y: 840, w: 200 },
                { x: 4400, y: 770, w: 200 }, { x: 4800, y: 870, w: 200 },
                { x: 5200, y: 930, w: 200 },
            ];
            
            basePlatforms.forEach((p, idx) => {
                // Add level-based variation to platform positions
                const offsetY = ((seed + idx * 41) % 50) - 25; // ±25px vertical offset (tighter range)
                const adjustedY = Phaser.Math.Clamp(p.y + offsetY, 700, 950);
                const rect = this.add.rectangle(p.x, adjustedY, p.w, 40, platColor);
                rect.setDepth(-5);
                this.physics.add.existing(rect, true);
                this.platforms.add(rect);
            });
        }
    }

    createHUD() {
        const hudStyle = {
            fontFamily: '"Press Start 2P"',
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        };
        this.hud = this.add.container(20, 20).setScrollFactor(0).setDepth(1000);
        
        if (this.isNightclub) {
            this.item1Text = this.add.text(0, 0, 'Hearts: 0/10', hudStyle);
            this.item2Text = this.add.text(0, 35, '', hudStyle);
        } else {
            const label1 = this.playerType === 'groom' ? '🥃 Brandy' : '🌹 Roses';
            const label2 = this.playerType === 'groom' ? '🥩 Steak' : '🍫 Chocs';
            this.item1Text = this.add.text(0, 0, `${label1}: 0/${this.requiredItem1}`, hudStyle);
            this.item2Text = this.add.text(0, 35, `${label2}: 0/${this.requiredItem2}`, hudStyle);
        }
        this.timerText = this.add.text(0, 70, 'Time: 0.0s', { ...hudStyle, color: '#00ffff' });
        const defaultSubText = this.isNightclub ? 'Collect 10 Hearts!' : (this.playerType === 'groom' ? 'Collect brandy & steak!' : 'Collect roses & chocolates!');
        this.statusText = this.add.text(0, 105, defaultSubText, { ...hudStyle, fontSize: '16px', color: '#ffff00' });
        this.shieldText = this.add.text(0, 135, '', { ...hudStyle, fontSize: '14px', color: '#ffd700' });
        
        // Level indicator (top right)
        let levelLabel = this.isNightclub ? 'NIGHTCLUB' : `PARK ${this.level - 1}`;
        
        this.levelText = this.add.text(this.scale.width - 40, 0, levelLabel, {
            ...hudStyle, fontSize: '18px', color: '#ff69b4'
        }).setOrigin(1, 0);
        
        this.hud.add([this.item1Text, this.item2Text, this.timerText, this.statusText, this.shieldText, this.levelText]);
    }

    createMobileControls() {
        // Detect if touch-capable device
        const isTouchDevice = this.sys.game.device.input.touch;
        if (!isTouchDevice) return;
        
        const { width, height } = this.scale;
        const btnAlpha = 0.35;
        const btnSize = 80;
        const margin = 20;
        const bottomY = height - margin - btnSize / 2;
        
        // Left side - directional buttons
        const leftBtnX = margin + btnSize / 2;
        const rightBtnX = margin + btnSize * 2 + 10;
        const arrowY = bottomY;
        
        // Left arrow
        const leftBtn = this.add.circle(leftBtnX, arrowY, btnSize / 2, 0xffffff, btnAlpha)
            .setScrollFactor(0).setDepth(2000).setInteractive();
        this.add.text(leftBtnX, arrowY, '◀', { fontSize: '32px', color: '#fff' })
            .setOrigin(0.5).setScrollFactor(0).setDepth(2001);
        
        leftBtn.on('pointerdown', () => this.touchLeft = true);
        leftBtn.on('pointerup', () => this.touchLeft = false);
        leftBtn.on('pointerout', () => this.touchLeft = false);
        
        // Right arrow
        const rightBtn = this.add.circle(rightBtnX, arrowY, btnSize / 2, 0xffffff, btnAlpha)
            .setScrollFactor(0).setDepth(2000).setInteractive();
        this.add.text(rightBtnX, arrowY, '▶', { fontSize: '32px', color: '#fff' })
            .setOrigin(0.5).setScrollFactor(0).setDepth(2001);
        
        rightBtn.on('pointerdown', () => this.touchRight = true);
        rightBtn.on('pointerup', () => this.touchRight = false);
        rightBtn.on('pointerout', () => this.touchRight = false);
        
        // Right side - action buttons
        const jumpBtnX = width - margin - btnSize / 2;
        const runBtnX = width - margin - btnSize * 2 - 10;
        
        // Jump button
        const jumpBtn = this.add.circle(jumpBtnX, arrowY, btnSize / 2, 0x00ff00, btnAlpha)
            .setScrollFactor(0).setDepth(2000).setInteractive();
        this.add.text(jumpBtnX, arrowY, '⬆', { fontSize: '32px', color: '#fff' })
            .setOrigin(0.5).setScrollFactor(0).setDepth(2001);
        
        jumpBtn.on('pointerdown', () => this.touchJump = true);
        jumpBtn.on('pointerup', () => this.touchJump = false);
        jumpBtn.on('pointerout', () => this.touchJump = false);
        
        // Run button
        const runBtn = this.add.circle(runBtnX, arrowY, btnSize / 2, 0xff6600, btnAlpha)
            .setScrollFactor(0).setDepth(2000).setInteractive();
        this.add.text(runBtnX, arrowY, '🏃', { fontSize: '28px', color: '#fff' })
            .setOrigin(0.5).setScrollFactor(0).setDepth(2001);
        
        runBtn.on('pointerdown', () => this.touchRun = true);
        runBtn.on('pointerup', () => this.touchRun = false);
        runBtn.on('pointerout', () => this.touchRun = false);
    }

    spawnNightclubItems() {
        const { width } = this.scale;
        // 25 hearts spread across the nightclub level (need 10 to unlock secret door)
        for (let i = 0; i < 25; i++) {
            const x = Phaser.Math.Between(300, width * 5);
            const y = Phaser.Math.Between(300, 850);
            this.items.create(x, y, 'heart').setScale(0.12).setBounce(0.5).setData('type', 'nightclub-heart');
        }
    }

    spawnNightclubTables() {
        const { height } = this.scale;
        
        // Platform x positions (each 250px wide), avoid placing tables under them
        // Platforms at: 600, 1200, 1800, 2400, 3000, 3600, 4200, 4800
        // Safe gaps between platforms (ground level, well clear of platform edges):
        const safeTablePositions = [
            300, 900, 1500, 2100, 2700, 3300, 3900, 4500, 5100, 5500
        ];
        
        // Pick 8 positions from the safe spots (ensures at least 6)
        const shuffled = Phaser.Utils.Array.Shuffle([...safeTablePositions]);
        const count = Math.min(8, shuffled.length);
        
        for (let i = 0; i < count; i++) {
            const x = shuffled[i];
            const y = height - 150;
            const table = this.tables.create(x, y, 'nightclub-table').setScale(0.15);
            table.setDepth(4);
            table.body.setSize(table.width * 0.4, table.height * 0.4);
            table.body.setOffset(table.width * 0.3, table.height * 0.1);
        }
    }

    hitTable(player, table) {
        if (this.isGameOver || this.isInvulnerable) return;
        this.loseNightclubHeart();
        this.playerDamageFlash();
    }

    loseNightclubHeart() {
        if (this.itemsCollected.heart > 0) {
            this.itemsCollected.heart--;
            this.updateHUD();
            audioManager.playHit();
            this.statusText.setText('Lost a Heart!').setColor('#ff0000');
            this.time.delayedCall(2000, () => {
                if (!this.isGameOver) {
                    const defaultMsg = this.isNightclub ? 'Collect 10 Hearts!' : (this.isChurchInterior ? 'Collect 10 Rings!' : (this.playerType === 'groom' ? 'Collect brandy & steak!' : 'Collect roses & chocolates!'));
                    this.statusText.setText(defaultMsg).setColor('#ffff00');
                }
            });
        }
    }

    playerDamageFlash() {
        this.isInvulnerable = true;
        
        this.tweens.add({
            targets: this.player,
            alpha: { from: 1, to: 0.3 },
            duration: 150,
            ease: 'Linear',
            yoyo: true,
            repeat: 4,
            onComplete: () => {
                this.player.setAlpha(1);
                this.isInvulnerable = false;
            }
        });
    }

    enterSecretDoor(player, door) {
        if (this.isGameOver) return;
        if (this.itemsCollected.heart >= 10) {
            this.completeLevel();
        }
    }

    completeLevel() {
        this.isGameOver = true;
        const finalTime = parseFloat(((this.time.now - this.startTime) / 1000).toFixed(1));
        let stars = finalTime < 30 ? 3 : finalTime < 60 ? 2 : 1;
        const timeStr = finalTime.toFixed(1);
        this.saveToLeaderboard(timeStr);
        this.saveLevelProgress(stars, timeStr);
        
        // Victory flash
        this.cameras.main.flash(300, 255, 215, 0);
        this.time.delayedCall(400, () => {
            this.scene.start('GameOverScene', { result: 'won', playerType: this.playerType, time: timeStr, level: this.level, stars: stars });
        });
    }

    collectItem(player, item) {
        const type = item.getData('type');
        
        if (type === 'nightclub-heart') {
            // === NIGHTCLUB: collect hearts ===
            this.itemsCollected.heart++;
            item.destroy();
            audioManager.playCollect();
            this.updateHUD();
            
            // Spawn a new flower seller every 3 hearts collected
            if (this.itemsCollected.heart >= 3 && this.itemsCollected.heart % 3 === 0) {
                const sellersExpected = Math.floor(this.itemsCollected.heart / 3);
                const sellersActive = this.flowerSellers.countActive(true);
                if (sellersActive < sellersExpected) {
                    this.flowerSellersSpawned = true;
                    this.spawnOneFlowerSeller();
                    
                    this.statusText.setText('🌹 FLOWER SELLER INCOMING!').setColor('#ff4444');
                    this.cameras.main.shake(400, 0.01);
                    this.time.delayedCall(3000, () => {
                        if (!this.isGameOver) this.statusText.setText(this.itemsCollected.heart >= 10 ? '🚪 RUN TO THE END!' : 'Collect 10 Hearts!').setColor('#ffff00');
                    });
                }
            }
            
            // All 10 hearts collected — tell player to run to the end of the level
            if (this.itemsCollected.heart >= 10 && !this.allHeartsCollected) {
                this.allHeartsCollected = true;
                this.statusText.setText('🚪 RUN TO THE END!').setColor('#00ff00');
                this.cameras.main.flash(300, 255, 0, 255);
                
                // Pulsing arrow hint pointing right
                this.arrowHint = this.add.text(this.player.x + 120, this.player.y - 80, '➡️', {
                    fontSize: '48px'
                }).setDepth(500);
                this.tweens.add({
                    targets: this.arrowHint,
                    x: this.arrowHint.x + 40,
                    alpha: { from: 1, to: 0.3 },
                    duration: 600,
                    yoyo: true,
                    repeat: 4,
                    onComplete: () => { if (this.arrowHint) this.arrowHint.destroy(); }
                });
            }
        } else if (type === 'rose' || type === 'chocolate' || type === 'ring' || type === 'steak' || type === 'brandy') {
            // === PARK: collect collectibles ===
            if (type === 'rose') {
                this.itemsCollected.rose++;
            } else if (type === 'chocolate') {
                this.itemsCollected.chocolate++;
            } else if (type === 'steak') {
                this.itemsCollected.steak++;
            } else if (type === 'brandy') {
                this.itemsCollected.brandy++;
            } else if (type === 'ring') {
                this.itemsCollected.ring++;
            }
            
            // Item 2 spawn logic (dog every 3 items)
            if (type === this.item2Key) {
                const count = this.itemsCollected[this.item2Key];
                const dogThreshold = Math.floor(count / 3);
                if (count > 0 && count % 3 === 0 && dogThreshold > this.lastDogChocolateThreshold) {
                    this.lastDogChocolateThreshold = dogThreshold;
                    this.spawnDog();
                }
            }

            item.destroy();
            audioManager.playCollect();
            
            // Floating score text effect
            const labelMap = { 'rose': '🌹 +1', 'chocolate': '🍫 +1', 'ring': '💍 +1', 'steak': '🥩 +1', 'brandy': '🥃 +1' };
            const colorMap = { 'rose': '#ff4466', 'chocolate': '#8B4513', 'ring': '#ffd700', 'steak': '#ff4444', 'brandy': '#ffa500' };
            const scorePopup = this.add.text(player.x, player.y - 60, labelMap[type], {
                fontFamily: '"Press Start 2P"',
                fontSize: '18px',
                color: colorMap[type],
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5).setDepth(500);
            
            this.tweens.add({
                targets: scorePopup,
                y: player.y - 130,
                alpha: 0,
                duration: 800,
                onComplete: () => scorePopup.destroy()
            });
            
            this.updateHUD();
            
            // Check if all items collected — notify to go to church
            const collectedAll = (this.itemsCollected[this.item1Key] >= this.requiredItem1 && this.itemsCollected[this.item2Key] >= this.requiredItem2);

            if (collectedAll && !this.hasKey) {
                const targetMsg = '⛪ RUN TO THE CHURCH!';
                this.statusText.setText(targetMsg).setColor('#00ff00');
                this.cameras.main.flash(300, 0, 255, 0);
                
                // Arrow hint
                const arrowLabel = '➡️⛪';
                const arrow = this.add.text(this.player.x + 120, this.player.y - 80, arrowLabel, {
                    fontSize: '40px'
                }).setDepth(500);
                this.tweens.add({
                    targets: arrow,
                    x: arrow.x + 50,
                    alpha: { from: 1, to: 0.3 },
                    duration: 600,
                    yoyo: true,
                    repeat: 4,
                    onComplete: () => { if (arrow) arrow.destroy(); }
                });
            }
        }
    }

    revealSecretDoor() {
        if (this.secretDoorRevealed) return;
        this.secretDoorRevealed = true;
        
        const { width, height } = this.scale;
        const doorX = width * 5.7;
        const doorY = height - 100;
        
        // Create the secret door — starts invisible, scales up dramatically
        const door = this.doors.create(doorX, doorY, 'secret-door');
        door.setScale(0).setAlpha(0).setOrigin(0.5, 1).setDepth(10);
        
        // Dramatic reveal: screen shake + flash
        this.cameras.main.shake(600, 0.015);
        this.cameras.main.flash(400, 255, 200, 255);
        
        // Magical sparkle particles around the door reveal spot
        for (let i = 0; i < 12; i++) {
            const sparkle = this.add.text(
                doorX + Phaser.Math.Between(-80, 80),
                doorY - Phaser.Math.Between(50, 250),
                Phaser.Math.RND.pick(['✨', '💫', '⭐', '🌟']),
                { fontSize: Phaser.Math.Between(20, 40) + 'px' }
            ).setDepth(500).setAlpha(0);
            
            this.tweens.add({
                targets: sparkle,
                alpha: { from: 0, to: 1 },
                y: sparkle.y - 60,
                scale: { from: 0.5, to: 1.5 },
                duration: Phaser.Math.Between(400, 800),
                delay: Phaser.Math.Between(0, 400),
                yoyo: true,
                onComplete: () => sparkle.destroy()
            });
        }
        
        // Door appears with a growing + fading-in animation
        this.tweens.add({
            targets: door,
            scaleX: 0.35,
            scaleY: 0.35,
            alpha: 1,
            duration: 800,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Gentle pulsing glow once revealed
                this.tweens.add({
                    targets: door,
                    scaleX: 0.37,
                    scaleY: 0.37,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });
        
        // "SECRET DOOR" label floating above the door
        const label = this.add.text(doorX, doorY - 220, '🚪 SECRET DOOR!', {
            fontFamily: '"Press Start 2P"',
            fontSize: '22px',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(500).setAlpha(0);
        
        this.tweens.add({
            targets: label,
            alpha: 1,
            y: label.y - 20,
            duration: 600,
            delay: 400,
            ease: 'Power2'
        });
        
        // Continuously floating sparkles around the door
        this.time.addEvent({
            delay: 500,
            callback: () => {
                if (this.isGameOver) return;
                const s = this.add.text(
                    doorX + Phaser.Math.Between(-60, 60),
                    doorY - Phaser.Math.Between(30, 200),
                    '✨', { fontSize: '20px' }
                ).setDepth(450).setAlpha(0.8);
                this.tweens.add({
                    targets: s,
                    y: s.y - 50,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => s.destroy()
                });
            },
            loop: true
        });
        
        this.statusText.setText('🚪 SECRET DOOR APPEARED!').setColor('#ffd700');
        this.time.delayedCall(3000, () => {
            if (!this.isGameOver) this.statusText.setText('Enter the Secret Door!').setColor('#00ff00');
        });
    }

    updateHUD() {
        if (this.isNightclub) {
            this.item1Text.setText(`Hearts: ${this.itemsCollected.heart}/10`);
        } else {
            const label1 = this.playerType === 'groom' ? '🥃 Brandy' : '🌹 Roses';
            const label2 = this.playerType === 'groom' ? '🥩 Steak' : '🍫 Chocs';
            this.item1Text.setText(`${label1}: ${this.itemsCollected[this.item1Key]}/${this.requiredItem1}`);
            this.item2Text.setText(`${label2}: ${this.itemsCollected[this.item2Key]}/${this.requiredItem2}`);
        }
    }

    spawnParkItems() {
        const { width } = this.scale;
        
        // Spawn plenty extra — always at least required + generous buffer for dog stealing chocolates/steak
        const count1 = this.requiredItem1 + 8;
        const count2 = this.requiredItem2 + 12; // Extra because dogs steal item 2 (chocs/steak)
        
        for (let i = 0; i < count1; i++) {
            const x = Phaser.Math.Between(200, width * 5.3);
            const y = Phaser.Math.Between(200, 800);
            this.items.create(x, y, this.item1Key).setScale(0.10).setBounce(0.5).setData('type', this.item1Key);
        }
        for (let i = 0; i < count2; i++) {
            const x = Phaser.Math.Between(200, width * 5.3);
            const y = Phaser.Math.Between(200, 800);
            this.items.create(x, y, this.item2Key).setScale(0.12).setBounce(0.5).setData('type', this.item2Key);
        }
    }

    spawnObstacles() {
        const { width, height } = this.scale;
        const parkLevel = this.level - 1;
        const obstacleCount = 8 + (parkLevel * 2);
        for (let i = 0; i < obstacleCount; i++) {
            const x = Phaser.Math.Between(800, width * 5);
            const y = height - 150;
            const obstacle = this.obstacles.create(x, y, 'obstacle').setScale(0.2).setImmovable(true);
            obstacle.body.setAllowGravity(false);
            obstacle.body.setSize(obstacle.width * 0.8, obstacle.height * 0.8);
        }
    }

    spawnDog() {
        const { width, height } = this.scale;
        this.dogsSpawnedCount++;
        
        // Dog spawns off-screen behind or ahead of the player randomly
        const side = Phaser.Math.RND.pick([-1, 1]);
        const spawnX = Phaser.Math.Clamp(this.player.x + side * Phaser.Math.Between(400, 700), 100, width * 5.5);
        
        const dog = this.dogs.create(spawnX, height - 200, 'chasing-dog');
        dog.setScale(0.18);
        dog.setCollideWorldBounds(true);
        dog.body.setGravityY(500);
        dog.setDepth(50);
        
        // Dog sprite faces left by default — flip when chasing right
        dog.body.setSize(dog.width * 0.6, dog.height * 0.5);
        dog.body.setOffset(dog.width * 0.2, dog.height * 0.4);
        
        // Dog speed scales slightly with level + number of dogs
        const parkLevel = this.level - 1;
        const dogSpeed = 160 + (parkLevel * 10) + (this.dogsSpawnedCount - 1) * 8;
        dog.setData('chaseSpeed', dogSpeed);
        dog.setData('stunned', false);
        dog.setData('eatingTimer', 0);
        
        // Dramatic announcement for new dog
        if (this.dogsSpawnedCount > 1) {
            this.statusText.setText('🐕 ANOTHER DOG APPEARED!').setColor('#ff4444');
            this.cameras.main.shake(400, 0.01);
            this.time.delayedCall(2500, () => {
                if (!this.isGameOver) {
                    const defaultMsg = this.playerType === 'groom' ? 'Collect brandy & steak!' : 'Collect roses & chocolates!';
                    this.statusText.setText(defaultMsg).setColor('#ffff00');
                }
            });
        }
    }

    hitByDog(player, dog) {
        if (this.isGameOver || this.isInvulnerable) return;
        if (dog.getData('stunned')) return;
        
        // If player has item 2 (chocolates or steak), they throw one to distract the dog
        const item2Name = this.item2Key;
        const item2Label = this.playerType === 'groom' ? 'Steak' : 'Choco';
        const item2Emoji = this.playerType === 'groom' ? '🥩' : '🍫';

        if (this.itemsCollected[item2Name] > 0) {
            this.itemsCollected[item2Name]--;
            this.updateHUD();
            audioManager.playHit();
            this.playerDamageFlash();
            
            // Show distraction popup
            const popup = this.add.text(player.x, player.y - 80, `${item2Emoji} Here boy!`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '16px',
                color: item2Name === 'steak' ? '#ff4444' : '#8B4513',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5).setDepth(500);
            
            this.tweens.add({
                targets: popup,
                y: popup.y - 80,
                alpha: 0,
                duration: 1200,
                onComplete: () => popup.destroy()
            });
            
            // Throw a visual item toward the dog
            const throwImg = this.add.image(player.x, player.y - 30, item2Name)
                .setScale(0.08).setDepth(500);
            const throwDir = dog.x < player.x ? -1 : 1;
            this.tweens.add({
                targets: throwImg,
                x: dog.x + throwDir * 50,
                y: dog.y - 20,
                duration: 400,
                ease: 'Power2',
                onComplete: () => throwImg.destroy()
            });
            
            // Dog stops to eat the item — stunned for 3 seconds
            dog.setData('stunned', true);
            dog.setVelocityX(0);
            dog.setVelocityY(0);
            
            // Dog happy eating animation
            const eatText = this.add.text(dog.x, dog.y - 60, '🐕 Yum!', {
                fontFamily: '"Press Start 2P"',
                fontSize: '14px',
                color: '#ffd700',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5).setDepth(500);
            
            // Happy bobbing while eating
            this.tweens.add({
                targets: dog,
                scaleX: 0.20,
                scaleY: 0.16,
                duration: 200,
                yoyo: true,
                repeat: 5
            });
            
            this.time.delayedCall(3000, () => {
                if (dog.active) {
                    dog.setData('stunned', false);
                }
                if (eatText.active) eatText.destroy();
            });
            
            // Knock player back slightly
            const knockDir = dog.x < player.x ? 1 : -1;
            player.setVelocityX(knockDir * 250);
            
            this.statusText.setText(`🐕 Dog caught you! -1 ${item2Label}`).setColor('#ff6600');
            this.time.delayedCall(2000, () => {
                if (!this.isGameOver) {
                    const defaultMsg = this.playerType === 'groom' ? 'Collect brandy & steak!' : 'Collect roses & chocolates!';
                    this.statusText.setText(defaultMsg).setColor('#ffff00');
                }
            });
        } else {
            // No items — dog knocks player down, brief stun
            audioManager.playHit();
            this.playerDamageFlash();
            
            const popup = this.add.text(player.x, player.y - 80, `🐕 No ${item2Label}!`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '14px',
                color: '#ff4444',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5).setDepth(500);
            
            this.tweens.add({
                targets: popup,
                y: popup.y - 80,
                alpha: 0,
                duration: 1200,
                onComplete: () => popup.destroy()
            });
            
            // Brief knockback
            const knockDir = dog.x < player.x ? 1 : -1;
            player.setVelocityX(knockDir * 350);
            player.setVelocityY(-300);
            
            // Dog gets brief stun even with no item
            dog.setData('stunned', true);
            this.time.delayedCall(1500, () => {
                if (dog.active) dog.setData('stunned', false);
            });
            
            this.statusText.setText(`🐕 Find more ${item2Label}s!`).setColor('#ff4444');
            this.time.delayedCall(2000, () => {
                if (!this.isGameOver) {
                    const defaultMsg = this.playerType === 'groom' ? 'Collect brandy & steak!' : 'Collect roses & chocolates!';
                    this.statusText.setText(defaultMsg).setColor('#ffff00');
                }
            });
        }
    }

    spawnPowerUps() {
        const { width } = this.scale;
        // Beer shields
        for (let i = 0; i < 2; i++) {
            const x = Phaser.Math.Between(1000, width * 5);
            const y = Phaser.Math.Between(300, 700);
            this.powerUps.create(x, y, 'beer').setScale(0.15).setBounce(0.5).setData('powerType', 'shield');
        }
        // Champagne speed boost
        const cx = Phaser.Math.Between(1500, width * 4);
        const cy = Phaser.Math.Between(300, 600);
        this.powerUps.create(cx, cy, 'champagne').setScale(0.12).setBounce(0.5).setData('powerType', 'speed');
    }

    spawnOneFlowerSeller() {
        const { width, height } = this.scale;
        
        // Spawn behind or ahead of the player randomly
        const side = Phaser.Math.RND.pick([-1, 1]);
        const offsetX = side * Phaser.Math.Between(350, 600);
        const x = Phaser.Math.Clamp(this.player.x + offsetX, 100, width * 5.5);
        const y = this.player.y;
        const seller = this.flowerSellers.create(x, y, 'flower-seller');
        
        seller.setScale(0.18);
        seller.setOrigin(0.5, 1);
        seller.setCollideWorldBounds(true);
        seller.body.setGravityY(500);
        seller.setDepth(50);
        
        // Hitbox aligned to the visible body
        seller.body.setSize(seller.width * 0.45, seller.height * 0.75);
        seller.body.setOffset(seller.width * 0.28, seller.height * 0.2);
        
        // Each successive seller is a bit faster
        const sellerCount = this.flowerSellers.countActive(true);
        const baseSpeed = 130 + (sellerCount * 15);
        seller.setData('chaseSpeed', Phaser.Math.Between(baseSpeed, baseSpeed + 30));
        seller.setData('active', true);
    }

    hitFlowerSeller(player, seller) {
        if (this.isGameOver || this.isInvulnerable) return;
        
        // Lose a collected heart (nightclub mechanic)
        this.loseNightclubHeart();
        this.playerDamageFlash();
        
        // Show "Caught!" text
        const popup = this.add.text(player.x, player.y - 80, '🌹 Caught!', {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(500);
        
        this.tweens.add({
            targets: popup,
            y: popup.y - 80,
            alpha: 0,
            duration: 1000,
            onComplete: () => popup.destroy()
        });
        
        // Knock seller back after catching
        const knockDir = seller.x < player.x ? -1 : 1;
        seller.setVelocityX(knockDir * 300);
        seller.setData('stunned', true);
        this.time.delayedCall(1500, () => {
            if (seller.active) seller.setData('stunned', false);
        });
    }

    throwBouquet(playersmaid) {
        if (this.isGameOver) return;
        if (!playersmaid.active) return;
        const cam = this.cameras.main;
        if (playersmaid.x < cam.scrollX || playersmaid.x > cam.scrollX + cam.width) return;
        const bouquet = this.bouquets.create(playersmaid.x, playersmaid.y, 'bouquet').setScale(0.1);
        bouquet.body.setAllowGravity(false);
        const angle = Phaser.Math.Angle.Between(playersmaid.x, playersmaid.y, this.player.x, this.player.y);
        bouquet.body.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
        this.time.delayedCall(3000, () => { if (bouquet.active) bouquet.destroy(); });
    }

    collectPowerUp(player, powerUp) {
        const powerType = powerUp.getData('powerType') || 'shield';
        powerUp.destroy();
        audioManager.playPowerUp();
        
        if (powerType === 'speed') {
            // Champagne = temporary speed boost
            this.statusText.setText('CHAMPAGNE SPEED! 🥂').setColor('#ffd700');
            this.isSpeedBoosted = true;
            this.speedBoostTime = 4;
            
            // Speed trail effect - spawn sparkle texts that follow player
            this.speedTrailTimer = this.time.addEvent({
                delay: 150,
                callback: () => {
                    if (!this.isSpeedBoosted || this.isGameOver) return;
                    const sparkle = this.add.text(this.player.x, this.player.y + 20, '✨', {
                        fontSize: '18px'
                    }).setDepth(150).setAlpha(0.8);
                    this.tweens.add({
                        targets: sparkle,
                        alpha: 0,
                        y: sparkle.y + 30,
                        duration: 400,
                        onComplete: () => sparkle.destroy()
                    });
                },
                loop: true
            });
            
            this.time.delayedCall(4000, () => {
                this.isSpeedBoosted = false;
                if (this.speedTrailTimer) this.speedTrailTimer.destroy();
                if (!this.isGameOver) this.statusText.setText('Speed wore off!').setColor('#ffff00');
            });
        } else {
            // Beer = shield
            this.isShielded = true;
            this.shieldTimeRemaining = 5;
            this.statusText.setText('SHIELDED! 🍺').setColor('#ffd700');
            this.tweens.add({ targets: this.player, alpha: 0.5, duration: 100, yoyo: true, repeat: 5 });
        }
    }

    collectKey(player, key) {
        const isRing = key.getData('isRing');
        key.destroy();
        
        if (isRing) {
            this.hasRing = true;
            audioManager.playKey();
            this.statusText.setText('💍 YOU GOT THE RING!').setColor('#00ff00');
            this.cameras.main.flash(300, 255, 215, 0);
            
            // Effect
            for (let i = 0; i < 10; i++) {
                const s = this.add.text(player.x, player.y, '💍', { fontSize: '24px' }).setDepth(500);
                this.tweens.add({
                    targets: s,
                    x: s.x + Phaser.Math.Between(-100, 100),
                    y: s.y - Phaser.Math.Between(50, 150),
                    alpha: 0,
                    duration: 800,
                    onComplete: () => s.destroy()
                });
            }
        } else {
            this.hasKey = true;
            audioManager.playKey();
            this.statusText.setText('🔑 KEY! Enter the Church!').setColor('#00ff00');
            this.cameras.main.flash(300, 255, 215, 0);
        }
    }

    emitDustBurst(count, speedMax) {
        // A burst of dust particles (for landing / jump takeoff)
        if (!this.dustEmitter) return;
        
        // Temporarily widen the angle spread for a burst effect
        const origAngleMin = this.dustEmitter.particleAngle;
        this.dustEmitter.followOffset.x = 0;
        
        for (let i = 0; i < count; i++) {
            this.dustEmitter.emitParticle(1);
        }
    }

    playPlayerAnim(action) {
        const animKey = `${this.playerType}-${action}`;
        
        if (this.currentAnimKey !== animKey) {
            this.currentAnimKey = animKey;
            this.player.play(animKey, true);
        }
    }

    hitObstacle(player, obstacle) {
        if (this.isGameOver || this.isInvulnerable) return;
        
        if (this.isShielded) {
            if (this.bouquets.contains(obstacle)) { obstacle.destroy(); audioManager.playHit(); }
            return;
        }
        
        // Park levels — obstacle collision causes knockback + brief stun (no death)
        if (!this.isNightclub) {
            audioManager.playHit();
            this.playerDamageFlash();
            
            // Destroy bouquets on hit
            if (this.bouquets.contains(obstacle)) {
                obstacle.destroy();
            }
            
            // Knockback
            const knockDir = obstacle.x < player.x ? 1 : -1;
            player.setVelocityX(knockDir * 300);
            player.setVelocityY(-200);
            
            this.statusText.setText('Ouch! Watch out!').setColor('#ff6600');
            this.cameras.main.shake(150, 0.008);
            this.time.delayedCall(2000, () => {
                if (!this.isGameOver) {
                    const defaultMsg = this.playerType === 'groom' ? 'Collect brandy & steak!' : 'Collect roses & chocolates!';
                    this.statusText.setText(defaultMsg).setColor('#ffff00');
                }
            });
            return;
        }
        
        // Nightclub — obstacle collision causes knockback (no death either)
        audioManager.playHit();
        this.playerDamageFlash();
        const knockDir = obstacle.x < player.x ? 1 : -1;
        player.setVelocityX(knockDir * 300);
        player.setVelocityY(-200);
    }

    enterChurch(player, church) {
        if (this.isGameOver) return;
        if (this.churchCooldown) return;
        
        const hasAllItems = (this.itemsCollected[this.item1Key] >= this.requiredItem1 && this.itemsCollected[this.item2Key] >= this.requiredItem2);

        // === STANDARD CHURCH EXTERIOR LOGIC ===
        if (this.hasKey && !this.churchDoorOpen) {
            // === BRIDE HAS KEY — open the church door and enter! ===
            this.churchDoorOpen = true;
            this.isGameOver = true;
            
            audioManager.playKey();
            this.statusText.setText('🚪 DOOR OPENING...').setColor('#ffd700');
            this.cameras.main.shake(300, 0.008);
            
            // Stop the player
            player.setVelocityX(0);
            player.setVelocityY(0);
            player.body.setAllowGravity(false);
            this.playPlayerAnim('idle');
            
            // Create golden light as the "open door" behind the church
            const doorGlow = this.add.rectangle(
                this.church.x, this.church.y - 80,
                60, 0, 0xfff8dc
            ).setOrigin(0.5, 1).setDepth(0).setAlpha(0.9);
            
            // Animate door "opening" — golden light expands
            this.tweens.add({
                targets: doorGlow,
                displayHeight: 130,
                displayWidth: 80,
                alpha: 1,
                duration: 800,
                ease: 'Power2',
                onComplete: () => {
                    this.statusText.setText('✨ Welcome! ✨').setColor('#ffd700');
                    
                    // Sparkles burst from the open door
                    for (let i = 0; i < 10; i++) {
                        const s = this.add.text(
                            this.church.x + Phaser.Math.Between(-30, 30),
                            this.church.y - Phaser.Math.Between(40, 140),
                            Phaser.Math.RND.pick(['✨', '💒', '⭐', '🌟', '💫']),
                            { fontSize: Phaser.Math.Between(16, 28) + 'px' }
                        ).setDepth(500);
                        this.tweens.add({
                            targets: s,
                            y: s.y - 60,
                            alpha: 0,
                            duration: 800,
                            delay: i * 80,
                            onComplete: () => s.destroy()
                        });
                    }
                    
                    // Player walks into the church door
                    this.tweens.add({
                        targets: player,
                        x: this.church.x,
                        duration: 600,
                        delay: 300,
                        ease: 'Power1',
                        onStart: () => {
                            player.setFlipX(player.x < this.church.x);
                            this.playPlayerAnim('walk');
                        },
                        onComplete: () => {
                            // Player shrinks and fades into the door
                            this.tweens.add({
                                targets: player,
                                scaleX: 0.05,
                                scaleY: 0.05,
                                alpha: 0,
                                duration: 500,
                                ease: 'Power2',
                                onComplete: () => {
                                    this.cameras.main.flash(500, 255, 255, 200);
                                    this.time.delayedCall(600, () => {
                                        this.completeLevel();
                                    });
                                }
                            });
                        }
                    });
                }
            });
        } else if (hasAllItems && !this.parkKeyDropped) {
            // === ALL ITEMS COLLECTED — drop the key! ===
            this.parkKeyDropped = true;
            this.churchCooldown = true;
            audioManager.playKey();
            
            this.statusText.setText('🔑 A KEY APPEARED!').setColor('#ffd700');
            this.cameras.main.shake(400, 0.01);
            this.cameras.main.flash(300, 255, 215, 0);
            
            // Drop key right at the player's position so it's easy to grab
            const keyX = player.x;
            const keyY = player.y - 150;
            const key = this.keyGroup.create(keyX, keyY, 'key');
            key.setScale(0.15).setBounce(0.3);
            key.body.setGravityY(400);
            
            // Sparkle effect around the key
            for (let i = 0; i < 10; i++) {
                const sparkle = this.add.text(
                    keyX + Phaser.Math.Between(-80, 80),
                    keyY + Phaser.Math.Between(-60, 60),
                    Phaser.Math.RND.pick(['✨', '🔑', '⭐', '💫']),
                    { fontSize: Phaser.Math.Between(20, 36) + 'px' }
                ).setDepth(500).setAlpha(0);
                
                this.tweens.add({
                    targets: sparkle,
                    alpha: { from: 0, to: 1 },
                    y: sparkle.y - 50,
                    duration: Phaser.Math.Between(400, 800),
                    delay: Phaser.Math.Between(0, 400),
                    yoyo: true,
                    onComplete: () => sparkle.destroy()
                });
            }
            
            // Re-enable church interaction after key lands
            this.time.delayedCall(1500, () => {
                this.churchCooldown = false;
                if (!this.isGameOver) {
                    this.statusText.setText('🔑 Grab the key!').setColor('#00ff00');
                }
            });
        } else if (!hasAllItems && !this.parkKeyDropped) {
            this.showMissingItems();
        }
    }

    showMissingItems() {
        this.churchCooldown = true;
        let msg = 'Need: ';
        const label1 = this.playerType === 'groom' ? '🥃' : '🌹';
        const label2 = this.playerType === 'groom' ? '🥩' : '🍫';
        const item1Left = Math.max(0, this.requiredItem1 - this.itemsCollected[this.item1Key]);
        const item2Left = Math.max(0, this.requiredItem2 - this.itemsCollected[this.item2Key]);
        if (item1Left > 0) msg += `${item1Left}${label1} `;
        if (item2Left > 0) msg += `${item2Left}${label2}`;
        this.statusText.setText(msg).setColor('#ff6600');
        this.time.delayedCall(2500, () => {
            this.churchCooldown = false;
            const defaultMsg = this.isNightclub ? 'Collect 10 Hearts!' : (this.playerType === 'groom' ? 'Collect brandy & steak!' : 'Collect roses & chocolates!');
            if (!this.isGameOver) this.statusText.setText(defaultMsg).setColor('#ffff00');
        });
    }

    saveLevelProgress(stars, time) {
        const currentUnlocked = parseInt(localStorage.getItem('wedding-unlocked-levels') || '1');
        if (this.level >= currentUnlocked) localStorage.setItem('wedding-unlocked-levels', (this.level + 1).toString());
        const starKey = `wedding-level-${this.level}-stars`;
        const existingStars = parseInt(localStorage.getItem(starKey) || '0');
        if (stars > existingStars) localStorage.setItem(starKey, stars.toString());
        const timeKey = `wedding-level-${this.level}-best-time`;
        const existingBestTime = parseFloat(localStorage.getItem(timeKey) || '999.9');
        if (parseFloat(time) < existingBestTime) localStorage.setItem(timeKey, time.toString());
    }

    saveToLeaderboard(time) {
        const playerName = localStorage.getItem('wedding-player-name') || 'Anonymous';
        const leaderboard = JSON.parse(localStorage.getItem('wedding-leaderboard') || '[]');
        leaderboard.push({ name: playerName, player: this.playerType, time: parseFloat(time), level: this.level, date: new Date().toLocaleDateString() });
        leaderboard.sort((a, b) => a.time - b.time);
        localStorage.setItem('wedding-leaderboard', JSON.stringify(leaderboard.slice(0, 20)));
    }

    update(time, delta) {
        if (this.isGameOver) return;
        
        // Timer
        this.elapsedTime = (this.time.now - this.startTime) / 1000;
        this.timerText.setText(`Time: ${this.elapsedTime.toFixed(1)}s`);
        
        // Shield countdown
        if (this.isShielded) {
            this.shieldTimeRemaining -= delta / 1000;
            if (this.shieldTimeRemaining <= 0) {
                this.isShielded = false;
                this.shieldText.setText('');
                this.player.setTint(0xffffff);
                this.statusText.setText('Shield worn off!').setColor('#ffff00');
            } else {
                this.shieldText.setText(`Shield: ${this.shieldTimeRemaining.toFixed(1)}s`);
                const tint = (Math.floor(time / 100) % 2 === 0) ? 0xffff00 : 0xffffff;
                this.player.setTint(tint);
            }
        }
        
        // Speed boost countdown
        if (this.isSpeedBoosted) {
            this.speedBoostTime -= delta / 1000;
            if (this.speedBoostTime <= 0) {
                this.isSpeedBoosted = false;
            }
        }
        
        const wasInAir = !this.player.body.wasTouching.down;
        const isJumping = !this.player.body.touching.down;
        const onGround = this.player.body.touching.down;
        // Combine keyboard + touch input
        const isRunning = this.input.keyboard.addKey('SHIFT').isDown || this.touchRun;
        const speedMultiplier = this.isSpeedBoosted ? 1.5 : 1;
        const speed = (isRunning ? 700 : 450) * speedMultiplier;
        let nextAnim = 'idle';

        const leftInput = this.cursors.left.isDown || this.touchLeft;
        const rightInput = this.cursors.right.isDown || this.touchRight;
        const jumpInput = this.cursors.up.isDown || this.touchJump;
        const isMoving = leftInput || rightInput;

        if (leftInput) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(false);
            nextAnim = isRunning ? 'run' : 'walk';
        } else if (rightInput) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(true);
            nextAnim = isRunning ? 'run' : 'walk';
        } else {
            this.player.setVelocityX(0);
            nextAnim = 'idle';
        }

        if (jumpInput && onGround) {
            this.player.setVelocityY(-1350);
            nextAnim = 'jump';
            audioManager.playJump();
            this.touchJump = false; // Single press per jump
            
            // Jump launch dust burst
            this.emitDustBurst(6, 160);
        }

        if (isJumping) {
            nextAnim = 'jump';
            this.player.setAngle(this.player.body.velocity.y * 0.03);
        } else {
            this.player.setAngle(0);
        }
        
        // Landing dust burst — was in air, now on ground
        if (wasInAir && onGround) {
            this.emitDustBurst(8, 200);
        }

        // === DUST PARTICLE EMISSION ===
        if (onGround && isMoving) {
            this.dustTimer += delta;
            // Running: emit every 60ms (lots of dust) / Walking: every 200ms (light dust)
            const emitInterval = isRunning ? 60 : 200;
            const particleCount = isRunning ? 3 : 1;
            
            if (this.dustTimer >= emitInterval) {
                this.dustTimer = 0;
                
                // Offset behind the player based on facing direction
                // flipX=true means facing right, flipX=false means facing left (sprite default)
                const facingRight = this.player.flipX;
                const offsetX = facingRight ? -20 : 20;
                
                this.dustEmitter.followOffset.x = offsetX;
                this.dustEmitter.emitParticle(particleCount);
            }
        } else {
            this.dustTimer = 0;
        }

        this.playPlayerAnim(nextAnim);

        // Flower seller chase AI (nightclub)
        if (this.isNightclub && this.flowerSellersSpawned) {
            this.flowerSellers.children.iterate((seller) => {
                if (!seller || !seller.active) return;
                if (seller.getData('stunned')) return;
                
                const chaseSpeed = seller.getData('chaseSpeed') || 150;
                const dx = this.player.x - seller.x;
                const dy = this.player.y - seller.y;
                const distX = Math.abs(dx);
                
                // Horizontal chase — always follow the player
                const dir = dx > 0 ? 1 : -1;
                seller.setVelocityX(chaseSpeed * dir);
                // Sprite faces left by default — flip when moving right
                seller.setFlipX(dir > 0);
                
                // Vertical chase — jump when player is above and seller is on ground
                const sellerOnGround = seller.body.touching.down || seller.body.blocked.down;
                if (sellerOnGround && dy < -80 && distX < 600) {
                    // Jump toward the player — stronger jump if she's much higher
                    const jumpForce = dy < -200 ? -900 : -700;
                    seller.setVelocityY(jumpForce);
                }
                
                // Gentle bobbing while walking on ground
                if (sellerOnGround) {
                    const bob = Math.sin(this.time.now * 0.008) * 1.5;
                    seller.setAngle(bob);
                } else {
                    seller.setAngle(0);
                }
            });
        }
        
        // Dog chase AI (park levels)
        if (!this.isNightclub && this.dogsSpawnedCount > 0) {
            this.dogs.children.iterate((dog) => {
                if (!dog || !dog.active) return;
                if (dog.getData('stunned')) return;
                
                const chaseSpeed = dog.getData('chaseSpeed') || 160;
                const dx = this.player.x - dog.x;
                const dy = this.player.y - dog.y;
                const distX = Math.abs(dx);
                
                // Always chase the player horizontally
                const dir = dx > 0 ? 1 : -1;
                dog.setVelocityX(chaseSpeed * dir);
                // Dog sprite faces left by default — flip when chasing right
                dog.setFlipX(dir > 0);
                
                // Jump when player is above and dog is on ground
                const dogOnGround = dog.body.touching.down || dog.body.blocked.down;
                if (dogOnGround && dy < -80 && distX < 500) {
                    const jumpForce = dy < -200 ? -850 : -650;
                    dog.setVelocityY(jumpForce);
                }
                
                // Excited bouncy running animation
                if (dogOnGround) {
                    const bounce = Math.sin(this.time.now * 0.012) * 2;
                    dog.setAngle(bounce);
                } else {
                    dog.setAngle(0);
                }
            });
        }
        
        // === CHURCH/ALTAR PROXIMITY CHECK (park levels) ===
        // Distance-based check replaces unreliable static body overlap
        if (!this.isNightclub && !this.isGameOver) {
            const dx = Math.abs(this.player.x - this.churchZoneX);
            const dy = Math.abs(this.player.y - this.churchZoneY);
            // Trigger when player is within ~180px horizontally and ~200px vertically of goal center
            if (dx < 180 && dy < 200) {
                this.enterChurch(this.player, this.isChurchInterior ? this.altar : this.church);
            }
        }
        
        // Secret door reveal — when player has 10 hearts and reaches near the right end
        if (this.isNightclub && this.allHeartsCollected && !this.secretDoorRevealed) {
            const triggerX = this.scale.width * 5.2;
            if (this.player.x >= triggerX) {
                this.revealSecretDoor();
            }
        }
        
        // Fall off screen
        if (this.player.y > this.scale.height + 100) {
            this.scene.start('GameOverScene', { result: 'lost', playerType: this.playerType, level: this.level });
        }
    }
}
