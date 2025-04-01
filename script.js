import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Возвращаемся к PointerLock
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'; // Раскомментируем

let scene, camera, renderer, player, controls; // controls теперь снова PointerLockControls
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let clock = new THREE.Clock();
let playerHealth = 3; // Начальное здоровье игрока
let invulnerable = false; // Флаг неуязвимости после получения урона
let gameOver = false; // Флаг для обозначения конца игры
let gameStarted = false; // Флаг начала игры
let gameScore = 0; // Счетчик очков
let enemiesDefeated = 0; // Счетчик уничтоженных врагов
let dataCollected = 0; // Счетчик собранных данных
let missionObjective = 10; // Требуемое количество данных для завершения миссии
let currentLevel = 1; // Текущий уровень
let maxLevel = 3; // Максимальный уровень
let levelCompleted = false; // Флаг завершения уровня
let missionType = 'collect_data'; // Тип миссии: collect_data, flight_to_point, boss_fight
let endPointReached = false; // Флаг достижения конечной точки для миссии полета
let bossDefeated = false; // Флаг победы над боссом
let waypoint = null; // Маркер конечной точки для миссии полета
let boss = null; // Объект босса
let bossHealth = 0; // Текущее здоровье босса
let bossMaxHealth = 100; // Максимальное здоровье босса
let bossHealthBar = null; // Полоса здоровья босса
const healthPacks = []; // Массив для хранения аптечек
const enemyIndicators = []; // Массив для индикаторов врагов
const dataFragments = []; // Массив для фрагментов данных

const asteroids = [];
const aliens = []; // Теперь будем использовать этот массив
const lasers = [];
const enemyLasers = []; // Массив для лазеров врагов
let lastShotTime = 0; // Время последнего выстрела для перезарядки
const shootCooldown = 0.25; // Перезарядка в секундах (четверть секунды)
const MAX_ASTEROIDS = 50; // Максимальное количество астероидов на сцене
const ASTEROID_SPAWN_DISTANCE = 400; // Минимальное расстояние от центра для спавна
const MAX_ENEMIES = 12; // Увеличиваем максимальное количество врагов
const ENEMY_SPAWN_DISTANCE = 300; // Уменьшаем расстояние появления врагов для лучшей видимости
const ENEMY_SPEED = 10; // Снижаем базовую скорость движения врага
const ENEMY_DETECTION_RADIUS = 400; // Увеличиваем радиус обнаружения игрока
const ENEMY_ATTACK_RADIUS = 200; // Радиус начала атаки
const ENEMY_LASER_SPEED = 120; // Скорость лазера врага
const HEALTH_PACK_DROP_CHANCE = 0.8; // 80% шанс выпадения аптечки из астероида для тестирования
const DATA_FRAGMENT_DROP_CHANCE_ASTEROID = 0.25; // 25% шанс выпадения фрагмента данных из астероида
const DATA_FRAGMENT_DROP_CHANCE_ENEMY = 0.50; // 50% шанс выпадения фрагмента данных из врага

const ENEMY_TYPES = {
    FIGHTER: 'fighter',    // Стандартный быстрый истребитель
    DESTROYER: 'destroyer', // Тяжелый разрушитель - медленный, но прочный
    SCOUT: 'scout'         // Разведчик - очень быстрый, но хрупкий
};

// Добавим константы для лазера
const LASER_SIZE = 0.2; // Толщина лазера
const LASER_LENGTH = 6; // Длина лазера
const LASER_SPEED = 250; // Скорость полета лазера
const SHIP_TRANSPARENCY = 0.4; // Прозрачность корабля во время прицеливания

// Геометрия и материал для астероидов (создаем один раз для производительности)
// Создадим несколько разных геометрий для астероидов
const asteroidGeometries = [
    // Базовый астероид с неровностями (больше сегментов)
    new THREE.DodecahedronGeometry(1, 1), // 12-гранник с подразделениями
    new THREE.OctahedronGeometry(1, 2),   // 8-гранник с подразделениями
    new THREE.IcosahedronGeometry(1, 1),  // 20-гранник с подразделениями
    // Деформированная сфера
    new THREE.SphereGeometry(1, 12, 12)
];

// Деформируем последнюю геометрию (сферу) для более астероидного вида
const sphereVertices = asteroidGeometries[3].attributes.position;
for (let i = 0; i < sphereVertices.count; i++) {
    const x = sphereVertices.getX(i);
    const y = sphereVertices.getY(i);
    const z = sphereVertices.getZ(i);
    
    // Добавляем случайные деформации по всем осям
    const noise = 0.2; // Сила деформации
    sphereVertices.setX(i, x + (Math.random() - 0.5) * noise);
    sphereVertices.setY(i, y + (Math.random() - 0.5) * noise);
    sphereVertices.setZ(i, z + (Math.random() - 0.5) * noise);
}
// Обновляем нормали после деформации
asteroidGeometries[3].computeVertexNormals();

// Создаем разные материалы для астероидов
const asteroidMaterials = [
    new THREE.MeshStandardMaterial({ 
        color: 0x8B8B83, // Серый с оттенком
        roughness: 0.9,
        metalness: 0.1
    }),
    new THREE.MeshStandardMaterial({ 
        color: 0x6D6968, // Темно-серый
        roughness: 0.7,
        metalness: 0.2
    }),
    new THREE.MeshStandardMaterial({ 
        color: 0x9C7E65, // Коричневатый
        roughness: 0.8,
        metalness: 0.1
    }),
    new THREE.MeshStandardMaterial({ 
        color: 0x7D756C, // Пепельный
        roughness: 1.0,
        metalness: 0.0
    })
];

// Материалы для вражеских кораблей
const enemyBodyMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x660033,  // Темно-бордовый
    specular: 0x111111,
    shininess: 30
});
const enemyAccentMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x990000,  // Темно-красный
    specular: 0x222222,
    shininess: 20
});
const enemyGlowMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xff3300,  // Оранжево-красный
    emissive: 0xff3300,
    emissiveIntensity: 0.7,
    specular: 0xffffff
});

// Добавляем дополнительные материалы для разных типов врагов
const destroyerBodyMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x333366,  // Темно-синий
    specular: 0x111111,
    shininess: 50,
    metalness: 0.5
});

const destroyerAccentMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x5555AA,  // Синий
    specular: 0x222222,
    shininess: 30
});

const destroyerGlowMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x00AAFF,  // Голубой
    emissive: 0x00AAFF,
    emissiveIntensity: 0.8,
    specular: 0xffffff
});

const scoutBodyMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x336633,  // Темно-зеленый
    specular: 0x111111,
    shininess: 20
});

const scoutAccentMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x55AA55,  // Зеленый
    specular: 0x222222,
    shininess: 15
});

const scoutGlowMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x00FF66,  // Ярко-зеленый
    emissive: 0x00FF66,
    emissiveIntensity: 0.9,
    specular: 0xffffff
});

// Добавляем материал для аптечек (медицинский крест)
const healthPackMaterial = new THREE.MeshPhongMaterial({
    color: 0x00ff00, // Зеленый цвет
    emissive: 0x00ff00,
    emissiveIntensity: 0.5,
    shininess: 50
});

// Материалы для вражеских лазеров (отличные от лазеров игрока)
const enemyLaserMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000, // Красный цвет
    transparent: true,
    opacity: 0.8
});

const enemyLaserGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff3300, // Красно-оранжевый цвет
    transparent: true,
    opacity: 0.5
});

// Цвета для фрагментов данных
const dataFragmentMaterial = new THREE.MeshPhongMaterial({
    color: 0xffcc00, // Золотистый цвет
    emissive: 0xffcc00,
    emissiveIntensity: 0.8,
    shininess: 100,
    specular: 0xffffff
});

// console.log("Запуск скрипта..."); // Убираем логи

init();
animate();

function init() {
    // console.log("Начало init()"); // Убираем логи
    // Сцена
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011); // Темно-синий космос
    scene.fog = new THREE.FogExp2(0x000011, 0.001); // Туман для глубины

    // Камера
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    // Отдаляем камеру для лучшего обзора корабля
    camera.position.set(0, 3, 8);

    // Рендерер
    // console.log("Создание рендерера..."); // Убираем логи
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('game-container').appendChild(renderer.domElement);
    // console.log("Рендерер добавлен в DOM."); // Убираем логи

    // Освещение
    const ambientLight = new THREE.AmbientLight(0x404040); // Мягкий рассеянный свет
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // --- Игрок (Космический корабль) ---
    // Создаем группу для корабля
    player = new THREE.Group();
    
    // Материалы для корабля
    const shipBodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x3366cc,
        transparent: true,
        opacity: 1.0
    }); // Темно-синий для корпуса
    const shipAccentMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffcc00,
        transparent: true,
        opacity: 1.0
    }); // Желтый для акцентов
    const shipWindowMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x66ccff, 
        emissive: 0x66ccff, 
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 1.0
    }); // Светящиеся окна/стекло
    const shipEngineMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff3300, 
        emissive: 0xff3300, 
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 1.0
    }); // Светящиеся двигатели
    
    // Основной корпус (фюзеляж)
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
    bodyGeometry.rotateX(Math.PI / 2); // Поворачиваем, чтобы цилиндр был ориентирован вдоль оси Z
    const body = new THREE.Mesh(bodyGeometry, shipBodyMaterial);
    
    // Нос корабля
    const noseGeometry = new THREE.ConeGeometry(0.5, 1, 8);
    noseGeometry.rotateX(-Math.PI / 2); // Направляем конус вперед
    const nose = new THREE.Mesh(noseGeometry, shipBodyMaterial);
    nose.position.z = 1.5; // Размещаем спереди корпуса
    
    // Кабина пилота (стеклянный купол)
    const cockpitGeometry = new THREE.SphereGeometry(0.3, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpit = new THREE.Mesh(cockpitGeometry, shipWindowMaterial);
    cockpit.position.y = 0.3;
    cockpit.position.z = 0.3;
    
    // Крылья
    const wingGeometry = new THREE.BoxGeometry(3, 0.1, 1);
    const wings = new THREE.Mesh(wingGeometry, shipAccentMaterial);
    wings.position.y = -0.2;
    
    // Лазерные пушки на крыльях
    const gunGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
    gunGeometry.rotateX(Math.PI / 2); // Ориентируем вдоль оси Z
    const gunMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xcccccc,
        transparent: true,
        opacity: 1.0
    });
    
    // Левая пушка
    const leftGun = new THREE.Mesh(gunGeometry, gunMaterial);
    leftGun.position.set(-1.2, -0.15, 0.3); // Разместим у края крыла
    leftGun.name = 'leftGun'; // Даем имя для поиска
    
    // Правая пушка
    const rightGun = new THREE.Mesh(gunGeometry, gunMaterial);
    rightGun.position.set(1.2, -0.15, 0.3); // Разместим у края крыла
    rightGun.name = 'rightGun'; // Даем имя для поиска
    
    // Двигатели (два симметричных)
    const engineGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8);
    engineGeometry.rotateX(Math.PI / 2); // Ориентируем вдоль оси Z
    
    const leftEngine = new THREE.Mesh(engineGeometry, shipBodyMaterial);
    leftEngine.position.set(-0.7, -0.2, -0.7);
    
    const rightEngine = new THREE.Mesh(engineGeometry, shipBodyMaterial);
    rightEngine.position.set(0.7, -0.2, -0.7);
    
    // Сопла двигателей (светящиеся)
    const nozzleGeometry = new THREE.CylinderGeometry(0.15, 0.1, 0.2, 8);
    nozzleGeometry.rotateX(Math.PI / 2);
    
    const leftNozzle = new THREE.Mesh(nozzleGeometry, shipEngineMaterial);
    leftNozzle.position.set(-0.7, -0.2, -1);
    
    const rightNozzle = new THREE.Mesh(nozzleGeometry, shipEngineMaterial);
    rightNozzle.position.set(0.7, -0.2, -1);
    
    // Добавляем все компоненты к группе корабля
    player.add(body);
    player.add(nose);
    player.add(cockpit);
    player.add(wings);
    player.add(leftGun);
    player.add(rightGun);
    player.add(leftEngine);
    player.add(rightEngine);
    player.add(leftNozzle);
    player.add(rightNozzle);
    
    // Добавляем весь корабль на сцену
    player.position.y = 0.5;
    scene.add(player);

    // console.log("Игрок добавлен на сцену."); // Убираем логи

    /* --- Управление (временное OrbitControls - закомментировано) --- 
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.target.set(0, 0.5, 0); 
    controls.update();
    console.log("OrbitControls инициализированы.");
    */

    // --- Старое управление PointerLock (раскомментировано) ---
    controls = new PointerLockControls(camera, document.body);

    // Создаем оверлей паузы
    const pauseOverlay = document.createElement('div');
    pauseOverlay.id = 'pause-overlay';
    pauseOverlay.style.position = 'fixed';
    pauseOverlay.style.top = '0';
    pauseOverlay.style.left = '0';
    pauseOverlay.style.width = '100%';
    pauseOverlay.style.height = '100%';
    pauseOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // Полупрозрачный фон
    pauseOverlay.style.zIndex = '9998'; // Высокий z-index
    pauseOverlay.style.display = 'flex';
    pauseOverlay.style.flexDirection = 'column';
    pauseOverlay.style.justifyContent = 'center';
    pauseOverlay.style.alignItems = 'center';
    // Добавляем box-sizing и padding
    pauseOverlay.style.boxSizing = 'border-box';
    pauseOverlay.style.padding = '20px'; // Добавим небольшой отступ

    // Добавляем заголовок игры
    const gameTitle = document.createElement('h1');
    gameTitle.textContent = 'COSMO GAME';
    gameTitle.style.color = '#ffffff';
    gameTitle.style.fontSize = '3rem';
    gameTitle.style.marginBottom = '2rem';
    gameTitle.style.fontFamily = 'Arial, sans-serif';
    gameTitle.style.textShadow = '0 0 10px #66ccff';

    // Создаем кнопку запуска игры
    const startButton = document.createElement('button');
    startButton.textContent = 'CLICK TO START'; // Было: 'НАЖМИТЕ, ЧТОБЫ НАЧАТЬ'
    startButton.style.backgroundColor = '#3366cc';
    startButton.style.color = 'white';
    startButton.style.border = 'none';
    startButton.style.padding = '15px 30px';
    startButton.style.fontSize = '1.5rem';
    startButton.style.borderRadius = '5px';
    startButton.style.cursor = 'pointer';
    startButton.style.transition = 'all 0.2s';
    startButton.style.boxShadow = '0 0 15px rgba(102, 204, 255, 0.7)';
    startButton.style.fontFamily = 'Arial, sans-serif';
    
    // Эффект при наведении
    startButton.onmouseover = function() {
        this.style.backgroundColor = '#4477dd';
        this.style.transform = 'scale(1.05)';
    };
    startButton.onmouseout = function() {
        this.style.backgroundColor = '#3366cc';
        this.style.transform = 'scale(1)';
    };

    // Добавляем детали игры ниже кнопки
    const gameInstructions = document.createElement('div');
    gameInstructions.innerHTML = `
        <p style="color: white; margin-top: 2rem; text-align: center; font-family: Arial, sans-serif;">
            Controls: WASD - Move, Mouse - Look, Space - Shoot<br>
            Destroy asteroids and enemy ships!
        </p>
    `; // Было: Управление: WASD - движение, Мышь - поворот, Пробел - стрельба<br> Уничтожайте астероиды и вражеские корабли!

    // Собираем экран паузы
    pauseOverlay.appendChild(gameTitle);
    pauseOverlay.appendChild(startButton);
    pauseOverlay.appendChild(gameInstructions);
    document.body.appendChild(pauseOverlay);

    // Удаляем default info элемент
    const defaultInfo = document.getElementById('info');
    if (defaultInfo) {
        defaultInfo.style.display = 'none';
    }

    startButton.addEventListener('click', function () {
        controls.lock();
    });

    controls.addEventListener('lock', function () {
        pauseOverlay.style.display = 'none';
    });

    controls.addEventListener('unlock', function () {
        pauseOverlay.style.display = 'flex';
    });

    scene.add(controls.getObject()); // Добавляем объект камеры из PointerLockControls
   
    // --- Обработка ввода для PointerLock (раскомментировано) --- 
    const onKeyDown = function (event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = true;
                break;
            case 'Space': // Раскомментировано и добавлено
                shootLaser(); // Вызываем функцию стрельбы
                break;
        }
    };

    const onKeyUp = function (event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = false;
                break;
        }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
   
    // --- Добавляем звезды --- 
    addStars();

    // --- Добавляем астероиды ---
    // Заполняем начальное количество астероидов
    for (let i = 0; i < MAX_ASTEROIDS; i++) {
        createAsteroid();
    }

    // --- Добавляем начальных врагов ---
    for (let i = 0; i < MAX_ENEMIES; i++) {
        createEnemy();
    }

    // --- Добавляем прицел на экран
    createCrosshair();

    // --- Создаем интерфейс здоровья ---
    createHealthUI();

    // --- Создаем индикаторы врагов ---
    createEnemyIndicators();

    // --- Обработчик изменения размера окна ---
    window.addEventListener('resize', onWindowResize);
    // console.log("Завершение init()"); // Убираем логи

    // Создаем звезды (фон)
    addStars();

    // Создаем астероиды
    for (let i = 0; i < MAX_ASTEROIDS; i++) {
        createAsteroid();
    }

    // Создаем начальных врагов
    console.log("Creating initial enemies..."); // Было: "Создаем начальных врагов..."
    const initialEnemies = 5; // Количество начальных врагов
    for (let i = 0; i < initialEnemies; i++) {
        const enemy = createEnemy();
        if (enemy) {
            console.log("Enemy created during initialization:", enemy.userData.type); // Было: "Создан враг при инициализации:"
        }
    }

    // --- Создаем счетчик очков и прогресс миссии ---
    createScoreUI();
    
    // --- Показываем сюжет и описание миссии ---
    showMissionIntro();
}

