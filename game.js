const canvas = document.getElementById('poolCanvas');
const ctx = canvas.getContext('2d');
const bloodCanvas = document.getElementById('bloodCanvas');
const bloodCtx = bloodCanvas.getContext('2d');
const powerFill = document.getElementById('powerFill');
const powerValue = document.getElementById('powerValue');
const scoreDisplay = document.getElementById('score');
const paraseyComment = document.getElementById('paraseyComment');

// Рогалик система (упрощённая)
let currentLevel = 1;
let gold = 0;
let lives = 3;
let shopOpen = false;

// Предметы магазина
const shopItems = [
    { name: 'Кровь', cost: 50, effect: 'life', description: '+1 жизнь' },
    { name: 'Клятва', cost: 30, effect: 'luck', description: 'Шары чаще падают в бездну' },
    { name: 'Сила тьмы', cost: 40, effect: 'power', description: 'Сильнее удары' },
    { name: 'Глаз смерти', cost: 25, effect: 'vision', description: 'Длиннее линия прицеливания' },
    { name: 'Экзорцизм', cost: 100, effect: 'cleanse', description: 'Убрать все проклятия' },
    { name: 'Дар демона', cost: 75, effect: 'blessing', description: 'Случайная тёмная сила' }
];

// Проклятия
const cursesList = [
    { name: 'Слепота', description: 'Линия прицеливания скрыта', effect: 'blind' },
    { name: 'Тряска', description: 'Экран трясётся', effect: 'shake' },
    { name: 'Гравитация', description: 'Притяжение к лузам', effect: 'pocketGravity' }
];

// Благословения
const blessingsList = [
    { name: 'Точность', description: 'Удары точнее', effect: 'precision' },
    { name: 'Щит', description: 'Следующий удар не убьёт', effect: 'shield' },
    { name: 'Мagnet', description: 'Шары притягиваются к лузам', effect: 'magnet' }
];

// Типы врагов
const enemyTypes = [
    { name: 'chase', color: '#FF0000', behavior: 'chase' },
    { name: 'explode', color: '#FF6600', behavior: 'explode' },
    { name: 'ghost', color: '#808080', behavior: 'ghost' },
    { name: 'shield', color: '#4169E1', behavior: 'shield' }
];

// Модификаторы уровня
const modifiers = [
    { name: 'Медленные шары', description: 'Шары замедляются быстрее', effect: 'slowBalls' },
    { name: 'Гравитация', description: 'Шары притягиваются к центру', effect: 'gravity' },
    { name: 'Ледяной стол', description: 'Меньше трения', effect: 'iceTable' }
];

// Audio Context для звуков
let audioContext = null;

// Звуковые файлы
const pocketSoundFile = new Audio('lenin.mp3');
pocketSoundFile.volume = 1.0;

const failSoundFile = new Audio('lenin_fail.mp3');
failSoundFile.volume = 1.0;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Звук удара кия
function playCueSound(power) {
    initAudio();

    // Несколько осцилляторов для жуткого звука
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Очень низкие частоты с диссонансом
    osc1.frequency.value = 40 + power * 3;
    osc2.frequency.value = 55 + power * 4;
    osc1.type = 'sawtooth';
    osc2.type = 'square';

    // Медленный спад
    gainNode.gain.setValueAtTime(Math.min(power / 15, 0.35), audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    osc1.start(audioContext.currentTime);
    osc2.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.3);
    osc2.stop(audioContext.currentTime + 0.3);
}

// Звук столкновения шаров
function playBallCollisionSound(intensity) {
    initAudio();

    // Три осциллятора для жуткого диссонанса
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const osc3 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    osc3.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Жуткие диссонирующие частоты
    osc1.frequency.value = 150 + Math.random() * 80;
    osc2.frequency.value = 180 + Math.random() * 100;
    osc3.frequency.value = 220 + Math.random() * 120;
    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc3.type = 'triangle';

    gainNode.gain.setValueAtTime(Math.min(intensity / 10, 0.2), audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    osc1.start(audioContext.currentTime);
    osc2.start(audioContext.currentTime);
    osc3.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.1);
    osc2.stop(audioContext.currentTime + 0.1);
    osc3.stop(audioContext.currentTime + 0.1);
}

// Звук попадания в лузу
function playPocketSound() {
    initAudio();
    pocketSoundFile.currentTime = 0;
    pocketSoundFile.play().catch(e => console.log('Audio play error:', e));
}

// Звук проигрыша
function playFailSound() {
    initAudio();
    failSoundFile.currentTime = 0;
    failSoundFile.play().catch(e => console.log('Audio play error:', e));
}

// Звук отскока от борта
function playCushionSound() {
    initAudio();

    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Очень низкие мрачные частоты
    osc1.frequency.value = 60 + Math.random() * 30;
    osc2.frequency.value = 80 + Math.random() * 40;
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';

    gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    osc1.start(audioContext.currentTime);
    osc2.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.2);
    osc2.stop(audioContext.currentTime + 0.2);
}

// Звук комбо
function playComboSound(comboLevel) {
    initAudio();

    const baseFreq = 150 + comboLevel * 50;

    for (let i = 0; i < comboLevel; i++) {
        setTimeout(() => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = baseFreq + i * 80;
            oscillator.type = 'sawtooth';

            gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        }, i * 120);
    }
}

// Звук достижения
function playAchievementSound() {
    initAudio();

    // Жуткие ноты
    const notes = [100, 150, 200, 250];

    notes.forEach((freq, i) => {
        setTimeout(() => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = freq;
            oscillator.type = 'sawtooth';

            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.25);
        }, i * 180);
    });
}

