import Phaser from 'phaser';
import { audioManager } from '../AudioManager.js';

// Background mapping
const PARK_BACKGROUNDS = {
    1: 'background',
};

// Ground/platform colors per theme
const GROUND_COLORS = {
    'background': 0x556b2f,
};

const PLATFORM_COLORS = {
    'background': 0x8b4513,
};

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    /** Returns a responsive scale multiplier for text/UI on mobile */
    get isMobile() { return this.sys.game.device.input.touch; }
    get uiScale() { return this.isMobile ? 1.6 : 1; }

    init(data) {
        this.playerType = data.playerType || 'bride';
        this.level = 1; // Only one level now
        this.itemsCollected = {
            rose: 0,
            chocolate: 0,
            heart: 0,
            ring: 0,
            steak: 0,
            brandy: 0
        };
        this.hasKey = false;
        this.isGameOver = false;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.isShielded = false;
        this.shieldTimeRemaining = 0;
        this.isInvulnerable = false;
        
        // Item keys based on player
        this.item1Key = this.playerType === 'groom' ? 'brandy' : 'rose';
        this.item2Key = this.playerType === 'groom' ? 'steak' : 'chocolate';
        
        // Park level required items
        this.requiredItem1 = 8;
        this.requiredItem2 = 8;
        
        // Dog chase state
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
        
        // Drag-to-move state
        this.isDragging = false;
        this.dragPointerId = null;
        this.dragStartX = 0;
        this.dragCurrentX = 0;
        this.dragStartY = 0;
        this.dragCurrentY = 0;
        this.jumpButtonPointerId = null;
    }

    create() {
        const { width, height } = this.scale;

        this.startTime = this.time.now;
        
        // Background - Park theme
        const bgKey = 'background';
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
        this.dogs = this.physics.add.group();

        // Create Platforms
        this.createLevel();

        // Church (Goal) — placed on ground level at the far right
        const groundSurface = height - 100;
        this.church = this.add.image(width * 5.8, groundSurface, 'church').setOrigin(0.5, 1).setScale(0.5).setDepth(1);
        this.churchZoneX = width * 5.8;
        this.churchZoneY = groundSurface - (this.church.displayHeight * 0.4);
        this.churchDoorOpen = false;

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
        const dustTints = this.getDustTintsForBg(this.currentBgKey);
        
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
        
        this.dustTimer = 0;

        this.createHUD();
        this.createMobileControls();
        
        // Collisions
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.items, this.platforms);
        this.physics.add.collider(this.obstacles, this.platforms);
        this.physics.add.collider(this.playersmaids, this.platforms);
        this.physics.add.collider(this.powerUps, this.platforms);
        this.physics.add.collider(this.keyGroup, this.platforms);
        this.physics.add.collider(this.dogs, this.platforms);

        // Overlaps
        this.physics.add.overlap(this.player, this.items, this.collectItem, null, this);
        this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);
        this.physics.add.overlap(this.player, this.playersmaids, this.hitObstacle, null, this);
        this.physics.add.overlap(this.player, this.bouquets, this.hitObstacle, null, this);
        this.physics.add.overlap(this.player, this.powerUps, this.collectPowerUp, null, this);
        this.physics.add.overlap(this.player, this.keyGroup, this.collectKey, null, this);
        this.physics.add.overlap(this.player, this.dogs, this.hitByDog, null, this);
        
        this.cursors = this.input.keyboard.createCursorKeys();
        
        this.spawnParkItems();
        this.spawnObstacles();
        this.spawnPowerUps();

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, width * 6, height);
        this.cameras.main.setRoundPixels(true);
        this.physics.world.setBounds(0, 0, width * 6, height);

        this.cameras.main.fadeIn(500);

        audioManager.init().then(() => {
            audioManager.startMusic(2); // Start Park music
        });

        this.events.on('shutdown', () => audioManager.stopMusic());
        this.events.on('destroy', () => audioManager.stopMusic());
    }

    getDustTintsForBg(bgKey) {
        const dustPalettes = {
            'background': [0xc8a882, 0xb89a72, 0xd4b896, 0xa88a66],
        };
        return dustPalettes[bgKey] || dustPalettes['background'];
    }

    createDustTexture() {
        if (this.textures.exists('dust-particle')) return;
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, size, size);
        this.textures.addCanvas('dust-particle', canvas);
    }

    createLevel() {
        const { width, height } = this.scale;
        const groundY = height - 50;
        const groundColor = GROUND_COLORS[this.currentBgKey] || 0x556b2f;
        const platColor = PLATFORM_COLORS[this.currentBgKey] || 0x8b4513;
        
        for (let i = 0; i < 6; i++) {
            const rect = this.add.rectangle(width * i + width / 2, groundY, width, 100, groundColor);
            rect.setDepth(-10); this.physics.add.existing(rect, true);
            this.platforms.add(rect);
        }

        const seed = 137;
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
            const offsetY = ((seed + idx * 41) % 50) - 25;
            const adjustedY = Phaser.Math.Clamp(p.y + offsetY, 700, 950);
            const rect = this.add.rectangle(p.x, adjustedY, p.w, 40, platColor);
            rect.setDepth(-5); this.physics.add.existing(rect, true);
            this.platforms.add(rect);
        });
    }

    createHUD() {
        const s = this.uiScale;
        const baseFontSize = Math.round(20 * s);
        const subFontSize = Math.round(16 * s);
        const shieldFontSize = Math.round(14 * s);
        const levelFontSize = Math.round(18 * s);
        const lineH = Math.round(38 * s);
        const strokeW = Math.round(4 * s);
        const margin = Math.round(24 * s);
        
        const hudStyle = { fontFamily: '"Press Start 2P"', fontSize: `${baseFontSize}px`, color: '#ffffff', stroke: '#000000', strokeThickness: strokeW };
        this.hud = this.add.container(margin, margin).setScrollFactor(0).setDepth(1000);
        
        const label1 = this.playerType === 'groom' ? '🥃 Brandy' : '🌹 Roses';
        const label2 = this.playerType === 'groom' ? '🥩 Steak' : '🍫 Chocs';
        this.item1Text = this.add.text(0, 0, `${label1}: 0/${this.requiredItem1}`, hudStyle);
        this.item2Text = this.add.text(0, lineH, `${label2}: 0/${this.requiredItem2}`, hudStyle);
        this.timerText = this.add.text(0, lineH * 2, 'Time: 0.0s', { ...hudStyle, color: '#00ffff' });
        const defaultSubText = (this.playerType === 'groom' ? 'Collect brandy & steak!' : 'Collect roses & chocolates!');
        this.statusText = this.add.text(0, lineH * 3, defaultSubText, { ...hudStyle, fontSize: `${subFontSize}px`, color: '#ffff00' });
        this.shieldText = this.add.text(0, lineH * 4, '', { ...hudStyle, fontSize: `${shieldFontSize}px`, color: '#ffd700' });
        this.levelText = this.add.text(this.scale.width - margin - margin, 0, 'THE PARK', { ...hudStyle, fontSize: `${levelFontSize}px`, color: '#ff69b4' }).setOrigin(1, 0);
        this.hud.add([this.item1Text, this.item2Text, this.timerText, this.statusText, this.shieldText, this.levelText]);
    }

    createMobileControls() {
        const isTouchDevice = this.sys.game.device.input.touch;
        if (!isTouchDevice) return;
        const { width, height } = this.scale;
        const s = this.uiScale;

        // =========================================================
        //  TAP-TO-JUMP & DRAG-TO-MOVE
        //  - Quick tap anywhere: jump
        //  - Drag horizontally: move left/right
        //  - Drag further: auto-run
        // =========================================================

        // Visual feedback: origin dot + direction line + thumb dot
        this.dragOriginDot = this.add.circle(0, 0, Math.round(22 * s), 0xffffff, 0.0)
            .setScrollFactor(0).setDepth(2001);
        this.dragDirLine = this.add.rectangle(0, 0, Math.round(4 * s), 0, 0xffffff, 0.0)
            .setOrigin(0.5, 1).setScrollFactor(0).setDepth(2001);
        this.dragThumbDot = this.add.circle(0, 0, Math.round(16 * s), 0xffffff, 0.0)
            .setScrollFactor(0).setDepth(2001);

        // Track tap timing for jump detection
        this.tapStartTime = 0;
        this.tapStartX = 0;
        this.tapStartY = 0;

        // --- Scene-level pointer events ---
        this.input.on('pointerdown', (pointer) => {
            // Record tap timing
            this.tapStartTime = this.time.now;
            this.tapStartX = pointer.x;
            this.tapStartY = pointer.y;

            // Start drag tracking
            this.isDragging = true;
            this.dragPointerId = pointer.id;
            this.dragStartX = pointer.x;
            this.dragCurrentX = pointer.x;
            this.dragStartY = pointer.y;
            this.dragCurrentY = pointer.y;

            // Show origin dot
            this.dragOriginDot.setPosition(pointer.x, pointer.y).setAlpha(0.30);
            this.dragThumbDot.setPosition(pointer.x, pointer.y).setAlpha(0.35);
            this.dragDirLine.setAlpha(0);
        });

        this.input.on('pointermove', (pointer) => {
            if (!this.isDragging) return;
            if (pointer.id !== this.dragPointerId) return;
            this.dragCurrentX = pointer.x;
            this.dragCurrentY = pointer.y;

            // Update thumb dot & direction line
            const dx = this.dragCurrentX - this.dragStartX;
            const dy = this.dragCurrentY - this.dragStartY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            this.dragThumbDot.setPosition(pointer.x, pointer.y);

            if (dist > 15) {
                const angle = Math.atan2(dy, dx);
                const lineLen = Math.min(dist, 120);
                this.dragDirLine
                    .setPosition(this.dragStartX, this.dragStartY)
                    .setSize(Math.round(4 * s), lineLen)
                    .setRotation(angle + Math.PI / 2)
                    .setAlpha(Math.min(dist / 80, 0.45));
                this.dragThumbDot.setAlpha(0.45);
            } else {
                this.dragDirLine.setAlpha(0);
            }
        });

        const endDrag = (pointer) => {
            if (!this.isDragging) return;
            if (pointer && pointer.id !== this.dragPointerId) return;
            
            // Check if this was a quick tap (not a drag)
            const tapDuration = this.time.now - this.tapStartTime;
            const dx = pointer.x - this.tapStartX;
            const dy = pointer.y - this.tapStartY;
            const tapDist = Math.sqrt(dx * dx + dy * dy);
            
            // Tap detected: short duration, small movement
            if (tapDuration < 250 && tapDist < 40) {
                this.touchJump = true;
            }
            
            this.isDragging = false;
            this.dragPointerId = null;
            this.dragStartX = 0;
            this.dragCurrentX = 0;
            this.touchLeft = false;
            this.touchRight = false;
            this.touchRun = false;

            // Hide visuals
            this.dragOriginDot.setAlpha(0);
            this.dragDirLine.setAlpha(0);
            this.dragThumbDot.setAlpha(0);
        };

        this.input.on('pointerup', endDrag);
        this.input.on('pointerupoutside', endDrag);

        // =========================================================
        //  HINT — fades out after a few seconds
        // =========================================================
        const hintFS = Math.round(20 * s);
        this.dragHint = this.add.text(width / 2, height - Math.round(60 * s),
            '👆 Tap to jump  ·  Drag to move & run', {
            fontFamily: '"Press Start 2P"',
            fontSize: `${hintFS}px`,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: Math.round(5 * s)
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2000).setAlpha(0.85);

        this.tweens.add({
            targets: this.dragHint,
            alpha: 0,
            delay: 5000,
            duration: 2000,
            onComplete: () => { if (this.dragHint) { this.dragHint.destroy(); this.dragHint = null; } }
        });
    }

    completeLevel() {
        this.isGameOver = true;
        const finalTime = parseFloat(((this.time.now - this.startTime) / 1000).toFixed(1));
        let stars = finalTime < 30 ? 3 : finalTime < 60 ? 2 : 1;
        const timeStr = finalTime.toFixed(1);
        this.saveToLeaderboard(timeStr);
        this.saveLevelProgress(stars, timeStr);
        this.cameras.main.flash(300, 255, 215, 0);
        this.time.delayedCall(400, () => {
            this.scene.start('GameOverScene', { result: 'won', playerType: this.playerType, time: timeStr, level: this.level, stars: stars });
        });
    }

    collectItem(player, item) {
        const type = item.getData('type');
        if (type === 'rose' || type === 'chocolate' || type === 'ring' || type === 'steak' || type === 'brandy') {
            if (type === 'rose') this.itemsCollected.rose++;
            else if (type === 'chocolate') this.itemsCollected.chocolate++;
            else if (type === 'steak') this.itemsCollected.steak++;
            else if (type === 'brandy') this.itemsCollected.brandy++;
            else if (type === 'ring') this.itemsCollected.ring++;
            
            if (type === this.item2Key) {
                const count = this.itemsCollected[this.item2Key];
                const dogThreshold = Math.floor(count / 3);
                if (count > 0 && count % 3 === 0 && dogThreshold > this.lastDogChocolateThreshold) {
                    this.lastDogChocolateThreshold = dogThreshold;
                    this.spawnDog();
                }
            }
            item.destroy(); audioManager.playCollect();
            const labelMap = { 'rose': '🌹 +1', 'chocolate': '🍫 +1', 'ring': '💍 +1', 'steak': '🥩 +1', 'brandy': '🥃 +1' };
            const colorMap = { 'rose': '#ff4466', 'chocolate': '#8B4513', 'ring': '#ffd700', 'steak': '#ff4444', 'brandy': '#ffa500' };
            const popFS = Math.round(18 * this.uiScale);
            const scorePopup = this.add.text(player.x, player.y - 60, labelMap[type], { fontFamily: '"Press Start 2P"', fontSize: `${popFS}px`, color: colorMap[type], stroke: '#000000', strokeThickness: Math.round(3 * this.uiScale) }).setOrigin(0.5).setDepth(500);
            this.tweens.add({ targets: scorePopup, y: player.y - 130, alpha: 0, duration: 800, onComplete: () => scorePopup.destroy() });
            this.updateHUD();
            const collectedAll = (this.itemsCollected[this.item1Key] >= this.requiredItem1 && this.itemsCollected[this.item2Key] >= this.requiredItem2);
            if (collectedAll && !this.hasKey) {
                this.statusText.setText('⛪ RUN TO THE CHURCH!').setColor('#00ff00');
                this.cameras.main.flash(300, 0, 255, 0);
                const arrow = this.add.text(this.player.x + 120, this.player.y - 80, '➡️⛪', { fontSize: `${Math.round(40 * this.uiScale)}px` }).setDepth(500);
                this.tweens.add({ targets: arrow, x: arrow.x + 50, alpha: { from: 1, to: 0.3 }, duration: 600, yoyo: true, repeat: 4, onComplete: () => { if (arrow) arrow.destroy(); } });
            }
        }
    }

    updateHUD() {
        const label1 = this.playerType === 'groom' ? '🥃 Brandy' : '🌹 Roses';
        const label2 = this.playerType === 'groom' ? '🥩 Steak' : '🍫 Chocs';
        this.item1Text.setText(`${label1}: ${this.itemsCollected[this.item1Key]}/${this.requiredItem1}`);
        this.item2Text.setText(`${label2}: ${this.itemsCollected[this.item2Key]}/${this.requiredItem2}`);
    }

    spawnParkItems() {
        const { width } = this.scale;
        const count1 = this.requiredItem1 + 8; const count2 = this.requiredItem2 + 12;
        for (let i = 0; i < count1; i++) {
            const x = Phaser.Math.Between(200, width * 5.3); const y = Phaser.Math.Between(200, 800);
            this.items.create(x, y, this.item1Key).setScale(0.10).setBounce(0.5).setData('type', this.item1Key);
        }
        for (let i = 0; i < count2; i++) {
            const x = Phaser.Math.Between(200, width * 5.3); const y = Phaser.Math.Between(200, 800);
            this.items.create(x, y, this.item2Key).setScale(0.12).setBounce(0.5).setData('type', this.item2Key);
        }
    }

    spawnObstacles() {
        const { width, height } = this.scale;
        for (let i = 0; i < 10; i++) {
            const x = Phaser.Math.Between(800, width * 5); const y = height - 150;
            const obstacle = this.obstacles.create(x, y, 'obstacle').setScale(0.2).setImmovable(true);
            obstacle.body.setAllowGravity(false); obstacle.body.setSize(obstacle.width * 0.8, obstacle.height * 0.8);
        }
    }

    spawnDog() {
        const { width, height } = this.scale;
        this.dogsSpawnedCount++;
        const side = Phaser.Math.RND.pick([-1, 1]);
        const spawnX = Phaser.Math.Clamp(this.player.x + side * Phaser.Math.Between(400, 700), 100, width * 5.5);
        const dog = this.dogs.create(spawnX, height - 200, 'chasing-dog');
        dog.setScale(0.18).setCollideWorldBounds(true); dog.body.setGravityY(500); dog.setDepth(50);
        dog.body.setSize(dog.width * 0.6, dog.height * 0.5); dog.body.setOffset(dog.width * 0.2, dog.height * 0.4);
        const dogSpeed = 160 + (this.dogsSpawnedCount - 1) * 8;
        dog.setData('chaseSpeed', dogSpeed); dog.setData('stunned', false); dog.setData('eatingTimer', 0);
        if (this.dogsSpawnedCount > 1) {
            this.statusText.setText('🐕 ANOTHER DOG APPEARED!').setColor('#ff4444'); this.cameras.main.shake(400, 0.01);
            this.time.delayedCall(2500, () => { if (!this.isGameOver) this.statusText.setText(this.playerType === 'groom' ? 'Collect brandy & steak!' : 'Collect roses & chocolates!').setColor('#ffff00'); });
        }
    }

    hitByDog(player, dog) {
        if (this.isGameOver || this.isInvulnerable) return;
        if (dog.getData('stunned')) return;
        const item2Name = this.item2Key; const item2Label = this.playerType === 'groom' ? 'Steak' : 'Choco'; const item2Emoji = this.playerType === 'groom' ? '🥩' : '🍫';
        const _ps = this.uiScale;
        if (this.itemsCollected[item2Name] > 0) {
            this.itemsCollected[item2Name]--; this.updateHUD(); audioManager.playHit(); this.playerDamageFlash();
            const popup = this.add.text(player.x, player.y - 80, `${item2Emoji} Here boy!`, { fontFamily: '"Press Start 2P"', fontSize: `${Math.round(16 * _ps)}px`, color: item2Name === 'steak' ? '#ff4444' : '#8B4513', stroke: '#000000', strokeThickness: Math.round(3 * _ps) }).setOrigin(0.5).setDepth(500);
            this.tweens.add({ targets: popup, y: popup.y - 80, alpha: 0, duration: 1200, onComplete: () => popup.destroy() });
            const throwImg = this.add.image(player.x, player.y - 30, item2Name).setScale(0.08).setDepth(500);
            const throwDir = dog.x < player.x ? -1 : 1;
            this.tweens.add({ targets: throwImg, x: dog.x + throwDir * 50, y: dog.y - 20, duration: 400, ease: 'Power2', onComplete: () => throwImg.destroy() });
            dog.setData('stunned', true); dog.setVelocity(0, 0);
            const eatText = this.add.text(dog.x, dog.y - 60, '🐕 Yum!', { fontFamily: '"Press Start 2P"', fontSize: `${Math.round(14 * _ps)}px`, color: '#ffd700', stroke: '#000000', strokeThickness: Math.round(3 * _ps) }).setOrigin(0.5).setDepth(500);
            this.tweens.add({ targets: dog, scaleX: 0.20, scaleY: 0.16, duration: 200, yoyo: true, repeat: 5 });
            this.time.delayedCall(3000, () => { if (dog.active) dog.setData('stunned', false); if (eatText.active) eatText.destroy(); });
            const knockDir = dog.x < player.x ? 1 : -1; player.setVelocityX(knockDir * 250);
            this.statusText.setText(`🐕 Dog caught you! -1 ${item2Label}`).setColor('#ff6600');
            this.time.delayedCall(2000, () => { if (!this.isGameOver) this.statusText.setText(this.playerType === 'groom' ? 'Collect brandy & steak!' : 'Collect roses & chocolates!').setColor('#ffff00'); });
        } else {
            audioManager.playHit(); this.playerDamageFlash();
            const popup = this.add.text(player.x, player.y - 80, `🐕 No ${item2Label}!`, { fontFamily: '"Press Start 2P"', fontSize: `${Math.round(14 * _ps)}px`, color: '#ff4444', stroke: '#000000', strokeThickness: Math.round(3 * _ps) }).setOrigin(0.5).setDepth(500);
            this.tweens.add({ targets: popup, y: popup.y - 80, alpha: 0, duration: 1200, onComplete: () => popup.destroy() });
            const knockDir = dog.x < player.x ? 1 : -1; player.setVelocity(knockDir * 350, -300);
            dog.setData('stunned', true); this.time.delayedCall(1500, () => { if (dog.active) dog.setData('stunned', false); });
            this.statusText.setText(`🐕 Find more ${item2Label}s!`).setColor('#ff4444');
            this.time.delayedCall(2000, () => { if (!this.isGameOver) this.statusText.setText(this.playerType === 'groom' ? 'Collect brandy & steak!' : 'Collect roses & chocolates!').setColor('#ffff00'); });
        }
    }

    spawnPowerUps() {
        const { width } = this.scale;
        for (let i = 0; i < 2; i++) {
            const x = Phaser.Math.Between(1000, width * 5); const y = Phaser.Math.Between(300, 700);
            this.powerUps.create(x, y, 'beer').setScale(0.15).setBounce(0.5).setData('powerType', 'shield');
        }
        const cx = Phaser.Math.Between(1500, width * 4); const cy = Phaser.Math.Between(300, 600);
        this.powerUps.create(cx, cy, 'champagne').setScale(0.12).setBounce(0.5).setData('powerType', 'speed');
    }

    playerDamageFlash() {
        this.isInvulnerable = true;
        this.tweens.add({ targets: this.player, alpha: { from: 1, to: 0.3 }, duration: 150, ease: 'Linear', yoyo: true, repeat: 4, onComplete: () => { this.player.setAlpha(1); this.isInvulnerable = false; } });
    }

    hitObstacle(player, obstacle) {
        if (this.isGameOver || this.isInvulnerable) return;
        if (this.isShielded) { if (this.bouquets.contains(obstacle)) { obstacle.destroy(); audioManager.playHit(); } return; }
        audioManager.playHit(); this.playerDamageFlash();
        if (this.bouquets.contains(obstacle)) obstacle.destroy();
        const knockDir = obstacle.x < player.x ? 1 : -1; player.setVelocity(knockDir * 300, -200);
        this.statusText.setText('Ouch! Watch out!').setColor('#ff6600'); this.cameras.main.shake(150, 0.008);
        this.time.delayedCall(2000, () => { if (!this.isGameOver) this.statusText.setText(this.playerType === 'groom' ? 'Collect brandy & steak!' : 'Collect roses & chocolates!').setColor('#ffff00'); });
    }

    enterChurch(player, church) {
        if (this.isGameOver || this.churchCooldown) return;
        const hasAllItems = (this.itemsCollected[this.item1Key] >= this.requiredItem1 && this.itemsCollected[this.item2Key] >= this.requiredItem2);
        if (this.hasKey && !this.churchDoorOpen) {
            this.churchDoorOpen = true; this.isGameOver = true; audioManager.playKey();
            this.statusText.setText('🚪 DOOR OPENING...').setColor('#ffd700'); this.cameras.main.shake(300, 0.008);
            player.setVelocity(0, 0); player.body.setAllowGravity(false); this.playPlayerAnim('idle');
            const doorGlow = this.add.rectangle(this.church.x, this.church.y - 80, 60, 0, 0xfff8dc).setOrigin(0.5, 1).setDepth(0).setAlpha(0.9);
            this.tweens.add({ targets: doorGlow, displayHeight: 130, displayWidth: 80, alpha: 1, duration: 800, ease: 'Power2', onComplete: () => {
                this.statusText.setText('✨ Welcome! ✨').setColor('#ffd700');
                for (let i = 0; i < 10; i++) {
                    const _uis = this.uiScale;
                    const s = this.add.text(this.church.x + Phaser.Math.Between(-30, 30), this.church.y - Phaser.Math.Between(40, 140), Phaser.Math.RND.pick(['✨', '💒', '⭐', '🌟', '💫']), { fontSize: Math.round(Phaser.Math.Between(16, 28) * _uis) + 'px' }).setDepth(500);
                    this.tweens.add({ targets: s, y: s.y - 60, alpha: 0, duration: 800, delay: i * 80, onComplete: () => s.destroy() });
                }
                this.tweens.add({ targets: player, x: this.church.x, duration: 600, delay: 300, ease: 'Power1', onStart: () => { player.setFlipX(player.x < this.church.x); this.playPlayerAnim('walk'); }, onComplete: () => {
                    this.tweens.add({ targets: player, scaleX: 0.05, scaleY: 0.05, alpha: 0, duration: 500, ease: 'Power2', onComplete: () => { this.cameras.main.flash(500, 255, 255, 200); this.time.delayedCall(600, () => this.completeLevel()); } });
                }});
            }});
        } else if (hasAllItems && !this.parkKeyDropped) {
            this.parkKeyDropped = true; this.churchCooldown = true; audioManager.playKey();
            this.statusText.setText('🔑 A KEY APPEARED!').setColor('#ffd700'); this.cameras.main.shake(400, 0.01); this.cameras.main.flash(300, 255, 215, 0);
            const keyX = player.x; const keyY = player.y - 150; const key = this.keyGroup.create(keyX, keyY, 'key'); key.setScale(0.15).setBounce(0.3); key.body.setGravityY(400);
            for (let i = 0; i < 10; i++) {
                const sparkle = this.add.text(keyX + Phaser.Math.Between(-80, 80), keyY + Phaser.Math.Between(-60, 60), Phaser.Math.RND.pick(['✨', '🔑', '⭐', '💫']), { fontSize: Math.round(Phaser.Math.Between(20, 36) * this.uiScale) + 'px' }).setDepth(500).setAlpha(0);
                this.tweens.add({ targets: sparkle, alpha: { from: 0, to: 1 }, y: sparkle.y - 50, duration: Phaser.Math.Between(400, 800), delay: Phaser.Math.Between(0, 400), yoyo: true, onComplete: () => sparkle.destroy() });
            }
            this.time.delayedCall(1500, () => { this.churchCooldown = false; if (!this.isGameOver) this.statusText.setText('🔑 Grab the key!').setColor('#00ff00'); });
        } else if (!hasAllItems && !this.parkKeyDropped) this.showMissingItems();
    }

    showMissingItems() {
        this.churchCooldown = true; let msg = 'Need: ';
        const label1 = this.playerType === 'groom' ? '🥃' : '🌹'; const label2 = this.playerType === 'groom' ? '🥩' : '🍫';
        const item1Left = Math.max(0, this.requiredItem1 - this.itemsCollected[this.item1Key]);
        const item2Left = Math.max(0, this.requiredItem2 - this.itemsCollected[this.item2Key]);
        if (item1Left > 0) msg += `${item1Left}${label1} `; if (item2Left > 0) msg += `${item2Left}${label2}`;
        this.statusText.setText(msg).setColor('#ff6600');
        this.time.delayedCall(2500, () => { this.churchCooldown = false; if (!this.isGameOver) this.statusText.setText(this.playerType === 'groom' ? 'Collect brandy & steak!' : 'Collect roses & chocolates!').setColor('#ffff00'); });
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

    collectKey(player, key) {
        this.hasKey = true; audioManager.playKey();
        this.statusText.setText('🔑 KEY! Enter the Church!').setColor('#00ff00'); this.cameras.main.flash(300, 255, 215, 0);
        key.destroy();
    }

    collectPowerUp(player, powerUp) {
        const powerType = powerUp.getData('powerType') || 'shield'; powerUp.destroy(); audioManager.playPowerUp();
        if (powerType === 'speed') {
            this.statusText.setText('CHAMPAGNE SPEED! 🥂').setColor('#ffd700'); this.isSpeedBoosted = true; this.speedBoostTime = 4;
            this.speedTrailTimer = this.time.addEvent({ delay: 150, callback: () => {
                if (!this.isSpeedBoosted || this.isGameOver) return;
                const sparkle = this.add.text(this.player.x, this.player.y + 20, '✨', { fontSize: `${Math.round(18 * this.uiScale)}px` }).setDepth(150).setAlpha(0.8);
                this.tweens.add({ targets: sparkle, alpha: 0, y: sparkle.y + 30, duration: 400, onComplete: () => sparkle.destroy() });
            }, loop: true });
            this.time.delayedCall(4000, () => { this.isSpeedBoosted = false; if (this.speedTrailTimer) this.speedTrailTimer.destroy(); if (!this.isGameOver) this.statusText.setText('Speed wore off!').setColor('#ffff00'); });
        } else {
            this.isShielded = true; this.shieldTimeRemaining = 5; this.statusText.setText('SHIELDED! 🍺').setColor('#ffd700');
            this.tweens.add({ targets: this.player, alpha: 0.5, duration: 100, yoyo: true, repeat: 5 });
        }
    }

    emitDustBurst(count, speedMax) {
        if (!this.dustEmitter) return;
        this.dustEmitter.followOffset.x = 0;
        for (let i = 0; i < count; i++) this.dustEmitter.emitParticle(1);
    }

    playPlayerAnim(action) {
        const animKey = `${this.playerType}-${action}`;
        if (this.currentAnimKey !== animKey) { this.currentAnimKey = animKey; this.player.play(animKey, true); }
    }

    update(time, delta) {
        if (this.isGameOver) return;
        this.elapsedTime = (this.time.now - this.startTime) / 1000;
        this.timerText.setText(`Time: ${this.elapsedTime.toFixed(1)}s`);
        if (this.isShielded) {
            this.shieldTimeRemaining -= delta / 1000;
            if (this.shieldTimeRemaining <= 0) { this.isShielded = false; this.shieldText.setText(''); this.player.setTint(0xffffff); this.statusText.setText('Shield worn off!').setColor('#ffff00'); }
            else { this.shieldText.setText(`Shield: ${this.shieldTimeRemaining.toFixed(1)}s`); const tint = (Math.floor(time / 100) % 2 === 0) ? 0xffff00 : 0xffffff; this.player.setTint(tint); }
        }
        if (this.isSpeedBoosted) { this.speedBoostTime -= delta / 1000; if (this.speedBoostTime <= 0) this.isSpeedBoosted = false; }
        
        // Drag-to-move logic for mobile
        if (this.isDragging) {
            const dx = this.dragCurrentX - this.dragStartX;
            const deadzone = 20; // pixels of deadzone before movement starts
            
            this.touchLeft = false;
            this.touchRight = false;
            this.touchRun = false;
            
            if (Math.abs(dx) > deadzone) {
                if (dx < 0) this.touchLeft = true;
                else this.touchRight = true;
                // Run if dragged far enough (more than 100px from start)
                if (Math.abs(dx) > 100) this.touchRun = true;
            }
        }

        const isJumping = !this.player.body.touching.down; const onGround = this.player.body.touching.down;
        const isRunning = (this.cursors.shift && this.cursors.shift.isDown) || this.touchRun; 
        const speedMultiplier = this.isSpeedBoosted ? 1.5 : 1; const speed = (isRunning ? 700 : 450) * speedMultiplier;
        let nextAnim = 'idle'; 
        const leftInput = this.cursors.left.isDown || this.touchLeft; 
        const rightInput = this.cursors.right.isDown || this.touchRight; 
        const jumpInput = this.cursors.up.isDown || this.touchJump; 
        const isMoving = leftInput || rightInput;
        if (leftInput) { this.player.setVelocityX(-speed); this.player.setFlipX(false); nextAnim = isRunning ? 'run' : 'walk'; }
        else if (rightInput) { this.player.setVelocityX(speed); this.player.setFlipX(true); nextAnim = isRunning ? 'run' : 'walk'; }
        else { this.player.setVelocityX(0); nextAnim = 'idle'; }
        if (jumpInput && onGround) { this.player.setVelocityY(-1350); nextAnim = 'jump'; audioManager.playJump(); this.touchJump = false; }
        if (isJumping) { nextAnim = 'jump'; this.player.setAngle(this.player.body.velocity.y * 0.03); } else this.player.setAngle(0);
        if (onGround && isMoving) {
            this.dustTimer += delta; const emitInterval = isRunning ? 60 : 200; const particleCount = isRunning ? 3 : 1;
            if (this.dustTimer >= emitInterval) { this.dustTimer = 0; const facingRight = this.player.flipX; const offsetX = facingRight ? -20 : 20; this.dustEmitter.followOffset.x = offsetX; this.dustEmitter.emitParticle(particleCount); }
        } else this.dustTimer = 0;
        this.playPlayerAnim(nextAnim);
        if (this.dogsSpawnedCount > 0) {
            this.dogs.children.iterate((dog) => {
                if (!dog || !dog.active || dog.getData('stunned')) return;
                const chaseSpeed = dog.getData('chaseSpeed') || 160; const dx = this.player.x - dog.x; const dy = this.player.y - dog.y; const distX = Math.abs(dx);
                const dir = dx > 0 ? 1 : -1; dog.setVelocityX(chaseSpeed * dir); dog.setFlipX(dir > 0);
                const dogOnGround = dog.body.touching.down || dog.body.blocked.down;
                if (dogOnGround && dy < -80 && distX < 500) dog.setVelocityY(dy < -200 ? -850 : -650);
                if (dogOnGround) dog.setAngle(Math.sin(this.time.now * 0.012) * 2); else dog.setAngle(0);
            });
        }
        if (!this.isGameOver) {
            const dx = Math.abs(this.player.x - this.churchZoneX); const dy = Math.abs(this.player.y - this.churchZoneY);
            if (dx < 180 && dy < 200) this.enterChurch(this.player, this.church);
        }
        if (this.player.y > this.scale.height + 100) this.scene.start('GameOverScene', { result: 'lost', playerType: this.playerType, level: this.level });
    }
}