function addStars() {
    // console.log("Добавление звезд..."); // Убираем логи
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });

    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = THREE.MathUtils.randFloatSpread(2000); // Распределяем звезды в кубе 2000x2000x2000
        const y = THREE.MathUtils.randFloatSpread(2000);
        const z = THREE.MathUtils.randFloatSpread(2000);
        starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

// --- Функция создания одного астероида ---
function createAsteroid() {
    if (asteroids.length >= MAX_ASTEROIDS) {
        return; // Не создаем больше, если достигли лимита
    }

    // Выбираем случайную геометрию и материал
    const geometryIndex = Math.floor(Math.random() * asteroidGeometries.length);
    const materialIndex = Math.floor(Math.random() * asteroidMaterials.length);
    
    const asteroid = new THREE.Mesh(
        asteroidGeometries[geometryIndex], 
        asteroidMaterials[materialIndex].clone() // Клонируем материал, чтобы можно было менять цвет индивидуально
    );
    
    // Добавляем легкую вариацию цвета для разнообразия
    const material = asteroid.material;
    const colorVariation = 0.1; // 10% вариация
    const baseColor = material.color.clone();
    
    material.color.r = baseColor.r * (1 + (Math.random() - 0.5) * colorVariation);
    material.color.g = baseColor.g * (1 + (Math.random() - 0.5) * colorVariation);
    material.color.b = baseColor.b * (1 + (Math.random() - 0.5) * colorVariation);

    // Размещаем астероиды случайно, но на определенном расстоянии от центра
    const spawnRadius = ASTEROID_SPAWN_DISTANCE + Math.random() * 200; // 400-600
    const angle = Math.random() * Math.PI * 2;
    const elevation = Math.random() * Math.PI - Math.PI / 2; // Угол над/под плоскостью XY (-PI/2 to PI/2)

    const x = spawnRadius * Math.cos(angle) * Math.cos(elevation);
    const z = spawnRadius * Math.sin(angle) * Math.cos(elevation);
    const y = spawnRadius * Math.sin(elevation) + THREE.MathUtils.randFloatSpread(200); // Добавляем разброс по Y

        asteroid.position.set(x, y, z);
    // Добавляем случайное неравномерное масштабирование для еще большего разнообразия
    const baseScale = THREE.MathUtils.randFloat(1.5, 7); // Базовый размер
    asteroid.scale.set(
        baseScale * (1 + Math.random() * 0.4), // X: базовый + до 40% больше
        baseScale * (1 + Math.random() * 0.4), // Y: базовый + до 40% больше
        baseScale * (1 + Math.random() * 0.4)  // Z: базовый + до 40% больше
    );
        asteroid.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );

    // Добавляем вращение
        asteroid.userData.rotationSpeed = new THREE.Vector3(
        THREE.MathUtils.randFloat(-0.02, 0.02), // Увеличиваем скорость вращения
        THREE.MathUtils.randFloat(-0.02, 0.02),
        THREE.MathUtils.randFloat(-0.02, 0.02)
    );
    
    // Добавляем дрейф астероидам для большей динамики
    const driftSpeed = 2; // Скорость дрейфа
    asteroid.userData.driftVelocity = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(driftSpeed),
        THREE.MathUtils.randFloatSpread(driftSpeed * 0.5), // Меньше по Y
        THREE.MathUtils.randFloatSpread(driftSpeed)
        );

        scene.add(asteroid);
        asteroids.push(asteroid);
    }

// --- Функция создания одного врага ---
function createEnemy() {
    if (aliens.length >= MAX_ENEMIES) {
        console.log("Maximum enemies reached:", MAX_ENEMIES); // Было: "Достигнут максимум врагов:"
        return; // Достигли лимита
    }

    // Выбираем случайный тип врага
    const enemyTypeList = [ENEMY_TYPES.FIGHTER, ENEMY_TYPES.DESTROYER, ENEMY_TYPES.SCOUT];
    const weights = [0.6, 0.2, 0.2]; // Вероятности появления каждого типа (60% истребителей, 20% разрушителей, 20% разведчиков)
    
    // Случайный выбор типа с учетом весов
    let rnd = Math.random();
    let weightSum = 0;
    let enemyType = enemyTypeList[0];
    
    for (let i = 0; i < weights.length; i++) {
        weightSum += weights[i];
        if (rnd <= weightSum) {
            enemyType = enemyTypeList[i];
            break;
        }
    }
    
    // Создаем контейнер для вражеского корабля
    const enemy = new THREE.Group();
    enemy.userData.type = enemyType;
    
    // Выбираем материалы в зависимости от типа
    let bodyMat, accentMat, glowMat;
    
    switch (enemyType) {
        case ENEMY_TYPES.DESTROYER:
            bodyMat = destroyerBodyMaterial;
            accentMat = destroyerAccentMaterial;
            glowMat = destroyerGlowMaterial;
            break;
        case ENEMY_TYPES.SCOUT:
            bodyMat = scoutBodyMaterial;
            accentMat = scoutAccentMaterial;
            glowMat = scoutGlowMaterial;
            break;
        case ENEMY_TYPES.FIGHTER:
        default:
            bodyMat = enemyBodyMaterial;
            accentMat = enemyAccentMaterial;
            glowMat = enemyGlowMaterial;
    }
    
    // Основной корпус (веретенообразная форма)
    let bodyGeometry;
    
    if (enemyType === ENEMY_TYPES.DESTROYER) {
        // Увеличенный и более угловатый корпус для разрушителя
        bodyGeometry = new THREE.BoxGeometry(1.2, 0.8, 3);
    } else if (enemyType === ENEMY_TYPES.SCOUT) {
        // Меньший, обтекаемый корпус для разведчика
        bodyGeometry = new THREE.CapsuleGeometry(0.4, 1.5, 8, 8);
        bodyGeometry.rotateX(Math.PI / 2);
    } else {
        // Стандартный корпус для истребителя
        bodyGeometry = new THREE.CapsuleGeometry(0.6, 2, 8, 8);
        bodyGeometry.rotateX(Math.PI / 2);
    }
    
    const body = new THREE.Mesh(bodyGeometry, bodyMat);
    
    // Крылья в зависимости от типа
    let wingGeometry;
    
    if (enemyType === ENEMY_TYPES.DESTROYER) {
        // Массивные крылья для разрушителя
        wingGeometry = new THREE.BoxGeometry(2.5, 0.2, 1.5);
    } else if (enemyType === ENEMY_TYPES.SCOUT) {
        // Тонкие изящные крылья для разведчика
        const scoutWingGeometry = new THREE.BufferGeometry();
        const scoutWingVertices = new Float32Array([
            0, 0, 0,       // центр корабля
            1.2, 0, -0.7,  // задний внешний угол
            0, 0, 0.8      // передний угол
        ]);
        const scoutWingIndices = [0, 1, 2];
        scoutWingGeometry.setIndex(scoutWingIndices);
        scoutWingGeometry.setAttribute('position', new THREE.BufferAttribute(scoutWingVertices, 3));
        scoutWingGeometry.computeVertexNormals();
        wingGeometry = scoutWingGeometry;
    } else {
        // Стандартные крылья для истребителя
        const fighterWingGeometry = new THREE.BufferGeometry();
        const fighterWingVertices = new Float32Array([
            0, 0, 0,       // центр корабля
            1.5, 0, -0.5,  // задний внешний угол
            0, 0, 1.5      // передний угол
        ]);
        const fighterWingIndices = [0, 1, 2];
        fighterWingGeometry.setIndex(fighterWingIndices);
        fighterWingGeometry.setAttribute('position', new THREE.BufferAttribute(fighterWingVertices, 3));
        fighterWingGeometry.computeVertexNormals();
        wingGeometry = fighterWingGeometry;
    }
    
    // Левое крыло
    const leftWing = new THREE.Mesh(wingGeometry, accentMat);
    leftWing.position.set(-0.3, 0, 0);
    
    // Правое крыло (зеркальное отражение левого)
    const rightWing = new THREE.Mesh(wingGeometry, accentMat);
    rightWing.position.set(0.3, 0, 0);
    rightWing.scale.set(-1, 1, 1); // Зеркальное отражение по оси X
    
    // Хвостовые крылья (вертикальные стабилизаторы)
    const tailFinGeometry = new THREE.BufferGeometry();
    // Создаем форму хвостового оперения
    const tailFinVertices = new Float32Array([
        0, 0, -1,      // задняя часть корабля
        0, 0.8, -1.5,  // верхний угол
        0, 0, -1.8     // задний угол
    ]);
    const tailFinIndices = [0, 1, 2];
    tailFinGeometry.setIndex(tailFinIndices);
    tailFinGeometry.setAttribute('position', new THREE.BufferAttribute(tailFinVertices, 3));
    tailFinGeometry.computeVertexNormals();
    
    // Верхний стабилизатор
    const topFin = new THREE.Mesh(tailFinGeometry, accentMat);
    
    // Нижний стабилизатор (зеркальное отражение верхнего)
    const bottomFin = new THREE.Mesh(tailFinGeometry, accentMat);
    bottomFin.scale.set(1, -1, 1); // Зеркальное отражение по оси Y
    
    // Кабина пилота (светящаяся)
    const cockpitGeometry = new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    cockpitGeometry.rotateX(-Math.PI / 2); // Поворачиваем, чтобы плоская сторона была сверху
    const cockpit = new THREE.Mesh(cockpitGeometry, glowMat);
    cockpit.position.set(0, 0.2, 0.3);
    cockpit.scale.set(0.8, 0.5, 0.8); // Сжимаем, чтобы было более плоским
    
    // Двигатели (светящиеся)
    const engineGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.5, 8);
    engineGeometry.rotateX(Math.PI / 2); // Ориентируем по оси Z
    
    // Левый двигатель
    const leftEngine = new THREE.Mesh(engineGeometry, bodyMat);
    leftEngine.position.set(-0.4, -0.2, -1);
    
    // Правый двигатель
    const rightEngine = new THREE.Mesh(engineGeometry, bodyMat);
    rightEngine.position.set(0.4, -0.2, -1);
    
    // Сопла двигателей (светящиеся)
    const exhaustGeometry = new THREE.CircleGeometry(0.15, 8);
    exhaustGeometry.rotateX(-Math.PI / 2); // Направляем назад
    
    // Левое сопло
    const leftExhaust = new THREE.Mesh(exhaustGeometry, glowMat);
    leftExhaust.position.set(-0.4, -0.2, -1.25);
    
    // Правое сопло
    const rightExhaust = new THREE.Mesh(exhaustGeometry, glowMat);
    rightExhaust.position.set(0.4, -0.2, -1.25);
    
    // Добавляем все части в группу
    enemy.add(body);
    enemy.add(leftWing);
    enemy.add(rightWing);
    enemy.add(topFin);
    enemy.add(bottomFin);
    enemy.add(cockpit);
    enemy.add(leftEngine);
    enemy.add(rightEngine);
    enemy.add(leftExhaust);
    enemy.add(rightExhaust);
    
    // Добавляем специальные элементы для разных типов врагов
    if (enemyType === ENEMY_TYPES.DESTROYER) {
        // Турели для разрушителя
        const turretGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 8);
        turretGeometry.rotateZ(Math.PI / 2);
        
        const topTurret = new THREE.Mesh(turretGeometry, accentMat);
        topTurret.position.set(0, 0.5, 0);
        
        const bottomTurret = new THREE.Mesh(turretGeometry, accentMat);
        bottomTurret.position.set(0, -0.5, 0);
        
        enemy.add(topTurret);
        enemy.add(bottomTurret);
        
        // Тяжелый щит спереди
        const shieldGeometry = new THREE.CylinderGeometry(0.7, 0.7, 0.2, 12);
        shieldGeometry.rotateX(Math.PI / 2);
        const shield = new THREE.Mesh(shieldGeometry, accentMat);
        shield.position.set(0, 0, 1.2);
        enemy.add(shield);
    }
    
    if (enemyType === ENEMY_TYPES.SCOUT) {
        // Антенны для разведчика
        const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4);
        
        const antenna1 = new THREE.Mesh(antennaGeometry, accentMat);
        antenna1.position.set(0.2, 0.3, -0.8);
        antenna1.rotation.set(Math.PI/4, 0, 0);
        
        const antenna2 = new THREE.Mesh(antennaGeometry, accentMat);
        antenna2.position.set(-0.2, 0.3, -0.8);
        antenna2.rotation.set(Math.PI/4, 0, 0);
        
        enemy.add(antenna1);
        enemy.add(antenna2);
        
        // Сканер
        const scannerGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const scanner = new THREE.Mesh(scannerGeometry, glowMat);
        scanner.position.set(0, 0.4, 0.5);
        enemy.add(scanner);
    }

    // Позиция появления (аналогично астероидам, но дальше)
    const spawnRadius = ENEMY_SPAWN_DISTANCE + Math.random() * 100; // 300-400
    const angle = Math.random() * Math.PI * 2;
    const elevation = Math.random() * Math.PI - Math.PI / 2;

    const x = spawnRadius * Math.cos(angle) * Math.cos(elevation);
    const z = spawnRadius * Math.sin(angle) * Math.cos(elevation);
    const y = spawnRadius * Math.sin(elevation) + THREE.MathUtils.randFloatSpread(150);

    enemy.position.set(x, y, z);
    
    // Размер в зависимости от типа
    if (enemyType === ENEMY_TYPES.DESTROYER) {
        enemy.scale.setScalar(3.0); // Увеличиваем размер разрушителей
    } else if (enemyType === ENEMY_TYPES.SCOUT) {
        enemy.scale.setScalar(2.0); // Увеличиваем размер разведчиков
    } else {
        enemy.scale.setScalar(2.5); // Увеличиваем размер истребителей
    }

    // Начальная ориентация (пусть смотрят примерно к центру)
    enemy.lookAt(scene.position); // LookAt(0,0,0)
    // Добавим случайное небольшое вращение вокруг оси Y
    enemy.rotateY(THREE.MathUtils.randFloatSpread(Math.PI));

    // Сохраняем направление движения и скорость
    const direction = new THREE.Vector3();
    enemy.getWorldDirection(direction); // Получаем локальное направление -Z (вперед для конуса)
    
    // Настраиваем скорость и маневренность в зависимости от типа
    let speed, rotationSpeed;
    
    if (enemyType === ENEMY_TYPES.DESTROYER) {
        speed = ENEMY_SPEED * 0.5; // Еще медленнее
        rotationSpeed = THREE.MathUtils.randFloat(-0.005, 0.005); // Еще менее маневренный
        enemy.userData.health = 3; // У разрушителей больше жизней
    } else if (enemyType === ENEMY_TYPES.SCOUT) {
        speed = ENEMY_SPEED * 1.3; // Быстрее, но не так сильно
        rotationSpeed = THREE.MathUtils.randFloat(-0.015, 0.015); // Маневренный, но более контролируемый
        enemy.userData.health = 1; // Хрупкие
    } else {
        speed = ENEMY_SPEED;
        rotationSpeed = THREE.MathUtils.randFloat(-0.01, 0.01); // Более плавные повороты
        enemy.userData.health = 2; // Стандартное здоровье
    }
    
    enemy.userData.velocity = direction.multiplyScalar(speed);
    enemy.userData.rotationSpeed = rotationSpeed;
    
    // Добавляем поведенческие параметры
    enemy.userData.aggressiveness = Math.random(); // 0 - пассивный, 1 - агрессивный
    enemy.userData.lastShotTime = 0; // Время последнего выстрела
    enemy.userData.shootingCooldown = enemyType === ENEMY_TYPES.DESTROYER ? 4.0 : 
                                     (enemyType === ENEMY_TYPES.SCOUT ? 2.0 : 3.0); // Увеличиваем время перезарядки

    // Параметры для охоты
    enemy.userData.targetingPlayer = false; // Флаг, что враг преследует игрока
    enemy.userData.attackMode = false; // Флаг, что враг атакует игрока
    enemy.userData.orbitDistance = THREE.MathUtils.randFloat(80, 120); // Увеличиваем дистанцию орбиты при атаке
    enemy.userData.orbitSpeed = THREE.MathUtils.randFloat(0.1, 0.4) * (Math.random() > 0.5 ? 1 : -1); // Уменьшаем скорость орбиты
    enemy.userData.smoothFactor = 0.02; // Фактор плавности движения для всех маневров
    enemy.userData.positionOffset = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(30), 
        THREE.MathUtils.randFloatSpread(20), 
        THREE.MathUtils.randFloatSpread(30)
    ); // Уникальное смещение для каждого врага, чтобы они не накладывались друг на друга

    scene.add(enemy);
    aliens.push(enemy);
    
    // Добавляем светящийся эффект для лучшей видимости
    const enemyLight = new THREE.PointLight(
        enemyType === ENEMY_TYPES.DESTROYER ? 0x0066ff : 
        enemyType === ENEMY_TYPES.SCOUT ? 0x00ff66 : 
        0xff3300, 
        1, 30);
    enemyLight.position.set(0, 0, 0);
    enemy.add(enemyLight);
    
    return enemy;
}