// Прикольный звук Парасея
function playParaseySound() {
    initAudio();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Хрюкающий звук
    oscillator.frequency.value = 150;
    oscillator.type = 'sawtooth';
    
    // Modulation for "oink" effect
    oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(100, audioContext.currentTime + 0.1);
    oscillator.frequency.linearRampToValueAtTime(200, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

// Звук скримера
function playScreamSound() {
    initAudio();
    
    // Резкий страшный звук
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 200;
    oscillator.type = 'sawtooth';
    
    // Резкое изменение частоты для скримера
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Скример эффект
function triggerScream() {
    const screamOverlay = document.createElement('div');
    screamOverlay.className = 'scream-overlay';

    const screamImage = document.createElement('img');
    screamImage.src = 'parasey.png';
    screamImage.className = 'scream-image';
    screamOverlay.appendChild(screamImage);

    const screamText = document.createElement('div');
    screamText.className = 'scream-text';

    // Разные надписи
    const screamTexts = ['ТЫ МЁРТ!!!', 'СМЕРТЬ!!!', 'БЕГИ!!!', 'ПАРАСЕЙ!!!', 'КОНЕЦ!'];
    const text = screamTexts[Math.floor(Math.random() * screamTexts.length)];
    screamText.textContent = text;
    screamText.setAttribute('data-text', text);

    screamOverlay.appendChild(screamText);

    document.body.appendChild(screamOverlay);
    document.body.classList.add('scream-active');

    playScreamSound();
    document.body.style.animation = 'shake 0.5s ease';

    setTimeout(() => {
        screamOverlay.remove();
        document.body.classList.remove('scream-active');
        document.body.style.animation = '';
    }, 1500);
}

// Константы
const BALL_RADIUS = 14;
const POCKET_RADIUS = 22;
const FRICTION = 0.985;
const TABLE_COLOR = '#1a1a1a';
const CUSHION_COLOR = '#2a0a0a';
const CUSHION_BOUNCE = 0.85;

// Система крови с реалистичными брызгами
let bloodParticles = [];
let bloodSplatters = []; // Постоянные следы крови

// Генерация неправильной формы капли
function generateOrganicShape(size) {
    const points = [];
    const numPoints = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        // Noise для неровных краёв
        const noise = Math.sin(i * 3) * 0.2 + Math.cos(i * 2) * 0.15 + Math.random() * 0.2;
        points.push({
            angle: angle,
            radius: 1 + noise
        });
    }
    return points;
}

// Красивая система крови с градиентами
let bloodTexture = null;

// Лимит эффекта крови на экране
let lastScreenBloodTime = 0;
const SCREEN_BLOOD_COOLDOWN = 5000;

// Состояние игры
let balls = [];
let cueBall = null;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let dragEnd = { x: 0, y: 0 };
let score = 0;
let isPaused = false;
let pockets = [];
let combo = 0;
let totalShots = 0;
let perfectShots = 0;
let achievements = {
    firstPocket: false,
    combo3: false,
    combo5: false,
    perfectShot: false,
    cleanSweep: false
};
let curses = [];
let blessings = [];
let enemies = [];
let obstacles = [];
let currentBoss = null;
let currentModifier = null;

// Комментарии хоррор
const paraseyComments = {
    start: [
        "Тёмные силы ждут... �",
        "Смерть неизбежна... 🩸",
        "Готовься к ужасу... 👁️"
    ],
    pocket: [
        "Жертва принята... 🩸",
        "Кровь льётся... �",
        "Тьма поглощает... 👁️",
        "Душа улетает... �",
        "Ещё одна жертва... �"
    ],
    combo: [
        "Массовое убийство! �",
        "Ужасная резня! 🩸",
        "Тьма нарастает! 👁️",
        "Смерть неумолима! �"
    ],
    miss: [
        "Душа ускользает... �",
        "Тьма терпелива... 👁️",
        "Смерть придёт... �",
        "Жди конца... 🩸"
    ],
    foul: [
        "Демоны смеются... �",
        "Тьма наказывает... 👁️",
        "Смерть приближается... �"
    ],
    win: [
        "Всё мертво... 💀",
        "Полное уничтожение... 🩸",
        "Тьма победила... 🐷",
        "КОНЕЦ ВСЕГО... 💀"
    ]
};

// Анимации Парасея
function setParaseyAnimation(type) {
    const mascot = document.querySelector('.mascot-image');
    if (!mascot) return;

    // Убираем все классы анимаций
    mascot.classList.remove('happy', 'scared', 'angry');

    switch(type) {
        case 'happy':
            mascot.classList.add('happy');
            setTimeout(() => mascot.classList.remove('happy'), 2000);
            break;
        case 'scared':
            mascot.classList.add('scared');
            setTimeout(() => mascot.classList.remove('scared'), 1500);
            break;
        case 'angry':
            mascot.classList.add('angry');
            setTimeout(() => mascot.classList.remove('angry'), 1500);
            break;
    }
}

// Инициализация луз
function initPockets() {
    pockets = [
        { x: 35, y: 35 },
        { x: canvas.width / 2, y: 30 },
        { x: canvas.width - 35, y: 35 },
        { x: 35, y: canvas.height - 35 },
        { x: canvas.width / 2, y: canvas.height - 30 },
        { x: canvas.width - 35, y: canvas.height - 35 }
    ];
}

// Класс шара с улучшенной физикой
class Ball {
    constructor(x, y, color, number) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.color = color;
        this.number = number;
        this.radius = BALL_RADIUS;
        this.inPocket = false;
        this.rotation = 0;
        this.angularVelocity = 0;
    }

    draw() {
        if (this.inPocket) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Тень
        ctx.beginPath();
        ctx.arc(4, 4, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fill();

        // Основной шар с 3D эффектом
        const gradient = ctx.createRadialGradient(-4, -4, 0, 0, 0, this.radius);
        gradient.addColorStop(0, this.lightenColor(this.color, 60));
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(0.8, this.darkenColor(this.color, 20));
        gradient.addColorStop(1, this.darkenColor(this.color, 40));

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Полоса на шаре (для numbered balls)
        if (this.number > 0 && this.number <= 8) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
        }

        // Блик
        ctx.beginPath();
        ctx.arc(-5, -5, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill();

        // Второй блик
        ctx.beginPath();
        ctx.arc(3, 3, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fill();

        // Номер шара
        if (this.number > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            
            ctx.fillStyle = 'black';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.number, 0, 0);
        }

        ctx.restore();
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `rgb(${R},${G},${B})`;
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `rgb(${R},${G},${B})`;
    }

    update() {
        if (this.inPocket) return;

        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.angularVelocity;

        // Трение
        this.vx *= FRICTION;
        this.vy *= FRICTION;
        this.angularVelocity *= FRICTION;

        // Остановка при малой скорости
        if (Math.abs(this.vx) < 0.05) this.vx = 0;
        if (Math.abs(this.vy) < 0.05) this.vy = 0;
        if (Math.abs(this.angularVelocity) < 0.01) this.angularVelocity = 0;

        // Отскок от стен с улучшенной физикой
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -CUSHION_BOUNCE;
            this.angularVelocity += this.vy * 0.01;
            if (Math.abs(this.vx) > 1) playCushionSound();
        }
        if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx *= -CUSHION_BOUNCE;
            this.angularVelocity -= this.vy * 0.01;
            if (Math.abs(this.vx) > 1) playCushionSound();
        }
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy *= -CUSHION_BOUNCE;
            this.angularVelocity -= this.vx * 0.01;
            if (Math.abs(this.vy) > 1) playCushionSound();
        }
        if (this.y + this.radius > canvas.height) {
            this.y = canvas.height - this.radius;
            this.vy *= -CUSHION_BOUNCE;
            this.angularVelocity += this.vx * 0.01;
            if (Math.abs(this.vy) > 1) playCushionSound();
        }

        // Проверка попадания в лузу
        for (let pocket of pockets) {
            const dx = this.x - pocket.x;
            const dy = this.y - pocket.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < POCKET_RADIUS) {
                this.inPocket = true;
                this.vx = 0;
                this.vy = 0;
                this.angularVelocity = 0;
                
                showBloodCheckmark();
                addBloodSplatter(pocket.x, pocket.y, 10);
                createBloodParticles(pocket.x, pocket.y);
                
                if (this.number === 0) {
                    // Белый шар в лузу - потеря жизни!
                    combo = 0;
                    lives--;
                    updateLevelDisplay();
                    triggerScream();
                    addBloodSplatter(pocket.x, pocket.y, 15);
                    playFailSound();
                    
                    if (lives <= 0) {
                        paraseyComment.textContent = `🐷 Парасей: "GAME OVER! Уровень ${currentLevel}"`;
                        setTimeout(() => {
                            currentLevel = 1;
                            gold = 0;
                            lives = 3;
                            updateLevelDisplay();
                            initBalls();
                        }, 3000);
                    } else {
                        setTimeout(() => {
                            this.inPocket = false;
                            this.x = 200;
                            this.y = canvas.height / 2;
                            this.vx = 0;
                            this.vy = 0;
                        }, 1500);
                    }
                } else if (this.number === 8) {
                    // Черный шар в лузу - штраф золота!
                    triggerScream();
                    gold = Math.max(0, gold - 20);
                    updateLevelDisplay();
                    addBloodSplatter(pocket.x, pocket.y, 12);
                    playFailSound();
                } else {
                    // Цветной шар в лузу
                    score++;
                    combo++;
                    gold += 5;
                    scoreDisplay.textContent = score;
                    updateLevelDisplay();
                    
                    triggerFlashEffect();
                    showBloodCheckmark();
                    playPocketSound();
                    
                    if (combo >= 3) {
                        updateParaseyComment('combo');
                        playParaseySound();
                    } else {
                        updateParaseyComment('pocket');
                    }
                    
                    checkAchievements();
                }
            }
        }
    }

    isMoving() {
        return Math.abs(this.vx) > 0.05 || Math.abs(this.vy) > 0.05;
    }
}

// Улучшенное столкновение шаров
function checkBallCollision(ball1, ball2) {
    if (ball1.inPocket || ball2.inPocket) return;

    const dx = ball2.x - ball1.x;
    const dy = ball2.y - ball1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < ball1.radius + ball2.radius) {
        // Нормализованный вектор столкновения
        const nx = dx / distance;
        const ny = dy / distance;

        // Относительная скорость
        const dvx = ball1.vx - ball2.vx;
        const dvy = ball1.vy - ball2.vy;

        // Скорость вдоль нормали
        const dvn = dvx * nx + dvy * ny;

        // Если шары сближаются
        if (dvn > 0) {
            // Импульс с учётом вращения
            const impulse = 2 * dvn / 2;
            const tangentX = -ny;
            const tangentY = nx;

            // Нормальная составляющая
            ball1.vx -= impulse * nx;
            ball1.vy -= impulse * ny;
            ball2.vx += impulse * nx;
            ball2.vy += impulse * ny;

            // Касательная составляющая (вращение)
            const tangentVel = dvx * tangentX + dvy * tangentY;
            ball1.angularVelocity += tangentVel * 0.05;
            ball2.angularVelocity -= tangentVel * 0.05;

            // Разделение шаров
            const overlap = (ball1.radius + ball2.radius - distance) / 2;
            ball1.x -= overlap * nx;
            ball1.y -= overlap * ny;
            ball2.x += overlap * nx;
            ball2.y += overlap * ny;

            // Кровь при столкновении
            const midX = (ball1.x + ball2.x) / 2;
            const midY = (ball1.y + ball2.y) / 2;
            addBloodSplatter(midX, midY, 2);
            
            // Звук столкновения
            const impactSpeed = Math.sqrt(dvx * dvx + dvy * dvy);
            if (impactSpeed > 1) {
                playBallCollisionSound(impactSpeed);
            }
        }
    }
}

// Инициализация шаров
function initBalls() {
    balls = [];
    score = 0;
    combo = 0;
    totalShots = 0;
    perfectShots = 0;
    scoreDisplay.textContent = score;
    updateStats();
    updateLevelDisplay();

    // Белый шар
    cueBall = new Ball(250, canvas.height / 2, '#ffffff', 0);
    balls.push(cueBall);

    // Цветные шары в пирамиде
    const colors = [
        '#FFD700', '#FF6347', '#4169E1', '#32CD32', '#FF69B4',
        '#FF4500', '#9370DB', '#00CED1', '#FF8C00', '#DC143C',
        '#BA55D3', '#20B2AA', '#FF1493', '#00FA9A', '#FFD700'
    ];

    let startX = 850;
    let startY = canvas.height / 2;
    let ballIndex = 0;

    // Количество шаров зависит от уровня
    const ballCount = Math.min(15 + currentLevel, 30);

    for (let row = 0; row < 5; row++) {
        for (let col = 0; col <= row; col++) {
            if (ballIndex < ballCount && ballIndex < colors.length) {
                const x = startX + row * (BALL_RADIUS * 2 + 3);
                const y = startY + (col - row / 2) * (BALL_RADIUS * 2 + 3);
                balls.push(new Ball(x, y, colors[ballIndex], ballIndex + 1));
                ballIndex++;
            }
        }
    }

    // Инициализация врагов и препятствий для рогалик системы
    spawnEnemies();
    spawnObstacles();
    applyLevelModifier();

    updateParaseyComment('start');
}

// Применение модификатора уровня
function applyLevelModifier() {
    currentModifier = null;
    document.getElementById('modifierDisplay').style.display = 'none';
    
    if (currentLevel >= 2) {
        const randomModifier = modifiers[Math.floor(Math.random() * modifiers.length)];
        currentModifier = randomModifier;
        document.getElementById('modifierDisplay').style.display = 'block';
        document.getElementById('currentModifier').textContent = randomModifier.name;
        paraseyComment.textContent = `🐷 Парасей: "Модификатор уровня: ${randomModifier.name}! ${randomModifier.description}"`;
    }
    
    updateStatusEffects();
}

// Спавн врагов
function spawnEnemies() {
    enemies = [];
    const enemyCount = Math.min(currentLevel - 2, 5);
    
    for (let i = 0; i < enemyCount; i++) {
        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        const enemy = {
            x: Math.random() * (canvas.width - 100) + 50,
            y: Math.random() * (canvas.height - 100) + 50,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            radius: BALL_RADIUS,
            color: type.color,
            behavior: type.behavior
        };
        enemies.push(enemy);
    }
}

// Спавн препятствий
function spawnObstacles() {
    obstacles = [];
    const obstacleCount = Math.min(currentLevel - 4, 3);
    
    for (let i = 0; i < obstacleCount; i++) {
        obstacles.push({
            x: Math.random() * (canvas.width - 200) + 100,
            y: Math.random() * (canvas.height - 100) + 50,
            width: 30,
            height: 30
        });
    }
}

// Обновление врагов
function updateEnemies() {
    for (let enemy of enemies) {
        if (enemy.behavior === 'chase') {
            // Преследует белый шар
            const dx = cueBall.x - enemy.x;
            const dy = cueBall.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            enemy.vx += (dx / dist) * 0.1;
            enemy.vy += (dy / dist) * 0.1;
        }
        
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
        
        // Отскок от стен
        if (enemy.x < enemy.radius || enemy.x > canvas.width - enemy.radius) {
            enemy.vx *= -1;
        }
        if (enemy.y < enemy.radius || enemy.y > canvas.height - enemy.radius) {
            enemy.vy *= -1;
        }
        
        // Ограничение скорости
        const speed = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy);
        if (speed > 3) {
            enemy.vx = (enemy.vx / speed) * 3;
            enemy.vy = (enemy.vy / speed) * 3;
        }
    }
}