// --- Функция стрельбы ---
function shootLaser() {
    // Проверка перезарядки
    if (clock.getElapsedTime() - lastShotTime < shootCooldown) {
        return; // Еще не перезарядились
    }
    lastShotTime = clock.getElapsedTime();

    // Делаем корабль прозрачным при стрельбе
    setShipTransparency(SHIP_TRANSPARENCY);
    
    // Через некоторое время возвращаем непрозрачность
    setTimeout(() => {
        setShipTransparency(1.0);
    }, 1000); // Возвращаем через 1 секунду

    // Создаем более заметный лазер с ярким эффектом свечения
    const laserGeometry = new THREE.BoxGeometry(LASER_SIZE, LASER_SIZE, LASER_LENGTH);
    const laserMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff0000, 
        emissive: 0xff0000, 
        emissiveIntensity: 2.0, // Увеличили яркость свечения
        shininess: 100
    }); // Ярко-красный со свечением

    // Найдем позиции лазерных пушек
    const leftGun = player.getObjectByName('leftGun');
    const rightGun = player.getObjectByName('rightGun');
    
    // Получаем направление "вперед" от камеры
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    
    if (leftGun && rightGun) {
        // Чередуем стрельбу из левой и правой пушки
        const gunToUse = lastShotTime % 0.5 < 0.25 ? leftGun : rightGun;
        
        // Получаем мировую позицию пушки
        const gunPosition = new THREE.Vector3();
        gunToUse.getWorldPosition(gunPosition);
        
        // Создаем лазер
        const laser = new THREE.Mesh(laserGeometry, laserMaterial);
        
        // Позиционируем лазер в позиции пушки
        laser.position.copy(gunPosition);
        
        // Направление лазера совпадает с направлением камеры (куда смотрит игрок)
        laser.quaternion.copy(camera.quaternion);
        
        // Задаем скорость лазера в направлении корабля
        laser.userData.velocity = cameraDirection.clone().multiplyScalar(LASER_SPEED);
        
        // Добавляем лазер на сцену и в массив
        scene.add(laser);
        lasers.push(laser);
        
        // Создаем вспышку при выстреле
        createMuzzleFlash(gunPosition, player.quaternion);
    } else {
        // Запасной вариант, если пушки не найдены
        const laser = new THREE.Mesh(laserGeometry, laserMaterial);
        const shipPosition = new THREE.Vector3();
        player.getWorldPosition(shipPosition);
        
        // Размещаем лазер в носовой части корабля, смотрящий в направлении камеры
        laser.position.copy(shipPosition).addScaledVector(cameraDirection, 2);
        laser.quaternion.copy(camera.quaternion);
        
        // Задаем скорость лазера
        laser.userData.velocity = cameraDirection.clone().multiplyScalar(LASER_SPEED);
        
        // Добавляем лазер на сцену и в массив
        scene.add(laser);
        lasers.push(laser);
    }
}

// Создает эффект вспышки при выстреле
function createMuzzleFlash(position, rotation) {
    // Создаем яркую вспышку
    const flashGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 1.0
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(position);
    scene.add(flash);
    
    // Анимируем угасание вспышки
    const startTime = clock.getElapsedTime();
    const duration = 0.1; // Длительность эффекта в секундах
    
    function animateFlash() {
        const currentTime = clock.getElapsedTime();
        const elapsed = currentTime - startTime;
        
        if (elapsed < duration) {
            // Уменьшаем размер и прозрачность
            const progress = elapsed / duration;
            flash.scale.set(1 - progress, 1 - progress, 1 - progress);
            flashMaterial.opacity = 1 - progress;
            
            requestAnimationFrame(animateFlash);
        } else {
            // Удаляем вспышку
            scene.remove(flash);
        }
    }
    
    animateFlash();
}

// Функция для создания прицела в центре экрана
function createCrosshair() {
    // Создаем контейнер для прицела
    const crosshairContainer = document.createElement('div');
    crosshairContainer.id = 'crosshair';
    crosshairContainer.style.position = 'absolute';
    crosshairContainer.style.top = '50%';
    crosshairContainer.style.left = '50%';
    crosshairContainer.style.transform = 'translate(-50%, -50%)';
    crosshairContainer.style.width = '20px';
    crosshairContainer.style.height = '20px';
    crosshairContainer.style.pointerEvents = 'none'; // Чтобы не перехватывал клики
    
    // Создаем прицел (простой круг с точкой в центре)
    const crosshair = document.createElement('div');
    crosshair.style.width = '100%';
    crosshair.style.height = '100%';
    crosshair.style.borderRadius = '50%';
    crosshair.style.border = '2px solid rgba(255, 255, 255, 0.7)';
    crosshair.style.boxSizing = 'border-box';
    crosshair.style.position = 'relative';
    
    // Добавляем центральную точку
    const centerDot = document.createElement('div');
    centerDot.style.position = 'absolute';
    centerDot.style.width = '4px';
    centerDot.style.height = '4px';
    centerDot.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    centerDot.style.borderRadius = '50%';
    centerDot.style.top = '50%';
    centerDot.style.left = '50%';
    centerDot.style.transform = 'translate(-50%, -50%)';
    
    // Собираем прицел вместе
    crosshair.appendChild(centerDot);
    crosshairContainer.appendChild(crosshair);
    document.body.appendChild(crosshairContainer);
}