// Проверка столкновения с врагами
function checkEnemyCollision() {
    for (let enemy of enemies) {
        const dx = cueBall.x - enemy.x;
        const dy = cueBall.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < BALL_RADIUS * 2) {
            if (enemy.behavior === 'explode') {
                createParticles(enemy.x, enemy.y, '#FF6600', 30);
                playCueSound(15);
                cueBall.vx += (Math.random() - 0.5) * 10;
                cueBall.vy += (Math.random() - 0.5) * 10;
            } else if (enemy.behavior === 'ghost') {
                // Призрак - проходит сквозь
            } else if (enemy.behavior === 'shield') {
                // Щит - блокирует удар
            } else {
                const nx = dx / dist;
                const ny = dy / dist;
                cueBall.vx -= nx * 5;
                cueBall.vy -= ny * 5;
            }
        }
    }
}

// Проверка столкновения с препятствиями
function checkObstacleCollision() {
    for (let obs of obstacles) {
        // Проверка прямоугольного препятствия
        if (cueBall.x + BALL_RADIUS > obs.x && 
            cueBall.x - BALL_RADIUS < obs.x + obs.width &&
            cueBall.y + BALL_RADIUS > obs.y && 
            cueBall.y - BALL_RADIUS < obs.y + obs.height) {
            
            // Определяем сторону столкновения
            const overlapLeft = (cueBall.x + BALL_RADIUS) - obs.x;
            const overlapRight = (obs.x + obs.width) - (cueBall.x - BALL_RADIUS);
            const overlapTop = (cueBall.y + BALL_RADIUS) - obs.y;
            const overlapBottom = (obs.y + obs.height) - (cueBall.y - BALL_RADIUS);
            
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
            
            if (minOverlap === overlapLeft) {
                cueBall.x = obs.x - BALL_RADIUS;
                cueBall.vx *= -0.8;
            } else if (minOverlap === overlapRight) {
                cueBall.x = obs.x + obs.width + BALL_RADIUS;
                cueBall.vx *= -0.8;
            } else if (minOverlap === overlapTop) {
                cueBall.y = obs.y - BALL_RADIUS;
                cueBall.vy *= -0.8;
            } else {
                cueBall.y = obs.y + obs.height + BALL_RADIUS;
                cueBall.vy *= -0.8;
            }
        }
    }
}

// Обновление дисплея уровня
function updateLevelDisplay() {
    document.getElementById('level').textContent = currentLevel;
    document.getElementById('gold').textContent = gold;
    document.getElementById('lives').textContent = lives;
}

// Переход на следующий уровень
function nextLevel() {
    currentLevel++;
    gold += currentLevel * 10; // Бонус за уровень
    updateLevelDisplay();
    paraseyComment.textContent = `🐷 Парасей: "Уровень ${currentLevel}! Готов к хаосу?"`;
    initBalls();
}

// Магазин
function openShop() {
    shopOpen = true;
    isPaused = true;
    document.getElementById('shopOverlay').style.display = 'flex';
    document.getElementById('shopGold').textContent = gold;
    
    const shopItemsContainer = document.getElementById('shopItems');
    shopItemsContainer.innerHTML = '';
    
    shopItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'shop-item';
        itemDiv.innerHTML = `
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <div class="price">💰 ${item.cost}</div>
        `;
        itemDiv.onclick = () => buyItem(item);
        shopItemsContainer.appendChild(itemDiv);
    });
}

function closeShop() {
    shopOpen = false;
    isPaused = false;
    document.getElementById('shopOverlay').style.display = 'none';
    saveGame();
}

function buyItem(item) {
    if (gold >= item.cost) {
        gold -= item.cost;
        document.getElementById('shopGold').textContent = gold;
        updateLevelDisplay();
        
        switch(item.effect) {
            case 'life':
                lives++;
                break;
            case 'luck':
                localStorage.setItem('luckBoost', 'true');
                break;
            case 'gold':
                gold += 50;
                updateLevelDisplay();
                break;
        }
        
        paraseyComment.textContent = `🐷 Парасей: "Куплено: ${item.name}!"`;
        saveGame();
    } else {
        paraseyComment.textContent = `🐷 Парасей: "Недостаточно золота!"`;
    }
}

// Сохранение игры
function saveGame() {
    const saveData = {
        level: currentLevel,
        gold: gold,
        lives: lives,
        highLevel: Math.max(currentLevel, localStorage.getItem('highLevel') || 1),
        totalGold: parseInt(localStorage.getItem('totalGold') || 0) + gold
    };
    localStorage.setItem('poolRoguelike', JSON.stringify(saveData));
    localStorage.setItem('highLevel', saveData.highLevel);
    localStorage.setItem('totalGold', saveData.totalGold);
    updateHighscoreDisplay();
}

// Загрузка игры
function loadGame() {
    const saved = localStorage.getItem('poolRoguelike');
    if (saved) {
        const data = JSON.parse(saved);
        currentLevel = data.level || 1;
        gold = data.gold || 0;
        lives = data.lives || 3;
        updateLevelDisplay();
    }
    updateHighscoreDisplay();
}

// Обновление дисплея рекордов
function updateHighscoreDisplay() {
    document.getElementById('highLevel').textContent = localStorage.getItem('highLevel') || 1;
    document.getElementById('totalGold').textContent = localStorage.getItem('totalGold') || 0;
}

// Сброс игры
function resetGame() {
    currentLevel = 1;
    gold = 0;
    lives = 3;
    score = 0;
    combo = 0;
    totalShots = 0;
    perfectShots = 0;
    curses = [];
    blessings = [];
    enemies = [];
    obstacles = [];
    currentBoss = null;
    currentModifier = null;
    bloodSplatters = [];
    bloodParticles = [];
    updateLevelDisplay();
    initBalls();
}

// Отрисовка стола
function drawTable() {
    ctx.fillStyle = '#1a3a20';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Текстура
    for (let i = 0; i < 50; i++) {
        ctx.fillStyle = `rgba(20, 40, 25, ${Math.random() * 0.08})`;
        ctx.beginPath();
        ctx.arc(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            Math.random() * 20 + 5,
            0, Math.PI * 2
        );
        ctx.fill();
    }

    // Борта с 3D эффектом
    const cushionGradient = ctx.createLinearGradient(0, 0, 0, 20);
    cushionGradient.addColorStop(0, '#2a4020');
    cushionGradient.addColorStop(1, '#1a3020');

    ctx.fillStyle = cushionGradient;
    ctx.fillRect(0, 0, canvas.width, 20);
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    ctx.fillRect(0, 0, 20, canvas.height);
    ctx.fillRect(canvas.width - 20, 0, 20, canvas.height);

    // Лузы с улучшенным видом
    for (let pocket of pockets) {
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, POCKET_RADIUS + 5, 0, Math.PI * 2);
        ctx.fillStyle = '#0a1a10';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
        const pocketGradient = ctx.createRadialGradient(
            pocket.x, pocket.y, 0,
            pocket.x, pocket.y, POCKET_RADIUS
        );
        pocketGradient.addColorStop(0, '#000000');
        pocketGradient.addColorStop(0.7, '#0a1a10');
        pocketGradient.addColorStop(1, '#1a2a15');
        ctx.fillStyle = pocketGradient;
        ctx.fill();
    }

    // Разметка стола
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 4, 20);
    ctx.lineTo(canvas.width / 4, canvas.height - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(canvas.width / 4, canvas.height / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
}

// Отрисовка кия
function drawCue() {
    if (!isDragging || !cueBall || cueBall.inPocket) return;

    const dx = dragStart.x - dragEnd.x;
    const dy = dragStart.y - dragEnd.y;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy), 200);
    const angle = Math.atan2(dy, dx);

    // Проверка проклятия слепоты
    const isBlind = curses.some(c => c.effect === 'blind');

    // Обновление индикатора силы
    const powerPercent = Math.round((power / 200) * 100);
    powerFill.style.width = powerPercent + '%';
    powerValue.textContent = powerPercent + '%';

    // Визуальное оттягивание мяча
    const pullbackDistance = Math.min(power * 0.3, BALL_RADIUS * 0.8);
    const pullbackX = cueBall.x - Math.cos(angle) * pullbackDistance;
    const pullbackY = cueBall.y - Math.sin(angle) * pullbackDistance;

    // Рисуем оттянутый мяч (призрачный)
    ctx.beginPath();
    ctx.arc(pullbackX, pullbackY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Линия оттягивания
    ctx.beginPath();
    ctx.moveTo(cueBall.x, cueBall.y);
    ctx.lineTo(pullbackX, pullbackY);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(cueBall.x, cueBall.y);
    ctx.rotate(angle + Math.PI);

    const cueLength = 180 + power * 0.5;
    const cueOffset = BALL_RADIUS + 8 + power * 0.3;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(cueOffset + 3, -5, cueLength, 12);

    const cueGradient = ctx.createLinearGradient(cueOffset, 0, cueOffset + cueLength, 0);
    cueGradient.addColorStop(0, '#DEB887');
    cueGradient.addColorStop(0.1, '#8B4513');
    cueGradient.addColorStop(0.9, '#5D3A1A');
    cueGradient.addColorStop(1, '#3D2A1A');
    
    ctx.fillStyle = cueGradient;
    ctx.fillRect(cueOffset, -4, cueLength, 8);

    ctx.fillStyle = '#DEB887';
    ctx.fillRect(cueOffset, -4, 25, 8);

    ctx.fillStyle = '#4169E1';
    ctx.fillRect(cueOffset, -4, 8, 8);

    ctx.fillStyle = '#FFD700';
    ctx.fillRect(cueOffset + 30, -4, 3, 8);
    ctx.fillRect(cueOffset + 60, -4, 3, 8);
    ctx.fillRect(cueOffset + 90, -4, 3, 8);

    ctx.restore();

    // Линия прицеливания (скрыта при проклятии слепоты)
    if (!isBlind) {
        const visionBoost = localStorage.getItem('visionBoost') === 'true';
        const lineLength = visionBoost ? 5 : 3;
        
        ctx.beginPath();
        ctx.setLineDash([10, 10]);
        ctx.moveTo(cueBall.x, cueBall.y);
        ctx.lineTo(cueBall.x + dx * lineLength, cueBall.y + dy * lineLength);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(cueBall.x + dx * lineLength, cueBall.y + dy * lineLength, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fill();
    }
}

// Частицы
function createParticles(x, y, color, count = 10) {
    const container = document.querySelector('.particles') || createParticlesContainer();
    
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.backgroundColor = color;
        particle.style.width = (Math.random() * 8 + 4) + 'px';
        particle.style.height = particle.style.width;
        particle.style.borderRadius = '50%';
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 100 + 50;
        particle.style.transform = `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity}px)`;
        
        container.appendChild(particle);
        
        setTimeout(() => particle.remove(), 1000);
    }
}

// Кровавые брызги
function createBloodSplatter(x, y) {
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 60 + 30;
        const bx = x + Math.cos(angle) * distance;
        const by = y + Math.sin(angle) * distance;
        
        bloodCtx.fillStyle = `rgba(139, 0, 0, ${Math.random() * 0.5 + 0.3})`;
        bloodCtx.beginPath();
        bloodCtx.arc(bx, by, Math.random() * 12 + 5, 0, Math.PI * 2);
        bloodCtx.fill();
    }
}

// Кровавая галочка
function showBloodCheckmark() {
    const checkmark = document.createElement('div');
    checkmark.style.position = 'absolute';
    checkmark.style.left = '50%';
    checkmark.style.top = '50%';
    checkmark.style.transform = 'translate(-50%, -50%)';
    checkmark.style.fontSize = '80px';
    checkmark.style.color = '#8b0000';
    checkmark.style.fontWeight = 'bold';
    checkmark.style.textShadow = '0 0 20px #8b0000';
    checkmark.style.opacity = '1';
    checkmark.style.transition = 'opacity 0.5s';
    checkmark.style.zIndex = '1000';
    checkmark.textContent = '✓';
    
    document.querySelector('.game-container').appendChild(checkmark);
    
    setTimeout(() => {
        checkmark.style.opacity = '0';
        setTimeout(() => checkmark.remove(), 500);
    }, 500);
}

// Кровавые частицы при попадании
function createBloodParticles(x, y) {
    const container = document.querySelector('.particles') || createParticlesContainer();
    
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.backgroundColor = '#8b0000';
        particle.style.width = (Math.random() * 12 + 6) + 'px';
        particle.style.height = particle.style.width;
        particle.style.borderRadius = '50%';
        particle.style.boxShadow = '0 0 10px #8b0000';
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 180 + 100;
        particle.style.transform = `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity}px)`;
        
        container.appendChild(particle);
        
        setTimeout(() => particle.remove(), 1000);
    }
}

// Добавление крови на стол
function addBloodSplatter(x, y, count) {
    // Летящие брызги (исчезают)
    const particleCount = Math.min(count, 12);
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        const size = 4 + Math.random() * 6;
        const stretch = 1 + Math.random() * 0.4;

        bloodParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: size,
            stretch: stretch,
            rotation: angle,
            life: 0,
            maxLife: 1.0,
            fadeIn: true,
            decay: 0.006 + Math.random() * 0.006,
            points: generateOrganicShape(size)
        });
    }

    // Постоянные следы крови (лужи) - исчезают через 5-10 секунд
    const splatterCount = Math.min(Math.ceil(count / 2), 5);
    for (let i = 0; i < splatterCount; i++) {
        const offsetX = (Math.random() - 0.5) * 30;
        const offsetY = (Math.random() - 0.5) * 30;
        const size = 6 + Math.random() * 12;
        const stretchX = 0.8 + Math.random() * 0.4;
        const stretchY = 0.6 + Math.random() * 0.3;
        const rotation = Math.random() * Math.PI;
        const lifetime = 5000 + Math.random() * 5000; // 5-10 секунд в миллисекундах

        bloodSplatters.push({
            x: x + offsetX,
            y: y + offsetY,
            size: size,
            stretchX: stretchX,
            stretchY: stretchY,
            rotation: rotation,
            alpha: 0,
            maxAlpha: 0.75 + Math.random() * 0.2,
            fadeIn: true,
            fadeSpeed: 0.025,
            fadeOut: false,
            fadeOutSpeed: 0.02,
            createdAt: Date.now(),
            lifetime: lifetime,
            points: generateOrganicShape(size)
        });
    }

    // Ограничение количества следов
    if (bloodSplatters.length > 120) {
        bloodSplatters.splice(0, bloodSplatters.length - 120);
    }
}