// Функция для переключения прозрачности корабля
function setShipTransparency(opacity) {
    // Перебираем все дочерние элементы корабля
    player.traverse(function(child) {
        // Если у объекта есть материал, делаем его прозрачным
        if (child.material) {
            // Если материал - это массив (у некоторых объектов может быть несколько материалов)
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                    mat.transparent = true;
                    mat.opacity = opacity;
                    // Если opacity = 1, можно отключить прозрачность для производительности
                    if (opacity === 1) mat.needsUpdate = true;
                });
            } else {
                // Один материал
                child.material.transparent = true;
                child.material.opacity = opacity;
                if (opacity === 1) child.material.needsUpdate = true;
            }
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // console.log("Окно изменено"); // Убираем логи
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // Если игра окончена, просто рендерим сцену и возвращаемся
    if (gameOver) {
        renderer.render(scene, camera);
        return;
    }

    // Обновляем астероиды (вращение)
    asteroids.forEach(asteroid => {
        asteroid.rotation.x += asteroid.userData.rotationSpeed.x;
        asteroid.rotation.y += asteroid.userData.rotationSpeed.y;
        asteroid.rotation.z += asteroid.userData.rotationSpeed.z;
        
        // Добавляем дрейф астероидам
        if (asteroid.userData.driftVelocity) {
            asteroid.position.x += asteroid.userData.driftVelocity.x * delta;
            asteroid.position.y += asteroid.userData.driftVelocity.y * delta;
            asteroid.position.z += asteroid.userData.driftVelocity.z * delta;
        }
    });

    // --- Обновление PointerLock (движение игрока) ---
    if (controls.isLocked === true) {
        // Затухание скорости
        velocity.x -= velocity.x * 5.0 * delta; // Уменьшим немного коэффициент затухания
        velocity.z -= velocity.z * 5.0 * delta;
        velocity.y -= velocity.y * 5.0 * delta; // Добавим затухание по Y
        
        // Получаем направление взгляда камеры
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        
        // Вектор вправо от камеры (перпендикулярный к направлению взгляда и вектору вверх)
        const rightVector = new THREE.Vector3();
        rightVector.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();
        
        // Создаем вектор движения в зависимости от нажатых клавиш
        const moveVector = new THREE.Vector3(0, 0, 0);
        const moveSpeed = 40.0;
        
        // Движение вперед/назад - по направлению взгляда
        if (moveForward) {
            moveVector.addScaledVector(cameraDirection, moveSpeed * delta);
        }
        if (moveBackward) {
            moveVector.addScaledVector(cameraDirection, -moveSpeed * delta);
        }
        
        // Движение вправо/влево - перпендикулярно направлению взгляда
        if (moveRight) {
            moveVector.addScaledVector(rightVector, moveSpeed * delta);
        }
        if (moveLeft) {
            moveVector.addScaledVector(rightVector, -moveSpeed * delta);
        }
        
        // Применяем движение к контроллеру
        controls.getObject().position.add(moveVector);
        
        // Обновляем позицию корабля - размещаем его перед камерой
        const shipOffset = new THREE.Vector3(0, -1.0, 0); // Увеличиваем смещение вниз, чтобы корабль не закрывал обзор
        const shipDistance = 5; // Увеличиваем расстояние перед камерой
        
        // Новая позиция: текущая позиция камеры + направление * расстояние + смещение
        const targetPosition = new THREE.Vector3().copy(controls.getObject().position)
                                                .add(cameraDirection.clone().multiplyScalar(shipDistance))
                                                .add(shipOffset);
        
        // Устанавливаем корабль в нужную позицию с более быстрой интерполяцией
        // Используем более высокое значение для более точного следования
        player.position.lerp(targetPosition, 0.25);
        
        // Ориентируем корабль по направлению камеры (полный контроль мышью как в авиасимуляторе)
        const targetQuaternion = new THREE.Quaternion();
        // Создаем вращение корабля, основанное на направлении камеры
        // Берем направление камеры и создаем кватернион напрямую
        // Это гарантирует, что корабль всегда смотрит точно в направлении камеры
        
        // Создаем вектор "вверх" - обычно это (0, 1, 0)
        const upVector = new THREE.Vector3(0, 1, 0);
        
        // Создаем временную матрицу с направлением взгляда, используя lookAt
        const lookMatrix = new THREE.Matrix4();
        // Точка впереди по направлению взгляда
        const lookTarget = new THREE.Vector3().copy(player.position).add(cameraDirection);
        lookMatrix.lookAt(player.position, lookTarget, upVector);
        
        // Получаем кватернион из матрицы
        targetQuaternion.setFromRotationMatrix(lookMatrix);
        
        // Добавляем небольшой наклон по крену, чтобы корабль визуально наклонялся  
        const bankEuler = new THREE.Euler(0, 0, 0, 'YXZ');

        // Добавляем наклон (крен) при боковом движении
        let bankAngle = 0;
        // Если движемся влево - наклон вправо, и наоборот (симуляция центробежной силы)
        if (moveLeft) bankAngle = -Math.PI / 12; // ~15 градусов влево
        else if (moveRight) bankAngle = Math.PI / 12; // ~15 градусов вправо
        // Добавляем крен к повороту
        bankEuler.z = bankAngle;
        
        // Применяем крен к основному кватерниону
        const bankQuaternion = new THREE.Quaternion().setFromEuler(bankEuler);
        targetQuaternion.multiply(bankQuaternion);
        
        // Уменьшаем скорость интерполяции для более плавного следования
        player.quaternion.slerp(targetQuaternion, 0.15);
        
        // Добавляем небольшое смещение корабля в сторону при наклоне
        if (bankAngle !== 0) {
            const lateralOffset = new THREE.Vector3(bankAngle * 0.5, 0, 0); // Смещение пропорционально наклону
            lateralOffset.applyQuaternion(camera.quaternion); // Смещаем относительно ориентации камеры
            player.position.add(lateralOffset);
        }
    }

    // --- Обновление и проверка столкновений лазеров игрока ---
    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        // Проверяем, не был ли лазер удален в предыдущей итерации столкновения (очень редкий случай)
        if (!laser || !scene.children.includes(laser)) continue;

        laser.position.addScaledVector(laser.userData.velocity, delta);

        // Удаляем лазер, если улетел далеко
        const maxDistance = 1000; // Максимальное расстояние полета лазера
        if (laser.position.length() > maxDistance) {
            scene.remove(laser);
            lasers.splice(i, 1);
            continue; // Переходим к следующему лазеру
        }

        // Проверка столкновения лазера с астероидами
        const laserBox = new THREE.Box3().setFromObject(laser);
        let laserHitAsteroid = false; // Флаг для астероидов

        for (let j = asteroids.length - 1; j >= 0; j--) {
            const asteroid = asteroids[j];
            const asteroidBox = new THREE.Box3().setFromObject(asteroid); // Bounding box астероида

            if (laserBox.intersectsBox(asteroidBox)) {
                // Столкновение с астероидом!
                
                // Создаем взрыв
                createExplosion(asteroid.position, asteroid.scale.x / 2);
                
                // Отладка: проверяем шанс выпадения аптечки
                const randValue = Math.random();
                console.log("Hit asteroid! Health pack chance:", randValue, "< " + HEALTH_PACK_DROP_CHANCE); // Было: "Попадание в астероид! Шанс аптечки:"
                
                // С некоторым шансом создаем аптечку
                if (randValue < HEALTH_PACK_DROP_CHANCE) {
                    console.log("Health pack dropped from asteroid!"); // Было: "Выпала аптечка из астероида!"
                    createHealthPack(asteroid.position.clone());
                }
                
                // С некоторым шансом создаем фрагмент данных из астероида
                if (Math.random() < DATA_FRAGMENT_DROP_CHANCE_ASTEROID) {
                    console.log("Data fragment dropped from asteroid!"); // Было: "Выпал фрагмент данных из астероида!"
                    createDataFragment(asteroid.position.clone());
                    // Добавляем очки за добычу фрагмента данных из астероида
                    gameScore += 100;
                }

                scene.remove(asteroid);
                asteroids.splice(j, 1);

                // TODO: Добавить эффект взрыва/счет очков
                laserHitAsteroid = true; // Помечаем, что лазер попал в астероид

                break; // Один лазер уничтожает один астероид, выходим из внутреннего цикла
            }
        }
        // Удаляем лазер, если попал в астероид
        if (laserHitAsteroid) {
             // Проверяем, существует ли еще лазер
            if (lasers[i] === laser) {
                 scene.remove(laser);
                 lasers.splice(i, 1);
                 continue; // Лазер уничтожен, переходим к проверке следующего лазера
            }
        }

        // Проверка столкновения лазера с врагами (если лазер все еще существует)
        let laserHitEnemy = false; // Флаг для врагов
        const enemyBox = new THREE.Box3(); // Создаем один раз вне цикла по врагам
        for (let k = aliens.length - 1; k >= 0; k--) {
            const enemy = aliens[k];
            enemyBox.setFromObject(enemy); // Обновляем для текущего врага

            if (laserBox.intersectsBox(enemyBox)) {
                // Столкновение с врагом!
                scene.remove(enemy);
                aliens.splice(k, 1);

                // Добавляем очки за уничтожение врага в зависимости от типа
                if (enemy.userData.type === ENEMY_TYPES.DESTROYER) {
                    gameScore += 300; // Больше очков за уничтожение сильного врага
                } else if (enemy.userData.type === ENEMY_TYPES.SCOUT) {
                    gameScore += 200; // За быстрого разведчика
                } else {
                    gameScore += 100; // За обычного истребителя
                }
                
                // Создаем взрыв
                createExplosion(enemy.position, enemy.scale.x * 0.6, 0xff3300);
                
                // Проверяем шанс выпадения фрагмента данных из врага
                if (Math.random() < DATA_FRAGMENT_DROP_CHANCE_ENEMY) {
                    console.log("Data fragment dropped from enemy!"); // Было: "Выпал фрагмент данных из врага!"
                    createDataFragment(enemy.position.clone());
                }
                
                // Увеличиваем счетчик уничтоженных врагов
                enemiesDefeated++;
                
                // Обновляем UI
                updateScoreUI();

                laserHitEnemy = true;
                break; // Один лазер - один враг
            }
        }
        // Удаляем лазер, если попал во врага
         if (laserHitEnemy) {
             // Проверяем, существует ли еще лазер
             if (lasers[i] === laser) {
                 scene.remove(laser);
                 lasers.splice(i, 1);
                 // continue не нужен, т.к. это конец проверок для этого лазера
             }
        }
    } // Конец цикла по лазерам игрока

    // --- Обновление врагов ---
    for (let i = aliens.length - 1; i >= 0; i--) {
        const enemy = aliens[i];

        // Проверяем расстояние до игрока
        const distanceToPlayer = enemy.position.distanceTo(player.position);
        
        // Решение охотиться за игроком
        if (distanceToPlayer < ENEMY_DETECTION_RADIUS && !enemy.userData.targetingPlayer) {
            enemy.userData.targetingPlayer = true;
            enemy.userData.initialDetection = true; // Флаг первого обнаружения
        }
        
        // Решение атаковать игрока
        if (distanceToPlayer < ENEMY_ATTACK_RADIUS && !enemy.userData.attackMode) {
            enemy.userData.attackMode = true;
            enemy.userData.orbitAngle = Math.random() * Math.PI * 2; // Случайный начальный угол орбиты
        }
        
        // Добавляем случайное смещение для орбиты
        if (!enemy.userData.orbitOffset) {
            enemy.userData.orbitOffset = {
                x: THREE.MathUtils.randFloatSpread(30),
                y: THREE.MathUtils.randFloatSpread(20),
                z: THREE.MathUtils.randFloatSpread(30)
            };
        }
        
        // Поведение в зависимости от режима
        if (enemy.userData.attackMode) {
            // Режим атаки: кружимся вокруг игрока и стреляем
            
            // Обновляем угол орбиты
            enemy.userData.orbitAngle += enemy.userData.orbitSpeed * delta * 0.8;
            
            // Вычисляем новую позицию на орбите вокруг игрока
            const orbitCenter = player.position.clone();
            const orbitOffset = new THREE.Vector3(
                Math.cos(enemy.userData.orbitAngle) * enemy.userData.orbitDistance,
                15 * Math.sin(enemy.userData.orbitAngle * 0.3) + enemy.userData.orbitOffset.y, // Плавное вертикальное движение
                Math.sin(enemy.userData.orbitAngle) * enemy.userData.orbitDistance
            );
            
            // Добавляем индивидуальное смещение для каждого врага
            orbitOffset.x += enemy.userData.orbitOffset.x * 0.3;
            orbitOffset.z += enemy.userData.orbitOffset.z * 0.3;
            
            // Плавно перемещаемся к позиции на орбите
            const targetPosition = orbitCenter.add(orbitOffset);
            
            // Более плавное движение с ограничением скорости
            const maxStep = delta * 30; // Максимальное перемещение за кадр
            const distance = enemy.position.distanceTo(targetPosition);
            const step = Math.min(distance * 0.05, maxStep); // 5% расстояния или максимум
            
            if (distance > 1) { // Если враг находится достаточно далеко от цели
                const direction = new THREE.Vector3().subVectors(targetPosition, enemy.position).normalize();
                enemy.position.addScaledVector(direction, step);
            }
            
            // Плавный поворот к игроку
            const targetDirection = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
            const currentDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(enemy.quaternion);
            
            // Используем quaternion для плавного поворота
            const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
                currentDirection, targetDirection);
            enemy.quaternion.slerp(targetQuaternion, Math.min(0.05, delta * 1.5));
            
            // Стреляем в игрока
            const currentTime = clock.getElapsedTime();
            if (currentTime - enemy.userData.lastShotTime > enemy.userData.shootingCooldown) {
                // Проверяем, что игрок находится в поле зрения (перед врагом)
                const directionToPlayer = player.position.clone().sub(enemy.position).normalize();
                const enemyForward = new THREE.Vector3(0, 0, -1).applyQuaternion(enemy.quaternion);
                const dotProduct = directionToPlayer.dot(enemyForward);
                
                if (dotProduct > 0.9) { // Угол менее ~25 градусов - более точное прицеливание
                    createEnemyLaser(enemy);
                    enemy.userData.lastShotTime = currentTime;
                }
            }
        } 
        else if (enemy.userData.targetingPlayer) {
            // Режим охоты: летим к игроку
            // Вычисляем направление к игроку
            const directionToPlayer = player.position.clone().sub(enemy.position).normalize();
            
            // При первом обнаружении делаем агрессивный поворот в сторону игрока
            if (enemy.userData.initialDetection) {
                // Вместо мгновенного поворота делаем начальный поворот более плавным
                const initQuaternion = new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 0, -1), directionToPlayer);
                enemy.quaternion.slerp(initQuaternion, 0.2); // 20% поворот за один кадр
                enemy.userData.initialDetection = false;
            } else {
                // Плавный поворот в сторону игрока
                const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 0, -1), directionToPlayer);
                enemy.quaternion.slerp(targetQuaternion, enemy.userData.smoothFactor);
            }
            
            // Обновляем скорость в зависимости от типа врага
            let speed;
            if (enemy.userData.type === ENEMY_TYPES.DESTROYER) {
                speed = ENEMY_SPEED * 0.5;
            } else if (enemy.userData.type === ENEMY_TYPES.SCOUT) {
                speed = ENEMY_SPEED * 1.3;
            } else {
                speed = ENEMY_SPEED;
            }
            
            // Инициализируем текущую скорость, если её ещё нет
            if (!enemy.userData.currentSpeed) {
                enemy.userData.currentSpeed = speed * 0.3; // Начинаем с 30% скорости
            }
            
            // Плавно изменяем скорость (акселерация/замедление)
            const speedDiff = speed - enemy.userData.currentSpeed;
            enemy.userData.currentSpeed += speedDiff * Math.min(delta * 0.5, 0.03); // 3% разницы за кадр или меньше

            // Двигаемся вперед
            const enemyForward = new THREE.Vector3(0, 0, -1).applyQuaternion(enemy.quaternion);
            enemy.position.addScaledVector(enemyForward, enemy.userData.currentSpeed * delta);

            // Добавляем небольшое случайное отклонение для более естественного движения
            if (Math.random() < 0.05) { // С вероятностью 5% за кадр
                const randomOffset = new THREE.Vector3(
                    THREE.MathUtils.randFloatSpread(1),
                    THREE.MathUtils.randFloatSpread(0.5),
                    THREE.MathUtils.randFloatSpread(1)
                );
                enemy.position.add(randomOffset);
            }
        } 
        else {
            // Стандартное поведение: дрейф по инерции
            enemy.position.addScaledVector(enemy.userData.velocity, delta);
            enemy.rotateY(enemy.userData.rotationSpeed * delta);
            
            // Обновляем вектор скорости после поворота
            const forwardDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(enemy.quaternion);
            enemy.userData.velocity.copy(forwardDirection.multiplyScalar(ENEMY_SPEED * 0.3)); // Снижаем скорость дрейфа
        }

        // Удаляем врагов, улетевших слишком далеко (опционально)
        const maxEnemyDistance = 1200;
        if (enemy.position.length() > maxEnemyDistance) {
            scene.remove(enemy);
            aliens.splice(i, 1);
            continue; // Переходим к следующему врагу
        }

        // Проверка столкновения с игроком
        if (!invulnerable) {
            const enemyBox = new THREE.Box3().setFromObject(enemy);
            const playerBox = new THREE.Box3().setFromObject(player);
            
            if (enemyBox.intersectsBox(playerBox)) {
                // Столкновение с врагом!
                takeDamage(); // Наносим урон игроку
                
                // Создаем эффект взрыва врага
                createExplosion(enemy.position, enemy.scale.x, 0xff0000);
                
                // Удаляем врага
                scene.remove(enemy);
                aliens.splice(i, 1);
                
                break; // После столкновения выходим (важно для неуязвимости)
            }
        }
    }

    // --- Обновление лазеров врагов ---
    for (let i = enemyLasers.length - 1; i >= 0; i--) {
        const laser = enemyLasers[i];
        
        laser.position.addScaledVector(laser.userData.velocity, delta);
        
        // Удаляем лазер, если улетел далеко
        const maxDistance = 1000;
        if (laser.position.length() > maxDistance) {
            scene.remove(laser);
            enemyLasers.splice(i, 1);
            continue;
        }
        
        // Проверка столкновения с игроком
        if (!invulnerable) {
            const laserBox = new THREE.Box3().setFromObject(laser);
            const playerBox = new THREE.Box3().setFromObject(player);
            
            if (laserBox.intersectsBox(playerBox)) {
                // Столкновение с игроком!
                takeDamage(); // Наносим урон игроку
                
                // Эффект попадания
                createExplosion(laser.position, 0.5, 0xff5500);
                
                // Удаляем лазер
                scene.remove(laser);
                enemyLasers.splice(i, 1);
                continue;
            }
        }
        
        // Проверка столкновения с астероидами
        for (let j = asteroids.length - 1; j >= 0; j--) {
            const asteroid = asteroids[j];
            const asteroidBox = new THREE.Box3().setFromObject(asteroid);
            const laserBox = new THREE.Box3().setFromObject(laser);
            
            if (laserBox.intersectsBox(asteroidBox)) {
                // Лазер попал в астероид
                createExplosion(laser.position, 0.3, 0xff3300);
                
                // Удаляем лазер
                scene.remove(laser);
                enemyLasers.splice(i, 1);
                break;
            }
        }
    }

    // --- Возрождение астероидов ---
    if (asteroids.length < MAX_ASTEROIDS) {
        // Можно добавить таймер или вероятность, чтобы они не появлялись мгновенно
        // Простой вариант: создавать по одному, пока не достигнем лимита
        createAsteroid();
    }

    // --- Возрождение врагов ---
    if (aliens.length < MAX_ENEMIES) {
        // Добавим небольшую задержку перед спавном, чтобы не появлялись мгновенно
        if (Math.random() < 0.05) { // Увеличиваем шанс до 5% на спавн в кадр
            const enemy = createEnemy();
            if (enemy) { // Добавим проверку, что враг действительно был создан
                 console.log("Created new enemy of type:", enemy.userData.type, "Total enemies:", aliens.length); // Было: "Создан новый враг типа:", ... "Всего врагов:"
            }
        }
    }

    // --- Обновление и проверка столкновения с аптечками ---
    for (let i = healthPacks.length - 1; i >= 0; i--) {
        const healthPack = healthPacks[i];
        
        // Вращаем аптечку для заметности
        healthPack.rotation.y += healthPack.userData.rotationSpeed.y;
        
        // Добавляем пульсацию размера
        if (healthPack.userData.pulseState !== undefined) {
            healthPack.userData.pulseState += 0.05;
            const pulseFactor = 1 + 0.3 * Math.sin(healthPack.userData.pulseState);
            healthPack.scale.setScalar(2.0 * pulseFactor);
        }
        
        // Проверяем время жизни
        const packAge = clock.getElapsedTime() - healthPack.userData.creationTime;
        if (packAge > healthPack.userData.lifespan) {
            console.log("Health pack expired"); // Было: "Аптечка истекла по времени жизни"
            scene.remove(healthPack);
            healthPacks.splice(i, 1);
            continue;
        }
        
        // Если время жизни заканчивается, делаем мигание
        if (healthPack.userData.lifespan - packAge < 3) {
            const blinkRate = Math.sin(packAge * 10) * 0.5 + 0.5;
            healthPack.visible = blinkRate > 0.5;
        }
        
        // Проверяем столкновение с игроком
        const healthPackBox = new THREE.Box3().setFromObject(healthPack);
        const playerBox = new THREE.Box3().setFromObject(player);
        
        if (healthPackBox.intersectsBox(playerBox)) {
            // Игрок подобрал аптечку
            if (playerHealth < 3) { // Ограничиваем максимальное здоровье
                console.log("Player picked up health pack! Health +1"); // Было: "Игрок подобрал аптечку! Здоровье +1"
                playerHealth++;
                updateHealthUI();
                
                // Эффект подбора
                createExplosion(healthPack.position, 0.7, 0x00ff00);
            }
            
            scene.remove(healthPack);
            healthPacks.splice(i, 1);
        }
    }

    // --- Проверка столкновений игрока с астероидами ---
    if (!invulnerable) { // Проверяем только если игрок не в режиме неуязвимости
        const playerBox = new THREE.Box3().setFromObject(player);
        
        for (let i = asteroids.length - 1; i >= 0; i--) {
            const asteroid = asteroids[i];
            const asteroidBox = new THREE.Box3().setFromObject(asteroid);
            
            if (playerBox.intersectsBox(asteroidBox)) {
                // Столкновение с астероидом!
                takeDamage(); // Наносим урон игроку
                
                // Создаем эффект взрыва астероида
                createExplosion(asteroid.position, asteroid.scale.x / 2);
                
                // Удаляем астероид
                scene.remove(asteroid);
                asteroids.splice(i, 1);
                
                break; // После столкновения с одним астероидом выходим (важно для неуязвимости)
            }
        }
    }

    // --- Обновление врагов ---
    for (let i = aliens.length - 1; i >= 0; i--) {
        const enemy = aliens[i];

        // Проверяем расстояние до игрока
        const distanceToPlayer = enemy.position.distanceTo(player.position);
        
        // Решение охотиться за игроком
        if (distanceToPlayer < ENEMY_DETECTION_RADIUS && !enemy.userData.targetingPlayer) {
            enemy.userData.targetingPlayer = true;
            enemy.userData.initialDetection = true; // Флаг первого обнаружения
        }
        
        // Решение атаковать игрока
        if (distanceToPlayer < ENEMY_ATTACK_RADIUS && !enemy.userData.attackMode) {
            enemy.userData.attackMode = true;
            enemy.userData.orbitAngle = Math.random() * Math.PI * 2; // Случайный начальный угол орбиты
        }
        
        // Добавляем случайное смещение для орбиты
        if (!enemy.userData.orbitOffset) {
            enemy.userData.orbitOffset = {
                x: THREE.MathUtils.randFloatSpread(30),
                y: THREE.MathUtils.randFloatSpread(20),
                z: THREE.MathUtils.randFloatSpread(30)
            };
        }
        
        // Поведение в зависимости от режима
        if (enemy.userData.attackMode) {
            // Режим атаки: кружимся вокруг игрока и стреляем
            
            // Обновляем угол орбиты
            enemy.userData.orbitAngle += enemy.userData.orbitSpeed * delta * 0.8;
            
            // Вычисляем новую позицию на орбите вокруг игрока
            const orbitCenter = player.position.clone();
            const orbitOffset = new THREE.Vector3(
                Math.cos(enemy.userData.orbitAngle) * enemy.userData.orbitDistance,
                15 * Math.sin(enemy.userData.orbitAngle * 0.3) + enemy.userData.orbitOffset.y, // Плавное вертикальное движение
                Math.sin(enemy.userData.orbitAngle) * enemy.userData.orbitDistance
            );
            
            // Добавляем индивидуальное смещение для каждого врага
            orbitOffset.x += enemy.userData.orbitOffset.x * 0.3;
            orbitOffset.z += enemy.userData.orbitOffset.z * 0.3;
            
            // Плавно перемещаемся к позиции на орбите
            const targetPosition = orbitCenter.add(orbitOffset);
            
            // Более плавное движение с ограничением скорости
            const maxStep = delta * 30; // Максимальное перемещение за кадр
            const distance = enemy.position.distanceTo(targetPosition);
            const step = Math.min(distance * 0.05, maxStep); // 5% расстояния или максимум
            
            if (distance > 1) { // Если враг находится достаточно далеко от цели
                const direction = new THREE.Vector3().subVectors(targetPosition, enemy.position).normalize();
                enemy.position.addScaledVector(direction, step);
            }
            
            // Плавный поворот к игроку
            const targetDirection = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
            const currentDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(enemy.quaternion);
            
            // Используем quaternion для плавного поворота
            const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
                currentDirection, targetDirection);
            enemy.quaternion.slerp(targetQuaternion, Math.min(0.05, delta * 1.5));
            
            // Стреляем в игрока
            const currentTime = clock.getElapsedTime();
            if (currentTime - enemy.userData.lastShotTime > enemy.userData.shootingCooldown) {
                // Проверяем, что игрок находится в поле зрения (перед врагом)
                const directionToPlayer = player.position.clone().sub(enemy.position).normalize();
                const enemyForward = new THREE.Vector3(0, 0, -1).applyQuaternion(enemy.quaternion);
                const dotProduct = directionToPlayer.dot(enemyForward);
                
                if (dotProduct > 0.9) { // Угол менее ~25 градусов - более точное прицеливание
                    createEnemyLaser(enemy);
                    enemy.userData.lastShotTime = currentTime;
                }
            }
        } 
        else if (enemy.userData.targetingPlayer) {
            // Режим охоты: летим к игроку
            // Вычисляем направление к игроку
            const directionToPlayer = player.position.clone().sub(enemy.position).normalize();
            
            // При первом обнаружении делаем агрессивный поворот в сторону игрока
            if (enemy.userData.initialDetection) {
                // Вместо мгновенного поворота делаем начальный поворот более плавным
                const initQuaternion = new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 0, -1), directionToPlayer);
                enemy.quaternion.slerp(initQuaternion, 0.2); // 20% поворот за один кадр
                enemy.userData.initialDetection = false;
            } else {
                // Плавный поворот в сторону игрока
                const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 0, -1), directionToPlayer);
                enemy.quaternion.slerp(targetQuaternion, enemy.userData.smoothFactor);
            }
            
            // Обновляем скорость в зависимости от типа врага
            let speed;
            if (enemy.userData.type === ENEMY_TYPES.DESTROYER) {
                speed = ENEMY_SPEED * 0.5;
            } else if (enemy.userData.type === ENEMY_TYPES.SCOUT) {
                speed = ENEMY_SPEED * 1.3;
            } else {
                speed = ENEMY_SPEED;
            }
            
            // Инициализируем текущую скорость, если её ещё нет
            if (!enemy.userData.currentSpeed) {
                enemy.userData.currentSpeed = speed * 0.3; // Начинаем с 30% скорости
            }
            
            // Плавно изменяем скорость (акселерация/замедление)
            const speedDiff = speed - enemy.userData.currentSpeed;
            enemy.userData.currentSpeed += speedDiff * Math.min(delta * 0.5, 0.03); // 3% разницы за кадр или меньше

            // Двигаемся вперед
            const enemyForward = new THREE.Vector3(0, 0, -1).applyQuaternion(enemy.quaternion);
            enemy.position.addScaledVector(enemyForward, enemy.userData.currentSpeed * delta);

            // Добавляем небольшое случайное отклонение для более естественного движения
            if (Math.random() < 0.05) { // С вероятностью 5% за кадр
                const randomOffset = new THREE.Vector3(
                    THREE.MathUtils.randFloatSpread(1),
                    THREE.MathUtils.randFloatSpread(0.5),
                    THREE.MathUtils.randFloatSpread(1)
                );
                enemy.position.add(randomOffset);
            }
        } 
        else {
            // Стандартное поведение: дрейф по инерции
            enemy.position.addScaledVector(enemy.userData.velocity, delta);
            enemy.rotateY(enemy.userData.rotationSpeed * delta);
            
            // Обновляем вектор скорости после поворота
            const forwardDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(enemy.quaternion);
            enemy.userData.velocity.copy(forwardDirection.multiplyScalar(ENEMY_SPEED * 0.3)); // Снижаем скорость дрейфа
        }

        // Удаляем врагов, улетевших слишком далеко (опционально)
        const maxEnemyDistance = 1200;
        if (enemy.position.length() > maxEnemyDistance) {
            scene.remove(enemy);
            aliens.splice(i, 1);
            continue; // Переходим к следующему врагу
        }

        // Проверка столкновения с игроком
        if (!invulnerable) {
            const enemyBox = new THREE.Box3().setFromObject(enemy);
            const playerBox = new THREE.Box3().setFromObject(player);
            
            if (enemyBox.intersectsBox(playerBox)) {
                // Столкновение с врагом!
                takeDamage(); // Наносим урон игроку
                
                // Создаем эффект взрыва врага
                createExplosion(enemy.position, enemy.scale.x, 0xff0000);
                
                // Удаляем врага
                scene.remove(enemy);
                aliens.splice(i, 1);
                
                break; // После столкновения выходим (важно для неуязвимости)
            }
        }
    }

    // Обновляем индикаторы врагов
    updateEnemyIndicators();

    // --- Обновление и проверка столкновения с фрагментами данных ---
    for (let i = dataFragments.length - 1; i >= 0; i--) {
        const dataFragment = dataFragments[i];
        
        // Вращаем фрагмент данных
        dataFragment.rotation.x += dataFragment.userData.rotationSpeed.x;
        dataFragment.rotation.y += dataFragment.userData.rotationSpeed.y;
        dataFragment.rotation.z += dataFragment.userData.rotationSpeed.z;
        
        // Плавающее движение
        const floatOffset = Math.sin((clock.getElapsedTime() + dataFragment.userData.floatOffset) * dataFragment.userData.floatSpeed) * dataFragment.userData.floatHeight;
        dataFragment.position.y = dataFragment.userData.startY + floatOffset;
        
        // Проверяем время жизни
        const fragmentAge = clock.getElapsedTime() - dataFragment.userData.creationTime;
        if (fragmentAge > dataFragment.userData.lifespan) {
            scene.remove(dataFragment);
            dataFragments.splice(i, 1);
            continue;
        }
        
        // Если время жизни заканчивается, делаем мигание
        if (dataFragment.userData.lifespan - fragmentAge < 5) {
            const blinkRate = Math.sin(fragmentAge * 10) * 0.5 + 0.5;
            dataFragment.visible = blinkRate > 0.5;
        }
        
        // Проверяем столкновение с игроком
        const fragmentBox = new THREE.Box3().setFromObject(dataFragment);
        const playerBox = new THREE.Box3().setFromObject(player);
        
        if (fragmentBox.intersectsBox(playerBox)) {
            // Игрок подобрал фрагмент данных
            dataCollected++;
            gameScore += 500; // Добавляем очки за сбор данных
            
            // Эффект подбора
            createExplosion(dataFragment.position, 1.0, 0xffee00);
            
            // Обновляем UI
            updateScoreUI();
            
            // Удаляем фрагмент из сцены
            scene.remove(dataFragment);
            dataFragments.splice(i, 1);
            
            // Проверяем, собраны ли все данные для завершения уровня
            if (dataCollected >= missionObjective) {
                showLevelComplete();
            }
        }
    }

    // --- Обновление UI очков
    updateScoreUI();
    
    // Рендеринг сцены
    // controls.update(); // Обновляем OrbitControls (закомментировано, т.к. используем PointerLock)
    renderer.render(scene, camera);
} 