// Отрисовка крови (реалистичная версия с неправильными формами)
function drawBlood() {
    bloodCtx.clearRect(0, 0, bloodCanvas.width, bloodCanvas.height);

    // Сначала рисуем постоянные следы
    for (let i = bloodSplatters.length - 1; i >= 0; i--) {
        const splatter = bloodSplatters[i];
        const age = Date.now() - splatter.createdAt;

        // Проверяем время жизни
        if (age > splatter.lifetime) {
            // Начинаем плавное исчезновение
            splatter.fadeOut = true;
        }

        // Плавное появление/исчезновение
        if (splatter.fadeIn) {
            splatter.alpha += splatter.fadeSpeed;
            if (splatter.alpha >= splatter.maxAlpha) {
                splatter.alpha = splatter.maxAlpha;
                splatter.fadeIn = false;
            }
        } else if (splatter.fadeOut) {
            splatter.alpha -= splatter.fadeOutSpeed;
            if (splatter.alpha <= 0) {
                bloodSplatters.splice(i, 1);
                continue;
            }
        }

        bloodCtx.save();
        bloodCtx.translate(splatter.x, splatter.y);
        bloodCtx.rotate(splatter.rotation);
        bloodCtx.scale(splatter.stretchX, splatter.stretchY);

        // Градиент для объёма лужи
        const gradient = bloodCtx.createRadialGradient(0, 0, 0, 0, 0, splatter.size);
        gradient.addColorStop(0, `rgba(160, 20, 20, ${splatter.alpha * 0.9})`);
        gradient.addColorStop(0.5, `rgba(139, 0, 0, ${splatter.alpha * 0.8})`);
        gradient.addColorStop(1, `rgba(80, 0, 0, ${splatter.alpha * 0.6})`);

        // Рисуем неправильную форму
        bloodCtx.beginPath();
        for (let j = 0; j <= splatter.points.length; j++) {
            const point = splatter.points[j % splatter.points.length];
            const angle = point.angle;
            const radius = splatter.size * point.radius;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (j === 0) bloodCtx.moveTo(x, y);
            else bloodCtx.lineTo(x, y);
        }
        bloodCtx.closePath();
        bloodCtx.fillStyle = gradient;
        bloodCtx.fill();

        // Края лужи
        bloodCtx.strokeStyle = `rgba(60, 0, 0, ${splatter.alpha * 0.4})`;
        bloodCtx.lineWidth = 1;
        bloodCtx.stroke();

        bloodCtx.restore();
    }

    // Теперь рисуем летящие брызги
    for (let i = bloodParticles.length - 1; i >= 0; i--) {
        const particle = bloodParticles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.96;
        particle.vy *= 0.96;

        // Плавное появление
        if (particle.fadeIn) {
            particle.life += 0.05;
            if (particle.life >= particle.maxLife) {
                particle.life = particle.maxLife;
                particle.fadeIn = false;
            }
        } else {
            particle.life -= particle.decay;
        }

        if (particle.life <= 0) {
            bloodParticles.splice(i, 1);
            continue;
        }

        bloodCtx.save();
        bloodCtx.translate(particle.x, particle.y);
        bloodCtx.rotate(particle.rotation);
        bloodCtx.scale(particle.stretch, 1 / particle.stretch);

        const currentSize = particle.size * particle.life;

        // Градиент для объёма капли
        const gradient = bloodCtx.createRadialGradient(
            -currentSize * 0.2, -currentSize * 0.2, 0,
            0, 0, currentSize
        );
        gradient.addColorStop(0, `rgba(255, 100, 100, ${particle.life * 0.9})`);
        gradient.addColorStop(0.4, `rgba(220, 40, 40, ${particle.life * 0.85})`);
        gradient.addColorStop(0.8, `rgba(139, 0, 0, ${particle.life * 0.8})`);
        gradient.addColorStop(1, `rgba(80, 0, 0, ${particle.life * 0.6})`);

        // Рисуем неправильную форму
        bloodCtx.beginPath();
        for (let j = 0; j <= particle.points.length; j++) {
            const point = particle.points[j % particle.points.length];
            const angle = point.angle;
            const radius = currentSize * point.radius;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (j === 0) bloodCtx.moveTo(x, y);
            else bloodCtx.lineTo(x, y);
        }
        bloodCtx.closePath();
        bloodCtx.fillStyle = gradient;
        bloodCtx.fill();

        // Блик
        bloodCtx.beginPath();
        bloodCtx.arc(-currentSize * 0.3, -currentSize * 0.3, currentSize * 0.15, 0, Math.PI * 2);
        bloodCtx.fillStyle = `rgba(255, 255, 255, ${particle.life * 0.4})`;
        bloodCtx.fill();

        bloodCtx.restore();
    }
}

// Страшный эффект при попадании
function triggerScaryEffect() {
    const container = document.querySelector('.game-container');
    container.style.filter = 'contrast(1.3) brightness(0.8) saturate(1.5)';
    container.style.boxShadow = '0 0 50px rgba(139, 0, 0, 0.8), inset 0 0 30px rgba(139, 0, 0, 0.5)';
    
    setTimeout(() => {
        container.style.filter = '';
        container.style.boxShadow = '';
    }, 300);
}

// Мигание экрана серым
function triggerFlashEffect() {
    const container = document.querySelector('.game-container');
    
    function flash() {
        container.style.filter = 'grayscale(100%) brightness(0.5)';
        setTimeout(() => {
            container.style.filter = '';
        }, 100);
    }
    
    flash();
    setTimeout(flash, 200);
}

// Эффект крови на экране (реалистичная версия)
function createScreenBloodEffect(x, y) {
    const now = Date.now();
    if (now - lastScreenBloodTime < SCREEN_BLOOD_COOLDOWN) {
        return;
    }
    lastScreenBloodTime = now;

    for (let i = 0; i < 12; i++) {
        const size = 5 + Math.random() * 12;
        const stretchX = 0.7 + Math.random() * 0.3;
        const stretchY = 1.2 + Math.random() * 0.5;
        const rotation = Math.random() * 20 - 10;

        // Неровные края через border-radius
        const r1 = 40 + Math.random() * 20;
        const r2 = 40 + Math.random() * 20;
        const r3 = 40 + Math.random() * 20;
        const r4 = 40 + Math.random() * 20;

        const drop = document.createElement('div');
        drop.style.position = 'fixed';
        drop.style.left = Math.random() * window.innerWidth + 'px';
        drop.style.top = '-50px';
        drop.style.width = (size * stretchX) + 'px';
        drop.style.height = (size * stretchY) + 'px';
        drop.style.background = 'linear-gradient(to bottom, rgba(220, 40, 40, 0.9), rgba(160, 0, 0, 0.85))';
        drop.style.borderRadius = `${r1}% ${r2}% ${r3}% ${r4}%`;
        drop.style.transform = `rotate(${rotation}deg)`;
        drop.style.pointerEvents = 'none';
        drop.style.zIndex = '99999';
        drop.style.boxShadow = '0 0 8px rgba(139, 0, 0, 0.6)';
        drop.style.opacity = '0';

        document.body.appendChild(drop);

        const endY = window.innerHeight + 60;
        const duration = 1500 + Math.random() * 600;

        drop.style.transition = `top ${duration}ms ease-in, opacity 0.5s ease-in, opacity 0.4s ease-out`;

        setTimeout(() => {
            drop.style.opacity = '0.85';
        }, 10);

        setTimeout(() => {
            drop.style.top = endY + 'px';
        }, 10);

        setTimeout(() => {
            drop.style.opacity = '0';
        }, duration - 400);

        setTimeout(() => drop.remove(), duration + 500);
    }
}

function createParticlesContainer() {
    const container = document.createElement('div');
    container.className = 'particles';
    document.querySelector('.game-container').appendChild(container);
    return container;
}



// Обновление комментария Парасея
function updateParaseyComment(type) {
    const comments = paraseyComments[type];
    const comment = comments[Math.floor(Math.random() * comments.length)];
    paraseyComment.textContent = `🐷 Парасей: "${comment}"`;
    paraseyComment.style.animation = 'none';
    setTimeout(() => paraseyComment.style.animation = 'fadeInUp 0.5s ease', 10);

    // Добавляем анимацию Парасея в зависимости от события
    if (type === 'combo' || type === 'win') {
        setParaseyAnimation('happy');
    } else if (type === 'foul' || type === 'miss') {
        setParaseyAnimation('angry');
    } else if (type === 'start') {
        setParaseyAnimation('scared');
    }
}

// Проверка достижений
function checkAchievements() {
    if (!achievements.firstPocket && score >= 1) {
        achievements.firstPocket = true;
        unlockAchievement('firstPocket');
    }
    
    if (!achievements.combo3 && combo >= 3) {
        achievements.combo3 = true;
        unlockAchievement('combo3');
    }
    
    if (!achievements.combo5 && combo >= 5) {
        achievements.combo5 = true;
        unlockAchievement('combo5');
    }
    
    if (!achievements.cleanSweep && score >= 15) {
        achievements.cleanSweep = true;
        unlockAchievement('cleanSweep');
        updateParaseyComment('win');
    }
}

function unlockAchievement(id) {
    const element = document.getElementById(id);
    if (element) {
        element.classList.add('unlocked');
        playAchievementSound();
    }
}

// Обновление статистики
function updateStats() {
    document.getElementById('totalShots').textContent = totalShots;
    document.getElementById('perfectShots').textContent = perfectShots;
}

// Проверка движения всех шаров
function anyBallMoving() {
    return balls.some(ball => ball.isMoving());
}

// Главный цикл
function gameLoop() {
    if (!isPaused && !shopOpen) {
        // Обновление физики
        for (let ball of balls) {
            ball.update();
        }

        // Столкновения
        for (let i = 0; i < balls.length; i++) {
            for (let j = i + 1; j < balls.length; j++) {
                checkBallCollision(balls[i], balls[j]);
            }
        }
    }

    // Отрисовка
    drawTable();
    drawBlood();
    
    for (let ball of balls) {
        ball.draw();
    }

    if (!anyBallMoving() && !isPaused && !shopOpen) {
        drawCue();
    }

    // Проверка окончания уровня
    checkLevelComplete();

    requestAnimationFrame(gameLoop);
}

// Применение модификаторов
function applyModifiers() {
    if (!currentModifier) return;

    for (let ball of balls) {
        switch(currentModifier.effect) {
            case 'slowBalls':
                ball.vx *= 0.95;
                ball.vy *= 0.95;
                break;
            case 'gravity':
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const dx = centerX - ball.x;
                const dy = centerY - ball.y;
                ball.vx += dx * 0.001;
                ball.vy += dy * 0.001;
                break;
            case 'iceTable':
                ball.vx *= 0.995;
                ball.vy *= 0.995;
                break;
        }
    }
}

// Отрисовка препятствий
function drawObstacles() {
    for (let obs of obstacles) {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = '#5D3A1A';
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    }
}