// Функция для создания UI отображающего здоровье
function createHealthUI() {
    const healthContainer = document.createElement('div');
    healthContainer.id = 'health-container';
    healthContainer.style.position = 'absolute';
    healthContainer.style.top = '20px';
    healthContainer.style.left = '20px';
    healthContainer.style.display = 'flex';
    healthContainer.style.gap = '10px';
    healthContainer.style.zIndex = '9999';
    
    // Создаем иконки здоровья
    for (let i = 0; i < playerHealth; i++) {
        const healthIcon = document.createElement('div');
        healthIcon.className = 'health-icon';
        healthIcon.style.width = '30px';
        healthIcon.style.height = '30px';
        healthIcon.style.backgroundColor = 'red';
        healthIcon.style.borderRadius = '5px';
        healthIcon.style.boxShadow = '0 0 10px red';
        healthContainer.appendChild(healthIcon);
    }
    
    document.body.appendChild(healthContainer);
}

// Функция обновления UI здоровья
function updateHealthUI() {
    const healthContainer = document.getElementById('health-container');
    if (!healthContainer) return;
    
    // Удаляем все иконки
    while (healthContainer.firstChild) {
        healthContainer.removeChild(healthContainer.firstChild);
    }
    
    // Добавляем иконки по текущему здоровью
    for (let i = 0; i < playerHealth; i++) {
        const healthIcon = document.createElement('div');
        healthIcon.className = 'health-icon';
        healthIcon.style.width = '30px';
        healthIcon.style.height = '30px';
        healthIcon.style.backgroundColor = 'red';
        healthIcon.style.borderRadius = '5px';
        healthIcon.style.boxShadow = '0 0 10px red';
        healthContainer.appendChild(healthIcon);
    }
}

// Функция для создания эффекта получения урона
function takeDamage() {
    if (invulnerable || gameOver) return; // Если игрок неуязвим или игра окончена, не наносим урон
    
    playerHealth--; // Уменьшаем здоровье
    updateHealthUI(); // Обновляем UI
    
    // Мигаем кораблем игрока красным
    player.traverse(function(child) {
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                    mat.oldColor = mat.color.clone(); // Сохраняем старый цвет
                    mat.color.set(0xff0000); // Красный цвет
                    mat.needsUpdate = true;
                });
            } else {
                child.material.oldColor = child.material.color.clone();
                child.material.color.set(0xff0000);
                child.material.needsUpdate = true;
            }
        }
    });
    
    // Делаем игрока неуязвимым на короткое время
    invulnerable = true;
    
    // Через 2 секунды возвращаем нормальный цвет и убираем неуязвимость
    setTimeout(() => {
        player.traverse(function(child) {
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (mat.oldColor) {
                            mat.color.copy(mat.oldColor);
                            mat.needsUpdate = true;
                        }
                    });
                } else {
                    if (child.material.oldColor) {
                        child.material.color.copy(child.material.oldColor);
                        child.material.needsUpdate = true;
                    }
                }
            }
        });
        
        invulnerable = false;
    }, 2000);
    
    // Проверяем условие конца игры
    if (playerHealth <= 0) {
        gameOver = true;
        endGame();
    }
}

// Функция для обработки конца игры
function endGame() {
    // Создаем эффект взрыва игрока
    createExplosion(player.position, 2.0, 0xff4500);
    
    // Показываем экран проигрыша
    const gameOverOverlay = document.createElement('div');
    gameOverOverlay.id = 'game-over-overlay';
    gameOverOverlay.style.position = 'fixed';
    gameOverOverlay.style.top = '0';
    gameOverOverlay.style.left = '0';
    gameOverOverlay.style.width = '100%';
    gameOverOverlay.style.height = '100%';
    gameOverOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    gameOverOverlay.style.zIndex = '9999';
    gameOverOverlay.style.display = 'flex';
    gameOverOverlay.style.flexDirection = 'column';
    gameOverOverlay.style.justifyContent = 'center';
    gameOverOverlay.style.alignItems = 'center';
    
    const gameOverText = document.createElement('h1');
    gameOverText.textContent = 'GAME OVER';
    gameOverText.style.color = '#ff0000';
    gameOverText.style.fontSize = '4rem';
    gameOverText.style.marginBottom = '2rem';
    gameOverText.style.fontFamily = 'Arial, sans-serif';
    gameOverText.style.textShadow = '0 0 10px #ff0000';
    
    const restartButton = document.createElement('button');
    restartButton.textContent = 'RESTART';
    restartButton.style.backgroundColor = '#ff3300';
    restartButton.style.color = 'white';
    restartButton.style.border = 'none';
    restartButton.style.padding = '15px 30px';
    restartButton.style.fontSize = '1.5rem';
    restartButton.style.borderRadius = '5px';
    restartButton.style.cursor = 'pointer';
    restartButton.style.transition = 'all 0.2s';
    
    restartButton.onmouseover = function() {
        this.style.backgroundColor = '#ff5500';
        this.style.transform = 'scale(1.05)';
    };
    restartButton.onmouseout = function() {
        this.style.backgroundColor = '#ff3300';
        this.style.transform = 'scale(1)';
    };
    
    restartButton.onclick = function() {
        location.reload(); // Перезагружаем страницу для начала новой игры
    };
    
    gameOverOverlay.appendChild(gameOverText);
    gameOverOverlay.appendChild(restartButton);
    document.body.appendChild(gameOverOverlay);
    
    // Скрываем корабль игрока
    player.visible = false;
    controls.unlock(); // Разблокируем управление, чтобы показался курсор
}

// Функция для создания аптечки
function createHealthPack(position) {
    console.log("Creating health pack at position:", position);
    
    try {
        // Создаем группу для аптечки
        const healthPack = new THREE.Group();
        
        // Основа аптечки (коробка)
        const packGeometry = new THREE.BoxGeometry(1, 1, 1);
        const pack = new THREE.Mesh(packGeometry, healthPackMaterial);
        
        // Добавляем медицинский крест на аптечку
        const crossVerticalGeometry = new THREE.BoxGeometry(0.2, 0.8, 1.1);
        const crossHorizontalGeometry = new THREE.BoxGeometry(0.8, 0.2, 1.1);
        
        const crossVertical = new THREE.Mesh(crossVerticalGeometry, new THREE.MeshPhongMaterial({ color: 0xffffff }));
        const crossHorizontal = new THREE.Mesh(crossHorizontalGeometry, new THREE.MeshPhongMaterial({ color: 0xffffff }));
        
        // Добавляем все части в группу
        healthPack.add(pack);
        healthPack.add(crossVertical);
        healthPack.add(crossHorizontal);
        
        // Корректируем позицию, чтобы она была ближе к игроку
        const playerPos = player.position.clone();
        const directionToPlayer = playerPos.sub(position).normalize();
        // Устанавливаем аптечку на полпути между астероидом и игроком
        healthPack.position.copy(position).addScaledVector(directionToPlayer, position.distanceTo(player.position) * 0.5);
        
        // Увеличиваем размер для лучшей видимости
        healthPack.scale.setScalar(2.0); // Сделаем еще больше для лучшей видимости
        
        // Добавляем вращение для заметности
        healthPack.userData.rotationSpeed = new THREE.Vector3(0, 0.05, 0); // Ускоряем вращение
        
        // Добавляем свет к аптечке для лучшей видимости
        const healthLight = new THREE.PointLight(0x00ff00, 5, 30); // Увеличиваем яркость и радиус
        healthLight.position.set(0, 0, 0);
        healthPack.add(healthLight);
        
        // Добавляем пульсацию
        healthPack.userData.pulseState = 0;
        healthPack.userData.pulseDirection = 1;
        healthPack.userData.pulseSpeed = 0.05;
        // Устанавливаем время жизни (15 секунд)
        healthPack.userData.creationTime = clock.getElapsedTime();
        healthPack.userData.lifespan = 15; // В секундах
        
        // Добавляем в сцену и массив
        scene.add(healthPack);
        healthPacks.push(healthPack);
        console.log("Health pack created! Total packs:", healthPacks.length);
        
        return healthPack;
    } catch (error) {
        console.error("Error creating health pack:", error);
        return null;
    }
}

// Функция создания взрыва
function createExplosion(position, size, color) {
    // Создаем частицы взрыва
    const particleCount = 20;
    const explosionGeometry = new THREE.SphereGeometry(0.2, 4, 4);
    const explosionMaterial = new THREE.MeshBasicMaterial({
        color: color || 0xff8800,
        transparent: true,
        opacity: 1.0
    });
    
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(explosionGeometry, explosionMaterial.clone());
        particle.position.copy(position);
        
        // Создаем случайный вектор направления
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        ).normalize().multiplyScalar(5 + Math.random() * 5); // Скорость разлета
        
        particle.userData.velocity = velocity;
        particle.userData.life = 1.0; // Начальное "здоровье" частицы
        particle.scale.setScalar(size * (0.5 + Math.random() * 0.5)); // Разный размер частиц
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Анимируем частицы
    const startTime = clock.getElapsedTime();
    const duration = 1.5; // Длительность взрыва в секундах
    
    function animateExplosion() {
        const currentTime = clock.getElapsedTime();
        const elapsed = currentTime - startTime;
        
        if (elapsed < duration) {
            for (let i = 0; i < particles.length; i++) {
                const particle = particles[i];
                
                // Обновляем позицию
                particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.016)); // ~60fps
                
                // Уменьшаем скорость для эффекта сопротивления
                particle.userData.velocity.multiplyScalar(0.95);
                
                // Уменьшаем прозрачность со временем
                particle.userData.life -= 0.016 / duration;
                particle.material.opacity = particle.userData.life;
                
                // Уменьшаем размер частицы
                particle.scale.multiplyScalar(0.98);
            }
            
            requestAnimationFrame(animateExplosion);
        } else {
            // Удаляем все частицы после окончания анимации
            for (let i = 0; i < particles.length; i++) {
                scene.remove(particles[i]);
            }
            particles.length = 0;
        }
    }
    
    animateExplosion();
}

// Функция создания лазера врага
function createEnemyLaser(enemy) {
    // Создаем геометрию для лазера
    const laserGeometry = new THREE.CylinderGeometry(0.1, 0.1, 15, 8);
    laserGeometry.rotateX(Math.PI / 2); // Поворачиваем, чтобы лазер летел вдоль оси Z
    
    // Создаем основу лазера
    const laser = new THREE.Mesh(laserGeometry, enemyLaserMaterial);
    
    // Создаем внешнее свечение (больший радиус, но полупрозрачный)
    const glowGeometry = new THREE.CylinderGeometry(0.3, 0.3, 15, 8);
    glowGeometry.rotateX(Math.PI / 2);
    const glow = new THREE.Mesh(glowGeometry, enemyLaserGlowMaterial);
    
    // Добавляем свечение к лазеру
    laser.add(glow);
    
    // Определяем направление на игрока
    const direction = player.position.clone().sub(enemy.position).normalize();
    
    // Учитываем случайное отклонение (зависит от типа врага)
    let accuracy;
    if (enemy.userData.type === ENEMY_TYPES.DESTROYER) {
        accuracy = 0.95; // Разрушители стреляют точно
    } else if (enemy.userData.type === ENEMY_TYPES.SCOUT) {
        accuracy = 0.7; // Разведчики менее точны
    } else {
        accuracy = 0.85; // Истребители средней точности
    }
    
    // Добавляем небольшую случайность к направлению, если точность не 100%
    if (accuracy < 1.0) {
        const randomFactor = (1 - accuracy) * 0.2; // Максимальное отклонение
        direction.x += THREE.MathUtils.randFloatSpread(randomFactor);
        direction.y += THREE.MathUtils.randFloatSpread(randomFactor);
        direction.z += THREE.MathUtils.randFloatSpread(randomFactor);
        direction.normalize(); // Нормализуем после изменения
    }
    
    // Устанавливаем позицию и направление
    laser.position.copy(enemy.position);
    laser.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    
    // Сохраняем направление и скорость
    laser.userData.velocity = direction.multiplyScalar(ENEMY_LASER_SPEED);
    
    // Сохраняем информацию о стреляющем враге
    laser.userData.shooter = enemy;
    
    // Добавляем в сцену и массив
    scene.add(laser);
    enemyLasers.push(laser);
    
    // Добавляем звуковой эффект (если есть)
    // playLaserSound(); // (опционально)
    
    return laser;
}

// Функция создания индикаторов врагов
function createEnemyIndicators() {
    // Создаем контейнер для индикаторов
    const indicatorsContainer = document.createElement('div');
    indicatorsContainer.id = 'enemy-indicators';
    indicatorsContainer.style.position = 'absolute';
    indicatorsContainer.style.top = '0';
    indicatorsContainer.style.left = '0';
    indicatorsContainer.style.width = '100%';
    indicatorsContainer.style.height = '100%';
    indicatorsContainer.style.pointerEvents = 'none'; // Не блокируем взаимодействие
    indicatorsContainer.style.zIndex = '1000';
    document.body.appendChild(indicatorsContainer);
}

// Функция обновления индикаторов врагов
function updateEnemyIndicators() {
    // Очищаем старые индикаторы
    const container = document.getElementById('enemy-indicators');
    if (!container) return;
    
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    // Если нет врагов, выходим
    if (aliens.length === 0) return;
    
    // Максимальное количество индикаторов
    const maxIndicators = 3;
    
    // Сортируем врагов по расстоянию до игрока
    const sortedEnemies = [...aliens].sort((a, b) => {
        const distA = a.position.distanceTo(player.position);
        const distB = b.position.distanceTo(player.position);
        return distA - distB;
    }).slice(0, maxIndicators); // Берем только ближайших
    
    // Создаем индикаторы для ближайших врагов
    sortedEnemies.forEach(enemy => {
        // Получаем позицию врага в пространстве экрана
        const enemyPos = enemy.position.clone();
        const screenPos = enemyPos.project(camera);
        
        // Проверяем, находится ли враг в поле зрения камеры
        const isInView = Math.abs(screenPos.x) <= 1 && Math.abs(screenPos.y) <= 1 && screenPos.z <= 1;
        
        // Если враг не в поле зрения, создаем индикатор
        if (!isInView) {
            // Ограничиваем координаты экрана в пределах видимой области
            screenPos.x = Math.max(-0.9, Math.min(0.9, screenPos.x));
            screenPos.y = Math.max(-0.9, Math.min(0.9, screenPos.y));
            
            // Если враг позади, показываем индикатор по краю экрана
            if (screenPos.z > 1) {
                // Нормализуем координаты для краев экрана
                const angle = Math.atan2(screenPos.y, screenPos.x);
                screenPos.x = 0.9 * Math.cos(angle);
                screenPos.y = 0.9 * Math.sin(angle);
            }
            
            // Создаем индикатор
            const indicator = document.createElement('div');
            indicator.className = 'enemy-indicator';
            
            // Устанавливаем стиль индикатора
            indicator.style.position = 'absolute';
            indicator.style.width = '20px';
            indicator.style.height = '20px';
            indicator.style.borderRadius = '50%';
            
            // Цвет зависит от типа врага
            if (enemy.userData.type === ENEMY_TYPES.DESTROYER) {
                indicator.style.backgroundColor = 'rgba(0, 100, 255, 0.7)';
            } else if (enemy.userData.type === ENEMY_TYPES.SCOUT) {
                indicator.style.backgroundColor = 'rgba(0, 255, 100, 0.7)';
            } else {
                indicator.style.backgroundColor = 'rgba(255, 50, 0, 0.7)';
            }
            
            indicator.style.boxShadow = '0 0 10px ' + indicator.style.backgroundColor;
            
            // Преобразуем нормализованные координаты в пиксели
            const left = (screenPos.x + 1) / 2 * window.innerWidth;
            const top = (1 - screenPos.y) / 2 * window.innerHeight;
            
            indicator.style.left = (left - 10) + 'px'; // -10px для центрирования
            indicator.style.top = (top - 10) + 'px';   // -10px для центрирования
            
            // Добавляем пульсацию
            indicator.style.animation = 'pulse 1s infinite';
            
            // Добавляем расстояние до врага
            const distance = Math.round(enemy.position.distanceTo(player.position));
            indicator.title = `Enemy at distance ${distance} m`;
            
            // Добавляем индикатор в контейнер
            container.appendChild(indicator);
        }
    });
    
    // Добавляем стиль анимации, если его еще нет
    if (!document.getElementById('enemy-indicator-style')) {
        const style = document.createElement('style');
        style.id = 'enemy-indicator-style';
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(0.8); opacity: 0.7; }
                50% { transform: scale(1.2); opacity: 1; }
                100% { transform: scale(0.8); opacity: 0.7; }
            }
        `;
        document.head.appendChild(style);
    }
} 

// Функция для создания фрагмента данных
function createDataFragment(position) {
    console.log("Creating data fragment at position:", position);
    
    try {
        // Создаем группу для фрагмента данных
        const dataFragment = new THREE.Group();
        
        // Основа фрагмента (кристалл)
        const crystalGeometry = new THREE.OctahedronGeometry(1, 1); // Октаэдр для кристалла
        const crystal = new THREE.Mesh(crystalGeometry, dataFragmentMaterial);
        
        // Добавляем свечение кристалла
        const glowGeometry = new THREE.OctahedronGeometry(1.2, 1);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffdd44,
            transparent: true,
            opacity: 0.4
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        
        // Добавляем все части в группу
        dataFragment.add(crystal);
        dataFragment.add(glow);
        
        // Устанавливаем позицию
        dataFragment.position.copy(position);
        dataFragment.scale.setScalar(1.0);
        
        // Добавляем вращение для заметности
        dataFragment.userData.rotationSpeed = new THREE.Vector3(0.01, 0.02, 0.01);
        
        // Добавляем плавающее движение
        dataFragment.userData.floatSpeed = 0.5 + Math.random() * 0.5;
        dataFragment.userData.floatHeight = 0.5;
        dataFragment.userData.startY = position.y;
        dataFragment.userData.floatOffset = Math.random() * Math.PI * 2;
        
        // Добавляем свет к фрагменту для лучшей видимости
        const dataLight = new THREE.PointLight(0xffcc00, 2, 15);
        dataLight.position.set(0, 0, 0);
        dataFragment.add(dataLight);
        
        // Устанавливаем время жизни (30 секунд)
        dataFragment.userData.creationTime = clock.getElapsedTime();
        dataFragment.userData.lifespan = 60; // В секундах (увеличиваем время жизни для упрощения сбора)
        
        // Добавляем в сцену и массив
        scene.add(dataFragment);
        dataFragments.push(dataFragment);
        console.log("Data fragment created! Total fragments:", dataFragments.length);
        
        return dataFragment;
    } catch (error) {
        console.error("Error creating data fragment:", error);
        return null;
    }
}

// Функция создания UI для очков и прогресса миссии
function createScoreUI() {
    const scoreContainer = document.createElement('div');
    scoreContainer.id = 'score-container';
    scoreContainer.style.position = 'absolute';
    scoreContainer.style.top = '20px';
    scoreContainer.style.right = '20px';
    scoreContainer.style.display = 'flex';
    scoreContainer.style.flexDirection = 'column';
    scoreContainer.style.alignItems = 'flex-end';
    scoreContainer.style.zIndex = '9999';
    
    // Счетчик очков
    const scoreElement = document.createElement('div');
    scoreElement.id = 'score';
    scoreElement.style.fontSize = '24px';
    scoreElement.style.color = 'white';
    scoreElement.style.textShadow = '0 0 5px #00aaff';
    scoreElement.style.fontFamily = 'Arial, sans-serif';
    scoreElement.style.marginBottom = '5px';
    scoreElement.textContent = `Score: ${gameScore}`;
    
    // Индикатор уровня
    const levelElement = document.createElement('div');
    levelElement.id = 'level';
    levelElement.style.fontSize = '20px';
    levelElement.style.color = 'white';
    levelElement.style.textShadow = '0 0 5px #00ffaa';
    levelElement.style.fontFamily = 'Arial, sans-serif';
    levelElement.style.marginBottom = '5px';
    levelElement.textContent = `Level: ${currentLevel}/${maxLevel}`;
    
    // Индикатор прогресса миссии
    const missionContainer = document.createElement('div');
    missionContainer.style.width = '200px';
    missionContainer.style.display = 'flex';
    missionContainer.style.flexDirection = 'column';
    missionContainer.style.marginBottom = '10px';
    
    const missionLabel = document.createElement('div');
    missionLabel.style.color = 'white';
    missionLabel.style.fontSize = '16px';
    missionLabel.style.marginBottom = '5px';
    missionLabel.textContent = 'Mission Progress:';
    
    const missionProgressOuter = document.createElement('div');
    missionProgressOuter.style.width = '100%';
    missionProgressOuter.style.height = '15px';
    missionProgressOuter.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    missionProgressOuter.style.borderRadius = '10px';
    missionProgressOuter.style.overflow = 'hidden';
    
    const missionProgressInner = document.createElement('div');
    missionProgressInner.id = 'mission-progress';
    missionProgressInner.style.width = `${(dataCollected / missionObjective) * 100}%`;
    missionProgressInner.style.height = '100%';
    missionProgressInner.style.backgroundColor = '#ffcc00';
    missionProgressInner.style.borderRadius = '10px';
    missionProgressInner.style.transition = 'width 0.3s';
    
    const missionText = document.createElement('div');
    missionText.id = 'mission-text';
    missionText.style.color = 'white';
    missionText.style.fontSize = '14px';
    missionText.style.marginTop = '5px';
    missionText.style.textAlign = 'right';
    missionText.textContent = `Data: ${dataCollected}/${missionObjective}`;
    
    missionProgressOuter.appendChild(missionProgressInner);
    missionContainer.appendChild(missionLabel);
    missionContainer.appendChild(missionProgressOuter);
    missionContainer.appendChild(missionText);
    
    scoreContainer.appendChild(scoreElement);
    scoreContainer.appendChild(levelElement);
    scoreContainer.appendChild(missionContainer);
    
    document.body.appendChild(scoreContainer);
}

// Функция обновления UI счета и прогресса
function updateScoreUI() {
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        scoreElement.textContent = `Score: ${gameScore}`;
    }
    
    const levelElement = document.getElementById('level');
    if (levelElement) {
        levelElement.textContent = `Level: ${currentLevel}/${maxLevel}`;
    }
    
    // --- Обновление прогресса миссии в зависимости от типа ---
    const missionLabel = document.querySelector('#score-container div:nth-child(3) > div:nth-child(1)'); // Находим лейбл миссии
    const missionProgressOuter = document.querySelector('#score-container div:nth-child(3) > div:nth-child(2)'); // Находим внешний контейнер прогресса
    const missionProgressInner = document.getElementById('mission-progress');
    const missionText = document.getElementById('mission-text');

    if (!missionLabel || !missionProgressOuter || !missionProgressInner || !missionText) {
         console.warn("Mission UI elements not found for update!");
         return;
    }

    switch(missionType) {
        case 'collect_data':
            missionLabel.textContent = 'Mission Progress:';
            missionText.textContent = `Data: ${dataCollected}/${missionObjective}`; 
            const progressPercent = Math.min(100, (dataCollected / missionObjective) * 100);
            missionProgressInner.style.width = `${progressPercent}%`;
            missionProgressOuter.style.display = 'block'; // Показываем прогресс бар
            missionText.style.display = 'block'; // Показываем текст данных
            break;
        case 'flight_to_point':
            missionLabel.textContent = 'Objective:'; 
            missionText.textContent = 'Reach Extraction Point'; 
            missionProgressOuter.style.display = 'none'; // Скрываем прогресс бар
            missionText.style.display = 'block'; // Показываем текст цели
            break;
        case 'boss_fight':
            missionLabel.textContent = 'Objective:'; 
            missionText.textContent = 'Defeat the Mothership'; 
            missionProgressOuter.style.display = 'none'; // Скрываем прогресс бар
            missionText.style.display = 'block'; // Показываем текст цели
            // Индикатор здоровья босса обновляется отдельно
            break;
        default:
            missionLabel.textContent = 'Mission Progress:';
            missionText.textContent = 'Unknown Objective';
            missionProgressOuter.style.display = 'none'; // Скрываем прогресс бар
            missionText.style.display = 'block'; // Показываем текст
    }
    // --- Конец обновления прогресса миссии ---

    /* Старый код обновления прогресса (закомментирован) 
    const missionProgress = document.getElementById('mission-progress');
    if (missionProgress) {
        missionProgress.style.width = `${Math.min(100, (dataCollected / missionObjective) * 100)}%`;
    }
    
    const missionText = document.getElementById('mission-text');
    if (missionText) {
        missionText.textContent = `Data: ${dataCollected}/${missionObjective}`;
    }
    */
}

// Функция отображения вступления с сюжетом
function showMissionIntro() {
    const introOverlay = document.createElement('div');
    introOverlay.id = 'intro-overlay';
    introOverlay.style.position = 'fixed';
    introOverlay.style.top = '0';
    introOverlay.style.left = '0';
    introOverlay.style.width = '100%';
    introOverlay.style.height = '100%';
    introOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    introOverlay.style.zIndex = '9999';
    introOverlay.style.display = 'flex';
    introOverlay.style.flexDirection = 'column';
    introOverlay.style.justifyContent = 'center';
    introOverlay.style.alignItems = 'center';
    introOverlay.style.padding = '0 50px';
    // Добавляем overflow-y для скролла, если контент не помещается
    introOverlay.style.overflowY = 'auto'; 

    const titleElement = document.createElement('h1');
    titleElement.textContent = 'MISSION "RETURN"';
    titleElement.style.color = '#00aaff';
    titleElement.style.fontSize = '3rem';
    titleElement.style.marginBottom = '1rem';
    titleElement.style.fontFamily = 'Arial, sans-serif';
    titleElement.style.textAlign = 'center';
    titleElement.style.textShadow = '0 0 10px #00aaff';
    
    const storyContainer = document.createElement('div');
    storyContainer.style.width = '80%';
    storyContainer.style.maxWidth = '800px';
    storyContainer.style.backgroundColor = 'rgba(0, 20, 40, 0.7)';
    storyContainer.style.padding = '20px'; // Уменьшаем padding (было 30px)
    storyContainer.style.borderRadius = '10px';
    storyContainer.style.marginBottom = '20px'; // Уменьшаем нижний отступ (было 30px)
    storyContainer.style.boxShadow = '0 0 20px rgba(0, 170, 255, 0.5)';
    storyContainer.style.boxSizing = 'border-box'; // Добавляем box-sizing
    
    const storyText = document.createElement('p');
    storyText.innerHTML = `
        Year 2157. You are the pilot of the research vessel "Cosmo-1", on a secret mission.<br><br>
        During routine space exploration near the Orion constellation, your ship discovered
        traces of an ancient alien civilization that developed instant space travel technology.<br><br>
        After collecting some data, you fell into a trap - your ship ended up in an area controlled by hostile
        automated defense systems guarding this secret knowledge.<br><br>
        <strong>Your task:</strong> Collect the necessary data fragments, dodging asteroids and fighting
        enemy ships, to restore the complete technology and return home.
    `;
    storyText.style.color = 'white';
    storyText.style.fontSize = '1.1rem';
    storyText.style.lineHeight = '1.5';
    storyText.style.fontFamily = 'Arial, sans-serif';
    storyText.style.textAlign = 'justify';
    
    const missionObjectives = document.createElement('div');
    missionObjectives.innerHTML = `
        <h3>LEVEL 1 OBJECTIVES:</h3>
        <ul>
            <li>Collect ${missionObjective} data fragments</li>
            <li>Destroy enemy ships (fighters, destroyers, scouts)</li>
            <li>Avoid asteroid collisions</li>
            <li>Collect health packs to restore health</li>
        </ul>
    `;
    missionObjectives.style.color = '#ffcc00';
    missionObjectives.style.fontSize = '1.1rem';
    missionObjectives.style.lineHeight = '1.5';
    missionObjectives.style.fontFamily = 'Arial, sans-serif';
    missionObjectives.style.marginTop = '15px'; // Уменьшаем (было 20px)
    missionObjectives.style.marginBottom = '20px'; // Уменьшаем (было 30px)
    
    const controlsHelp = document.createElement('div');
    controlsHelp.innerHTML = `
        <h3>CONTROLS:</h3>
        <p>W, A, S, D - Ship movement</p>
        <p>Mouse - Camera control and aiming</p>
        <p>Left Mouse Button - Shoot</p> 
    `;
    controlsHelp.style.color = '#aaddff';
    controlsHelp.style.fontSize = '1rem';
    controlsHelp.style.lineHeight = '1.2';
    controlsHelp.style.fontFamily = 'Arial, sans-serif';
    controlsHelp.style.marginBottom = '20px'; // Уменьшаем (было 30px)
    
    const startButton = document.createElement('button');
    startButton.textContent = 'START MISSION';
    startButton.style.backgroundColor = '#00aaff';
    startButton.style.color = 'white';
    startButton.style.border = 'none';
    startButton.style.padding = '12px 40px'; // Уменьшаем вертикальный padding (было 15px)
    startButton.style.fontSize = '1.5rem';
    startButton.style.fontFamily = 'Arial, sans-serif';
    startButton.style.borderRadius = '5px';
    startButton.style.cursor = 'pointer';
    startButton.style.boxShadow = '0 0 15px rgba(0, 170, 255, 0.7)';
    startButton.style.transition = 'all 0.2s';
    startButton.style.boxSizing = 'border-box'; // Добавляем box-sizing
    
    startButton.onmouseover = function() {
        this.style.backgroundColor = '#22ccff';
        this.style.transform = 'scale(1.05)';
    };
    startButton.onmouseout = function() {
        this.style.backgroundColor = '#00aaff';
        this.style.transform = 'scale(1)';
    };
    
    startButton.onclick = function() {
        introOverlay.style.opacity = '0';
        introOverlay.style.transition = 'opacity 1s';
        gameStarted = true;
        
        // Удаляем интро через 1 секунду после начала исчезновения
        setTimeout(() => {
            document.body.removeChild(introOverlay);
            
            // Разблокируем управление камерой
            controls.lock();
        }, 1000);
    };
    
    storyContainer.appendChild(storyText);
    storyContainer.appendChild(missionObjectives);
    storyContainer.appendChild(controlsHelp);
    
    introOverlay.appendChild(titleElement);
    introOverlay.appendChild(storyContainer);
    introOverlay.appendChild(startButton);
    
    document.body.appendChild(introOverlay);
}

// Функция для отображения завершения уровня
function showLevelComplete() {
    // Устанавливаем флаг завершения уровня ЗДЕСЬ
    levelCompleted = true;
    // Разблокируем курсор
    controls.unlock(); 

    // Создаем оверлей с затемнением и сообщением о завершении уровня
    const levelCompleteOverlay = document.createElement('div');
    levelCompleteOverlay.id = 'level-complete-overlay';
    levelCompleteOverlay.style.position = 'absolute';
    levelCompleteOverlay.style.top = '0';
    levelCompleteOverlay.style.left = '0';
    levelCompleteOverlay.style.width = '100%';
    levelCompleteOverlay.style.height = '100%';
    levelCompleteOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    levelCompleteOverlay.style.display = 'flex';
    levelCompleteOverlay.style.flexDirection = 'column';
    levelCompleteOverlay.style.justifyContent = 'center';
    levelCompleteOverlay.style.alignItems = 'center';
    levelCompleteOverlay.style.zIndex = '9999';
    levelCompleteOverlay.style.color = 'white';
    levelCompleteOverlay.style.fontFamily = 'Arial, sans-serif';
    
    let levelCompleteHeading = document.createElement('h1');
    levelCompleteHeading.textContent = `LEVEL ${currentLevel} COMPLETE`;
    levelCompleteHeading.style.fontSize = '48px';
    levelCompleteHeading.style.marginBottom = '20px';
    levelCompleteHeading.style.textShadow = '0 0 10px #00ffff';
    
    let statsContainer = document.createElement('div');
    statsContainer.style.fontSize = '24px';
    statsContainer.style.marginBottom = '40px';
    statsContainer.style.textAlign = 'center';
    statsContainer.style.lineHeight = '1.5';
    
    // Статистика завершенного уровня
    let statsHTML = `
        <p>Enemies Destroyed: ${enemiesDefeated}</p>
        <p>Data Fragments Collected: ${dataCollected}</p>
        <p>Current Score: ${gameScore}</p>
    `;
    
    if (currentLevel === maxLevel) {
        statsHTML += `<p style="color: #ffcc00; font-size: 32px; margin-top: 20px;">GAME COMPLETED!</p>`;
    }
    
    statsContainer.innerHTML = statsHTML;
    
    // Кнопка для перехода на следующий уровень или завершения игры
    let nextButton = document.createElement('button');
    if (currentLevel < maxLevel) {
        nextButton.textContent = 'NEXT LEVEL';
    } else {
        nextButton.textContent = 'FINISH GAME';
    }
    
    nextButton.style.padding = '15px 30px';
    nextButton.style.fontSize = '24px';
    nextButton.style.backgroundColor = '#007bff';
    nextButton.style.color = 'white';
    nextButton.style.border = 'none';
    nextButton.style.borderRadius = '5px';
    nextButton.style.cursor = 'pointer';
    nextButton.style.transition = 'background-color 0.3s';
    
    nextButton.addEventListener('mouseover', function() {
        this.style.backgroundColor = '#0056b3';
    });
    
    nextButton.addEventListener('mouseout', function() {
        this.style.backgroundColor = '#007bff';
    });
    
    nextButton.addEventListener('click', function() {
        document.body.removeChild(levelCompleteOverlay);
        
        if (currentLevel < maxLevel) {
            // Увеличиваем уровень и сбрасываем показатели миссии
            currentLevel++;
            dataCollected = 0;
            enemiesDefeated = 0;
            levelCompleted = false;
            
            // Настраиваем новую миссию в зависимости от текущего уровня
            if (currentLevel === 2) {
                // На втором уровне - миссия по полету к точке
                missionType = 'flight_to_point';
                setupFlightMission();
                
                // Обновляем UI с информацией о новой миссии
                updateScoreUI();
            } else if (currentLevel === 3) {
                // На третьем уровне - битва с боссом
                missionType = 'boss_fight';
                setupBossMission();
                
                // Обновляем UI с информацией о новой миссии
                updateScoreUI();
            }
            
            // Возобновляем игру
            controls.lock();
        } else {
            // Если игра завершена, возвращаемся на начальный экран
            location.reload();
        }
    });
    
    levelCompleteOverlay.appendChild(levelCompleteHeading);
    levelCompleteOverlay.appendChild(statsContainer);
    levelCompleteOverlay.appendChild(nextButton);
    
    document.body.appendChild(levelCompleteOverlay);
} 

// Функция для показа описания текущей миссии
function showMissionDescription() {
    // Создаем оверлей для описания миссии
    const missionOverlay = document.createElement('div');
    missionOverlay.id = 'mission-overlay';
    missionOverlay.style.position = 'fixed';
    missionOverlay.style.top = '0';
    missionOverlay.style.left = '0';
    missionOverlay.style.width = '100%';
    missionOverlay.style.height = '100%';
    missionOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    missionOverlay.style.zIndex = '9999';
    missionOverlay.style.display = 'flex';
    missionOverlay.style.flexDirection = 'column';
    missionOverlay.style.justifyContent = 'center';
    missionOverlay.style.alignItems = 'center';
    missionOverlay.style.padding = '0 50px';
    
    const titleElement = document.createElement('h1');
    titleElement.textContent = `LEVEL ${currentLevel}: ${getMissionTitle()}`;
    titleElement.style.color = '#00aaff';
    titleElement.style.fontSize = '3rem';
    titleElement.style.marginBottom = '1rem';
    titleElement.style.fontFamily = 'Arial, sans-serif';
    titleElement.style.textAlign = 'center';
    titleElement.style.textShadow = '0 0 10px #00aaff';
    
    const descContainer = document.createElement('div');
    descContainer.style.width = '80%';
    descContainer.style.maxWidth = '800px';
    descContainer.style.backgroundColor = 'rgba(0, 20, 40, 0.7)';
    descContainer.style.padding = '30px';
    descContainer.style.borderRadius = '10px';
    descContainer.style.marginBottom = '30px';
    descContainer.style.boxShadow = '0 0 20px rgba(0, 170, 255, 0.5)';
    
    const descText = document.createElement('p');
    descText.innerHTML = getMissionDescription();
    descText.style.color = 'white';
    descText.style.fontSize = '1.1rem';
    descText.style.lineHeight = '1.5';
    descText.style.fontFamily = 'Arial, sans-serif';
    descText.style.textAlign = 'justify';
    
    const objectivesElement = document.createElement('div');
    objectivesElement.innerHTML = getMissionObjectives();
    objectivesElement.style.color = '#ffcc00';
    objectivesElement.style.fontSize = '1.1rem';
    objectivesElement.style.lineHeight = '1.5';
    objectivesElement.style.fontFamily = 'Arial, sans-serif';
    objectivesElement.style.marginTop = '20px';
    objectivesElement.style.marginBottom = '30px';
    
    const startButton = document.createElement('button');
    startButton.textContent = 'START MISSION';
    startButton.style.backgroundColor = '#00aaff';
    startButton.style.color = 'white';
    startButton.style.border = 'none';
    startButton.style.padding = '15px 40px';
    startButton.style.fontSize = '1.5rem';
    startButton.style.fontFamily = 'Arial, sans-serif';
    startButton.style.borderRadius = '5px';
    startButton.style.cursor = 'pointer';
    startButton.style.boxShadow = '0 0 15px rgba(0, 170, 255, 0.7)';
    startButton.style.transition = 'all 0.2s';
    
    startButton.onmouseover = function() {
        this.style.backgroundColor = '#22ccff';
        this.style.transform = 'scale(1.05)';
    };
    startButton.onmouseout = function() {
        this.style.backgroundColor = '#00aaff';
        this.style.transform = 'scale(1)';
    };
    
    startButton.onclick = function() {
        missionOverlay.style.opacity = '0';
        missionOverlay.style.transition = 'opacity 1s';
        
        // Удаляем оверлей через 1 секунду
        setTimeout(() => {
            document.body.removeChild(missionOverlay);
            controls.lock();
        }, 1000);
    };
    
    descContainer.appendChild(descText);
    descContainer.appendChild(objectivesElement);
    
    missionOverlay.appendChild(titleElement);
    missionOverlay.appendChild(descContainer);
    missionOverlay.appendChild(startButton);
    
    document.body.appendChild(missionOverlay);
}

// Получаем заголовок миссии
function getMissionTitle() {
    switch (missionType) {
        case 'collect_data':
            return 'DATA COLLECTION';
        case 'flight_to_point':
            return 'FLIGHT TO EXTRACTION POINT';
        case 'boss_fight':
            return 'FINAL SHOWDOWN';
        default:
            return 'MISSION';
    }
}

// Получаем описание миссии
function getMissionDescription() {
    switch (missionType) {
        case 'collect_data':
            if (currentLevel === 1) {
                return `
                    Year 2157. You are the pilot of the research vessel "Cosmo-1", on a secret mission.<br><br>
                    During routine space exploration near the Orion constellation, your ship discovered
                    traces of an ancient alien civilization that developed instant space travel technology.<br><br>
                    After collecting some data, you fell into a trap - your ship ended up in an area controlled by hostile
                    automated defense systems guarding this secret knowledge.<br><br>
                    <strong>Your task:</strong> Collect the necessary data fragments, dodging asteroids and fighting
                    enemy ships, to restore the complete technology and return home.
                `;
            } else {
                return `
                    After successfully escaping the defense systems, you need to gather more data about the travel technology.<br><br>
                    Your ship has detected signals indicating the presence of additional fragments of the ancient database.<br><br>
                    <strong>Your task:</strong> Collect more data fragments while fighting new waves of defense systems.
                    This data will allow you to finally decipher the ancient travel technology.
                `;
            }
        case 'flight_to_point':
            return `
                Having collected the first batch of data, you managed to activate an ancient beacon showing the path to an evacuation ship.<br><br>
                You have detected the signal of a rescue ship that will help you leave this dangerous area of space.<br><br>
                But to reach it, you need to fly through a dense asteroid cluster and past defense system patrols.<br><br>
                <strong>Your task:</strong> Reach the extraction point marked by the bright beacon. To do this, you need to fly
                through all obstacles and defense systems.
            `;
        case 'boss_fight':
            return `
                You have almost reached your goal and collected most of the necessary data, but suddenly your ship was detected
                by the main defense node - a huge mothership controlled by artificial intelligence.<br><br>
                This is the flagship of the defense system, which holds the last fragments of the travel technology.<br><br>
                <strong>Your task:</strong> Defeat the giant mothership, collect the remaining data fragments
                and complete your mission. This battle will be the toughest challenge!
            `;
        default:
            return "Mission description missing.";
    }
}

// Получаем задачи миссии
function getMissionObjectives() {
    switch (missionType) {
        case 'collect_data':
            return `
                <h3>MISSION OBJECTIVES:</h3>
                <ul>
                    <li>Collect ${missionObjective} data fragments</li>
                    <li>Destroy enemy ships (fighters, destroyers, scouts)</li>
                    <li>Avoid asteroid collisions</li>
                    <li>Collect health packs to restore health</li>
                </ul>
            `;
        case 'flight_to_point':
            return `
                <h3>MISSION OBJECTIVES:</h3>
                <ul>
                    <li>Reach the extraction point (marked by a bright beacon)</li>
                    <li>Avoid asteroid collisions</li>
                    <li>Destroy enemy ships along the way</li>
                    <li>Collect health packs to restore health</li>
                </ul>
            `;
        case 'boss_fight':
            return `
                <h3>MISSION OBJECTIVES:</h3>
                <ul>
                    <li>Destroy the Mothership (Boss)</li>
                    <li>Collect ${missionObjective} data fragments</li>
                    <li>Avoid the Mothership's powerful attacks</li>
                    <li>Collect health packs to restore health</li>
                </ul>
            `;
        default:
            return "<h3>MISSION OBJECTIVES MISSING</h3>";
    }
} 

// Функция настройки миссии полета
function setupFlightMission() {
    // Удаляем все существующие объекты с предыдущей миссии
    clearMissionObjects();
    
    // Создаем маяк - конечную точку для полета
    createWaypoint();
    
    // Создаем больше астероидов на пути к точке
    for (let i = 0; i < MAX_ASTEROIDS * 1.5; i++) {
        createAsteroid();
    }
    
    // Создаем врагов на пути
    for (let i = 0; i < MAX_ENEMIES; i++) {
        createEnemy();
    }
}

// Функция настройки миссии с боссом
function setupBossMission() {
    // Удаляем все существующие объекты с предыдущей миссии
    clearMissionObjects();
    
    // Создаем босса
    createBoss();
    
    // Создаем меньше астероидов для битвы с боссом
    for (let i = 0; i < MAX_ASTEROIDS / 2; i++) {
        createAsteroid();
    }
    
    // Создаем меньше обычных врагов
    for (let i = 0; i < MAX_ENEMIES / 2; i++) {
        createEnemy();
    }
    
    // Создаем индикатор здоровья босса
    createBossHealthBar();
}

// Функция очистки объектов миссии
function clearMissionObjects() {
    // Удаляем маяк, если он существует
    if (waypoint) {
        scene.remove(waypoint);
        waypoint = null;
    }
    
    // Удаляем босса, если он существует
    if (boss) {
        scene.remove(boss);
        boss = null;
    }
    
    // Удаляем все астероиды
    for (let i = asteroids.length - 1; i >= 0; i--) {
        scene.remove(asteroids[i]);
        asteroids.splice(i, 1);
    }
    
    // Удаляем всех врагов
    for (let i = aliens.length - 1; i >= 0; i--) {
        scene.remove(aliens[i]);
        aliens.splice(i, 1);
    }
    
    // Удаляем все лазеры
    for (let i = lasers.length - 1; i >= 0; i--) {
        scene.remove(lasers[i]);
        lasers.splice(i, 1);
    }
    
    for (let i = enemyLasers.length - 1; i >= 0; i--) {
        scene.remove(enemyLasers[i]);
        enemyLasers.splice(i, 1);
    }
    
    // Удаляем все аптечки
    for (let i = healthPacks.length - 1; i >= 0; i--) {
        scene.remove(healthPacks[i]);
        healthPacks.splice(i, 1);
    }
    
    // Удаляем все фрагменты данных
    for (let i = dataFragments.length - 1; i >= 0; i--) {
        scene.remove(dataFragments[i]);
        dataFragments.splice(i, 1);
    }
}

// Функция создания маяка (конечной точки)
function createWaypoint() {
    const distance = 2000; // Расстояние до конечной точки
    
    // Создаем группу для маяка
    waypoint = new THREE.Group();
    
    // Создаем яркий шар в центре
    const coreGeometry = new THREE.SphereGeometry(30, 32, 32);
    const coreMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00ffff, 
        emissive: 0x00ffff,
        emissiveIntensity: 2,
        shininess: 100
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    
    // Создаем внешнее свечение
    const glowGeometry = new THREE.SphereGeometry(50, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    
    // Создаем кольца вокруг маяка
    const ring1Geometry = new THREE.TorusGeometry(80, 5, 16, 100);
    const ring1Material = new THREE.MeshPhongMaterial({
        color: 0x00aaff,
        emissive: 0x0077aa,
        emissiveIntensity: 0.5
    });
    const ring1 = new THREE.Mesh(ring1Geometry, ring1Material);
    ring1.rotation.x = Math.PI / 2;
    
    const ring2Geometry = new THREE.TorusGeometry(100, 3, 16, 100);
    const ring2Material = new THREE.MeshPhongMaterial({
        color: 0x0077aa,
        emissive: 0x0077aa,
        emissiveIntensity: 0.3
    });
    const ring2 = new THREE.Mesh(ring2Geometry, ring2Material);
    ring2.rotation.x = Math.PI / 4;
    
    // Добавляем световой источник
    const light = new THREE.PointLight(0x00ffff, 3, 1000);
    
    // Добавляем все компоненты к группе
    waypoint.add(core);
    waypoint.add(glow);
    waypoint.add(ring1);
    waypoint.add(ring2);
    waypoint.add(light);
    
    // Позиционируем маяк впереди игрока на заданном расстоянии
    const playerPosition = camera.position.clone();
    const playerDirection = new THREE.Vector3();
    camera.getWorldDirection(playerDirection); // Получаем направление взгляда камеры

    // Рассчитываем позицию маяка: от позиции игрока + смещение вперед + небольшое смещение вверх
    const waypointPosition = playerPosition.add(playerDirection.multiplyScalar(distance));
    waypointPosition.y += 100; // Немного поднимаем маяк, чтобы он был лучше виден

    waypoint.position.copy(waypointPosition);
    
    // Добавляем анимацию вращения
    waypoint.userData.rotationSpeed = {
        ring1: 0.005,
        ring2: -0.007
    };
    
    // Добавляем маяк на сцену
    scene.add(waypoint);
    
    return waypoint;
}

// Функция создания босса
function createBoss() {
    // Создаем группу для босса
    boss = new THREE.Group();
    
    // Материалы для босса
    const bossBodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x330000,  // Темно-красный
        specular: 0x111111,
        shininess: 30,
        metalness: 0.8
    });
    
    const bossAccentMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x660000,  // Красный
        specular: 0x222222,
        shininess: 20
    });
    
    const bossGlowMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff0000,  // Ярко-красный
        emissive: 0xff0000,
        emissiveIntensity: 0.9,
        specular: 0xffffff
    });
    
    // Центральная часть (ядро) - большой шар
    const coreGeometry = new THREE.SphereGeometry(20, 32, 32);
    const core = new THREE.Mesh(coreGeometry, bossBodyMaterial);
    
    // Создаем кольцо вокруг ядра
    const ringGeometry = new THREE.TorusGeometry(30, 5, 16, 100);
    const ring = new THREE.Mesh(ringGeometry, bossAccentMaterial);
    ring.rotation.x = Math.PI / 2;
    
    // Создаем "панцирь" вокруг ядра из нескольких сегментов
    const armorSegmentCount = 8;
    for (let i = 0; i < armorSegmentCount; i++) {
        const angle = (i / armorSegmentCount) * Math.PI * 2;
        
        const segmentGeometry = new THREE.BoxGeometry(20, 40, 10);
        const segment = new THREE.Mesh(segmentGeometry, bossBodyMaterial);
        
        // Располагаем сегменты вокруг ядра
        segment.position.x = Math.cos(angle) * 30;
        segment.position.z = Math.sin(angle) * 30;
        
        // Поворачиваем сегменты, чтобы они "смотрели" от центра
        segment.rotation.y = -angle;
        
        boss.add(segment);
    }
    
    // Создаем турели (орудия) на поверхности
    const turretCount = 4;
    boss.userData.turrets = [];
    
    for (let i = 0; i < turretCount; i++) {
        const angle = (i / turretCount) * Math.PI * 2;
        
        // Основание турели
        const baseGeometry = new THREE.CylinderGeometry(3, 5, 5, 8);
        const base = new THREE.Mesh(baseGeometry, bossAccentMaterial);
        
        // Ствол турели
        const barrelGeometry = new THREE.CylinderGeometry(2, 2, 15, 8);
        barrelGeometry.rotateX(Math.PI / 2); // Поворачиваем, чтобы ствол смотрел вперед
        const barrel = new THREE.Mesh(barrelGeometry, bossAccentMaterial);
        barrel.position.z = -7.5;
        
        // Кончик ствола (светящийся)
        const tipGeometry = new THREE.CylinderGeometry(2.5, 0, 5, 8);
        tipGeometry.rotateX(Math.PI / 2);
        const tip = new THREE.Mesh(tipGeometry, bossGlowMaterial);
        tip.position.z = -15;
        
        // Группируем части турели
        const turret = new THREE.Group();
        turret.add(base);
        turret.add(barrel);
        turret.add(tip);
        
        // Позиционируем турель
        turret.position.x = Math.cos(angle) * 50;
        turret.position.z = Math.sin(angle) * 50;
        turret.position.y = Math.sin(angle) * 10; // Небольшой разброс по высоте
        
        // Сохраняем данные для турели
        turret.userData = {
            lastShotTime: 0,
            shootingCooldown: 2 + Math.random() * 3 // Случайное время перезарядки от 2 до 5 секунд
        };
        
        boss.add(turret);
        boss.userData.turrets.push(turret);
    }
    
    // Добавляем энергетическое ядро (светящийся шар в центре)
    const energyCoreGeometry = new THREE.SphereGeometry(10, 32, 32);
    const energyCore = new THREE.Mesh(energyCoreGeometry, bossGlowMaterial);
    boss.add(energyCore);
    
    // Добавляем свет из ядра
    const coreLight = new THREE.PointLight(0xff0000, 1.5, 200);
    boss.add(coreLight);
    
    // Задаем начальные параметры боссу
    boss.position.set(0, 100, -1000); // Располагаем вдалеке перед игроком
    boss.userData.health = bossMaxHealth;
    boss.userData.state = 'approach'; // Начальное состояние - приближение к игроку
    boss.userData.approachSpeed = 10;
    boss.userData.orbitSpeed = 0.2;
    boss.userData.orbitDistance = 300;
    boss.userData.orbitAngle = 0;
    boss.userData.attackCooldown = 0;
    
    // Сбрасываем здоровье босса
    bossHealth = bossMaxHealth;
    
    // Добавляем босса на сцену
    scene.add(boss);
    
    return boss;
}

// Функция создания индикатора здоровья босса
function createBossHealthBar() {
    bossHealthBar = document.createElement('div');
    bossHealthBar.id = 'boss-health-bar';
    bossHealthBar.style.position = 'absolute';
    bossHealthBar.style.top = '50px';
    bossHealthBar.style.left = '50%';
    bossHealthBar.style.transform = 'translateX(-50%)';
    bossHealthBar.style.width = '80%';
    bossHealthBar.style.maxWidth = '800px';
    bossHealthBar.style.height = '20px';
    bossHealthBar.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    bossHealthBar.style.border = '2px solid #990000';
    bossHealthBar.style.borderRadius = '10px';
    bossHealthBar.style.overflow = 'hidden';
    bossHealthBar.style.zIndex = '9999';
    
    const bossHealthFill = document.createElement('div');
    bossHealthFill.id = 'boss-health-fill';
    bossHealthFill.style.width = '100%';
    bossHealthFill.style.height = '100%';
    bossHealthFill.style.backgroundColor = '#ff0000';
    bossHealthFill.style.transition = 'width 0.3s';
    
    const bossNameLabel = document.createElement('div');
    bossNameLabel.textContent = 'MOTHERSHIP';
    bossNameLabel.style.position = 'absolute';
    bossNameLabel.style.top = '-25px';
    bossNameLabel.style.width = '100%';
    bossNameLabel.style.textAlign = 'center';
    bossNameLabel.style.color = '#ff0000';
    bossNameLabel.style.fontFamily = 'Arial, sans-serif';
    bossNameLabel.style.fontSize = '18px';
    bossNameLabel.style.fontWeight = 'bold';
    bossNameLabel.style.textShadow = '0 0 5px #ff0000';
    
    bossHealthBar.appendChild(bossHealthFill);
    bossHealthBar.appendChild(bossNameLabel);
    
    document.body.appendChild(bossHealthBar);
}

// Функция обновления индикатора здоровья босса
function updateBossHealthBar() {
    if (bossHealthBar && boss) {
        const healthPercent = (bossHealth / bossMaxHealth) * 100;
        const healthFill = document.getElementById('boss-health-fill');
        if (healthFill) {
            healthFill.style.width = `${healthPercent}%`;
            
            // Меняем цвет в зависимости от оставшегося здоровья
            if (healthPercent > 50) {
                healthFill.style.backgroundColor = '#ff0000';
            } else if (healthPercent > 25) {
                healthFill.style.backgroundColor = '#ff6600';
            } else {
                healthFill.style.backgroundColor = '#ffcc00';
            }
        }
    }
}

function update() {
    if (gameStarted && !gameOver && !levelCompleted) {
        const delta = clock.getDelta();
        
        // Обработка столкновений между лазерами игрока и астероидами/врагами
        handleLaserCollisions();
        
        // Обработка поведения врагов и их стрельбы
        handleEnemyAI(delta);
        
        // Обработка столкновений между игроком и астероидами/врагами/аптечками/фрагментами данных
        handlePlayerCollisions();
        
        // Обработка целей миссии в зависимости от её типа
        handleMissionObjectives();
        
        // Обновление позиций лазеров
        updateLasers(delta);
        
        // Вращение астероидов и дрейф
        rotateAsteroids(delta);
        
        // Обновление позиций аптечек и фрагментов данных (вращение для визуального эффекта)
        updateCollectableItems(delta);
        
        // Обновляем индикаторы врагов
        updateEnemyIndicators();
        
        // Если игрок нажимает на клавиши движения
        handlePlayerMovement(delta);
        
        // Обновляем позицию и поворот камеры
        controls.getObject().position.y += velocity.y * delta;
        
        // Проверка космических границ
        checkBoundaries();
    }
}

// Функция обработки целей миссии в зависимости от типа
function handleMissionObjectives() {
    switch(missionType) {
        case 'collect_data':
            // Если собрано достаточно данных, миссия завершена
            if (dataCollected >= missionObjective) {
                showLevelComplete();
            }
            break;
            
        case 'flight_to_point':
            // Проверяем, достиг ли игрок точки назначения
            if (waypoint) {
                const distanceToWaypoint = camera.position.distanceTo(waypoint.position);
                
                // !!! Отладочный вывод расстояния !!!
                console.log("Distance to waypoint:", distanceToWaypoint);

                // Если расстояние до точки назначения меньше определенного порога, миссия завершена
                if (distanceToWaypoint < 200) {
                    console.log("!!! Waypoint reached, calling showLevelComplete !!!");
                    endPointReached = true;
                    showLevelComplete();
                }
                
                // Анимируем маяк
                animateWaypoint(waypoint);
            }
            break;
            
        case 'boss_fight':
            // Обновляем поведение босса
            if (boss) {
                updateBoss();
                
                // Обновляем индикатор здоровья босса
                updateBossHealthBar();
                
                // Если здоровье босса достигло нуля, миссия завершена
                if (bossHealth <= 0) {
                    bossDefeated = true;
                    showLevelComplete();
                }
            }
            break;
    }
}

// Функция анимации маяка (точки назначения)
function animateWaypoint(waypoint) {
    // Вращаем кольца маяка
    const rings = waypoint.children.filter(child => child.geometry && child.geometry.type.includes('Torus'));
    if (rings.length >= 2) {
        rings[0].rotation.z += waypoint.userData.rotationSpeed.ring1;
        rings[1].rotation.z += waypoint.userData.rotationSpeed.ring2;
    }
    
    // Пульсирующий эффект
    const core = waypoint.children.find(child => child.geometry && child.geometry.type.includes('Sphere'));
    if (core) {
        // Пульсация размера
        const pulseFactor = Math.sin(Date.now() * 0.002) * 0.1 + 0.9;
        core.scale.set(pulseFactor, pulseFactor, pulseFactor);
        
        // Пульсация свечения
        if (core.material.emissiveIntensity) {
            core.material.emissiveIntensity = 1.5 + Math.sin(Date.now() * 0.003) * 0.5;
            core.material.needsUpdate = true;
        }
    }
    
    // Обновляем световой источник
    const light = waypoint.children.find(child => child.type === 'PointLight');
    if (light) {
        light.intensity = 2.5 + Math.sin(Date.now() * 0.002) * 0.5;
    }
}

// Функция обновления босса
function updateBoss() {
    if (!boss) return;
    
    // Получаем вектор от босса к игроку
    const bossToPlayer = new THREE.Vector3();
    bossToPlayer.subVectors(camera.position, boss.position);
    const distanceToPlayer = bossToPlayer.length();
    
    // В зависимости от состояния босса
    switch(boss.userData.state) {
        case 'approach':
            // Босс приближается к игроку, если слишком далеко
            if (distanceToPlayer > boss.userData.orbitDistance * 1.5) {
                const approachDirection = bossToPlayer.clone().normalize();
                boss.position.add(approachDirection.multiplyScalar(boss.userData.approachSpeed));
                
                // Поворачиваем босса к игроку
                boss.lookAt(camera.position);
            } else {
                // Когда достаточно близко, переходим к орбитальному движению
                boss.userData.state = 'orbit';
                boss.userData.orbitAngle = Math.random() * Math.PI * 2; // Случайный начальный угол
            }
            break;
            
        case 'orbit':
            // Босс орбитально вращается вокруг игрока
            boss.userData.orbitAngle += boss.userData.orbitSpeed;
            
            // Вычисляем новую позицию на орбите
            const orbitX = camera.position.x + Math.cos(boss.userData.orbitAngle) * boss.userData.orbitDistance;
            const orbitZ = camera.position.z + Math.sin(boss.userData.orbitAngle) * boss.userData.orbitDistance;
            const orbitY = camera.position.y + Math.sin(boss.userData.orbitAngle * 0.5) * 50 + 100;
            
            boss.position.set(orbitX, orbitY, orbitZ);
            
            // Поворачиваем босса к игроку
            boss.lookAt(camera.position);
            
            // Стреляем из турелей босса с заданной периодичностью
            boss.userData.attackCooldown -= 0.01;
            if (boss.userData.attackCooldown <= 0) {
                shootBossTurrets();
                boss.userData.attackCooldown = 0.1 + Math.random() * 0.2; // Случайная перезарядка
            }
            
            // Если здоровье босса меньше 25%, переходит в отчаянное состояние
            if (bossHealth < bossMaxHealth * 0.25 && boss.userData.state !== 'desperate') {
                boss.userData.state = 'desperate';
                boss.userData.orbitSpeed *= 1.5; // Увеличиваем скорость движения
            }
            break;
            
        case 'desperate':
            // Отчаянное состояние - босс движется быстрее и стреляет чаще
            boss.userData.orbitAngle += boss.userData.orbitSpeed;
            
            // Более хаотичное движение
            const desperateX = camera.position.x + Math.cos(boss.userData.orbitAngle) * (boss.userData.orbitDistance + Math.sin(Date.now() * 0.001) * 50);
            const desperateZ = camera.position.z + Math.sin(boss.userData.orbitAngle) * (boss.userData.orbitDistance + Math.sin(Date.now() * 0.001) * 50);
            const desperateY = camera.position.y + Math.sin(boss.userData.orbitAngle) * 70 + 120;
            
            boss.position.set(desperateX, desperateY, desperateZ);
            
            // Поворачиваем босса к игроку
            boss.lookAt(camera.position);
            
            // Стреляем чаще
            boss.userData.attackCooldown -= 0.02;
            if (boss.userData.attackCooldown <= 0) {
                shootBossTurrets();
                boss.userData.attackCooldown = 0.05 + Math.random() * 0.1; // Более быстрая перезарядка
            }
            break;
    }
    
    // Вращаем турели босса, чтобы они всегда смотрели на игрока
    if (boss.userData.turrets) {
        boss.userData.turrets.forEach(turret => {
            // Создаем мировую позицию турели
            const turretWorldPosition = new THREE.Vector3();
            turret.getWorldPosition(turretWorldPosition);
            
            // Вычисляем направление к игроку
            const directionToPlayer = new THREE.Vector3();
            directionToPlayer.subVectors(camera.position, turretWorldPosition);
            
            // Создаем новую точку, на которую должна смотреть турель
            const targetPosition = new THREE.Vector3().addVectors(turretWorldPosition, directionToPlayer);
            
            // Поворачиваем турель к игроку
            turret.lookAt(targetPosition);
        });
    }
}

// Функция стрельбы из турелей босса
function shootBossTurrets() {
    if (!boss || !boss.userData.turrets) return;
    
    // Выбираем случайное количество турелей для стрельбы
    const turretsToShoot = 1 + Math.floor(Math.random() * boss.userData.turrets.length);
    
    // Случайным образом выбираем турели
    const selectedTurrets = [];
    while (selectedTurrets.length < turretsToShoot && selectedTurrets.length < boss.userData.turrets.length) {
        const randomIndex = Math.floor(Math.random() * boss.userData.turrets.length);
        const turret = boss.userData.turrets[randomIndex];
        
        // Проверяем, не выбрали ли мы уже эту турель
        if (!selectedTurrets.includes(turret) && 
            Date.now() - turret.userData.lastShotTime > turret.userData.shootingCooldown * 1000) {
            selectedTurrets.push(turret);
        }
    }
    
    // Стреляем из выбранных турелей
    selectedTurrets.forEach(turret => {
        // Получаем мировую позицию турели
        const turretWorldPosition = new THREE.Vector3();
        turret.getWorldPosition(turretWorldPosition);
        
        // Направление к игроку с небольшим разбросом для сложности
        const directionToPlayer = new THREE.Vector3();
        directionToPlayer.subVectors(camera.position, turretWorldPosition);
        
        // Добавляем небольшой разброс
        directionToPlayer.x += (Math.random() - 0.5) * 5;
        directionToPlayer.y += (Math.random() - 0.5) * 5;
        directionToPlayer.z += (Math.random() - 0.5) * 5;
        
        directionToPlayer.normalize();
        
        // Создаем лазер босса
        createEnemyLaser(turretWorldPosition, directionToPlayer, ENEMY_LASER_SPEED * 1.2);
        
        // Обновляем время последнего выстрела
        turret.userData.lastShotTime = Date.now();
    });
} 