// Отрисовка врагов
function drawEnemies() {
    for (let enemy of enemies) {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fillStyle = enemy.color;
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Глаза врага
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(enemy.x - 4, enemy.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(enemy.x + 4, enemy.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(enemy.x - 4, enemy.y - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(enemy.x + 4, enemy.y - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Проверка окончания уровня
function checkLevelComplete() {
    const colorBalls = balls.filter(b => b.number > 0 && !b.inPocket);
    
    if (colorBalls.length === 0 && !anyBallMoving()) {
        // Уровень пройден!
        gold += currentLevel * 20;
        updateLevelDisplay();
        paraseyComment.textContent = `🐷 Парасей: "Уровень пройден! +${currentLevel * 20} золота!"`;
        
        setTimeout(() => {
            nextLevel();
        }, 2000);
    }
}

// Спавн босса
function spawnBoss(bossData) {
    currentBoss = {
        ...bossData,
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: 0,
        vy: 0,
        currentHealth: bossData.health
    };
    paraseyComment.textContent = `🐷 Парасей: "БОСС ${bossData.name} появился!"`;
}

// Обновление босса
function updateBoss() {
    if (!currentBoss) return;

    switch(currentBoss.behavior) {
        case 'king':
            // Король двигается медленно и защищается
            const speed = 0.5;
            currentBoss.x += Math.sin(Date.now() / 1000) * speed;
            currentBoss.y += Math.cos(Date.now() / 1000) * speed;
            break;
        case 'dark':
            // Тёмный босс телепортируется
            if (Math.random() < 0.01) {
                currentBoss.x = Math.random() * (canvas.width - 100) + 50;
                currentBoss.y = Math.random() * (canvas.height - 100) + 50;
            }
            break;
    }

    // Отскок от стен
    if (currentBoss.x < currentBoss.radius || currentBoss.x > canvas.width - currentBoss.radius) {
        currentBoss.vx *= -1;
    }
    if (currentBoss.y < currentBoss.radius || currentBoss.y > canvas.height - currentBoss.radius) {
        currentBoss.vy *= -1;
    }
}

// Отрисовка босса
function drawBoss() {
    if (!currentBoss) return;

    ctx.beginPath();
    ctx.arc(currentBoss.x, currentBoss.y, currentBoss.radius, 0, Math.PI * 2);
    ctx.fillStyle = currentBoss.color;
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Полоска здоровья
    const healthWidth = 60;
    const healthHeight = 8;
    const healthX = currentBoss.x - healthWidth / 2;
    const healthY = currentBoss.y - currentBoss.radius - 15;
    
    ctx.fillStyle = '#333';
    ctx.fillRect(healthX, healthY, healthWidth, healthHeight);
    
    const healthPercent = currentBoss.currentHealth / currentBoss.health;
    ctx.fillStyle = healthPercent > 0.5 ? '#00FF00' : healthPercent > 0.25 ? '#FFFF00' : '#FF0000';
    ctx.fillRect(healthX, healthY, healthWidth * healthPercent, healthHeight);

    // Имя босса
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(currentBoss.name, currentBoss.x, currentBoss.y + 4);
}

// Проверка столкновения с боссом
function checkBossCollision() {
    if (!currentBoss) return;

    const dx = cueBall.x - currentBoss.x;
    const dy = cueBall.y - currentBoss.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < BALL_RADIUS + currentBoss.radius) {
        // Удар по боссу
        currentBoss.currentHealth--;
        const nx = dx / dist;
        const ny = dy / dist;
        cueBall.vx = nx * 5;
        cueBall.vy = ny * 5;
        playCueSound(10);
    }
}

// Добавление случайного проклятия
function addRandomCurse() {
    const curse = cursesList[Math.floor(Math.random() * cursesList.length)];
    curses.push(curse);
    paraseyComment.textContent = `🐷 Парасей: "Проклятие: ${curse.name}! ${curse.description}"`;
    applyCurses();
    updateStatusEffects();
}

// Применение проклятий
function applyCurses() {
    for (let curse of curses) {
        switch(curse.effect) {
            case 'blind':
                // Скрываем линию прицеливания
                break;
            case 'shake':
                document.querySelector('.game-container').style.animation = 'shake 0.1s infinite';
                break;
            case 'pocketGravity':
                // Шары притягиваются к лузам
                break;
        }
    }
}

// Добавление благословения
function addBlessing() {
    const blessing = blessingsList[Math.floor(Math.random() * blessingsList.length)];
    blessings.push(blessing);
    paraseyComment.textContent = `🐷 Парасей: "Благословение: ${blessing.name}! ${blessing.description}"`;
    updateStatusEffects();
}

// Обновление отображения эффектов
function updateStatusEffects() {
    const effectsDiv = document.getElementById('statusEffects');
    const activeEffectsSpan = document.getElementById('activeEffects');
    
    if (curses.length > 0 || blessings.length > 0) {
        effectsDiv.style.display = 'block';
        const effects = [];
        
        curses.forEach(c => effects.push(`😈 ${c.name}`));
        blessings.forEach(b => effects.push(`✨ ${b.name}`));
        
        activeEffectsSpan.textContent = effects.join(', ');
    } else {
        effectsDiv.style.display = 'none';
    }
}

// Обработчики мыши - работают на всем документе
canvas.addEventListener('mousedown', (e) => {
    // Инициализация аудио при первом клике
    initAudio();
    
    if (anyBallMoving() || isPaused) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - cueBall.x;
    const dy = y - cueBall.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < BALL_RADIUS * 3) {
        isDragging = true;
        dragStart = { x: cueBall.x, y: cueBall.y };
        dragEnd = { x, y };
    }
});

// Глобальный mousemove - позволяет оттягивать за пределами canvas
document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const rect = canvas.getBoundingClientRect();
    dragEnd = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    
    // Обновляем индикатор силы в реальном времени
    const dx = dragStart.x - dragEnd.x;
    const dy = dragStart.y - dragEnd.y;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy), 200);
    const powerPercent = Math.round((power / 200) * 100);
    powerFill.style.width = powerPercent + '%';
    powerValue.textContent = powerPercent + '%';
});

// Глобальный mouseup - позволяет отпускать за пределами canvas
document.addEventListener('mouseup', () => {
    if (!isDragging) return;

    const dx = dragStart.x - dragEnd.x;
    const dy = dragStart.y - dragEnd.y;
    let power = Math.min(Math.sqrt(dx * dx + dy * dy), 200) / 12;

    if (localStorage.getItem('powerBoost') === 'true') {
        power *= 1.5;
    }

    if (power > 0.3) {
        const angle = Math.atan2(dy, dx);
        cueBall.vx = Math.cos(angle) * power;
        cueBall.vy = Math.sin(angle) * power;
        totalShots++;
        updateStats();
        
        playCueSound(power);
        
        if (power > 10) {
            perfectShots++;
            updateStats();
        }
    }

    isDragging = false;
    powerFill.style.width = '0%';
    powerValue.textContent = '0%';
});

// Управление
function resetGame() {
    initBalls();
    // Сброс достижений
    Object.keys(achievements).forEach(key => {
        achievements[key] = false;
        const element = document.getElementById(key);
        if (element) {
            element.classList.remove('unlocked');
        }
    });
}

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        paraseyComment.textContent = '🐷 Парасей: "Пауза! Отдыхай!"';
    } else {
        paraseyComment.textContent = '🐷 Парасей: "Погнали!"';
    }
}

// Создание фоновых элементов
function createHalloweenBackground() {
    const bg = document.getElementById('halloweenBg');
    if (!bg) return;

    const spacing = 80;
    const cols = Math.ceil(window.innerWidth / spacing);
    const rows = Math.ceil(window.innerHeight / spacing);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const item = document.createElement('div');
            item.className = 'bg-item';
            item.style.left = (col * spacing) + 'px';
            item.style.top = (row * spacing) + 'px';

            const isBat = (row + col) % 2 === 0;
            if (isBat) {
                item.innerHTML = `
                    <svg viewBox="0 0 40 25">
                        <path d="M20 12 Q12 3 3 8 Q10 12 13 15 Q10 18 3 22 Q12 16 20 19 Q28 16 37 22 Q30 18 27 15 Q30 12 37 8 Q28 3 20 12" fill="#2a2a2a"/>
                        <circle cx="17" cy="11" r="2" fill="#3a3a3a"/>
                        <circle cx="23" cy="11" r="2" fill="#3a3a3a"/>
                    </svg>
                `;
            } else {
                item.innerHTML = `
                    <svg viewBox="0 0 35 35">
                        <ellipse cx="17.5" cy="22" rx="14" ry="12" fill="#3a2a1a"/>
                        <path d="M16 10 L17.5 5 L19 10" fill="#2a1a0a"/>
                        <polygon points="13,18 16,21 13,24" fill="#1a0a0a"/>
                        <polygon points="19,17 22,20 19,23" fill="#1a0a0a"/>
                        <polygon points="25,18 28,21 25,24" fill="#1a0a0a"/>
                    </svg>
                `;
            }
            bg.appendChild(item);
        }
    }

    // Убрали рандомные капли крови - теперь кровь только в местах действий
}

// Запуск
initPockets();
loadGame();
initBalls();
createHalloweenBackground();
gameLoop();
