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
const healthPacks = []; // Массив для хранения аптечек

const asteroids = [];
const aliens = []; // Теперь будем использовать этот массив
const lasers = [];
let lastShotTime = 0; // Время последнего выстрела для перезарядки
const shootCooldown = 0.25; // Перезарядка в секундах (четверть секунды)
const MAX_ASTEROIDS = 50; // Максимальное количество астероидов на сцене
const ASTEROID_SPAWN_DISTANCE = 400; // Минимальное расстояние от центра для спавна
const MAX_ENEMIES = 12; // Увеличиваем максимальное количество врагов
const ENEMY_SPAWN_DISTANCE = 500; // Появляются чуть дальше астероидов
const ENEMY_SPEED = 20; // Скорость движения врага
const HEALTH_PACK_DROP_CHANCE = 0.8; // 80% шанс выпадения аптечки из астероида для тестирования

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
    startButton.textContent = 'НАЖМИТЕ, ЧТОБЫ НАЧАТЬ';
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
            Управление: WASD - движение, Мышь - поворот, Пробел - стрельба<br>
            Уничтожайте астероиды и вражеские корабли!
        </p>
    `;

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

    // --- Обработчик изменения размера окна ---
    window.addEventListener('resize', onWindowResize);
    // console.log("Завершение init()"); // Убираем логи
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
    const spawnRadius = ENEMY_SPAWN_DISTANCE + Math.random() * 200; // 500-700
    const angle = Math.random() * Math.PI * 2;
    const elevation = Math.random() * Math.PI - Math.PI / 2;

    const x = spawnRadius * Math.cos(angle) * Math.cos(elevation);
    const z = spawnRadius * Math.sin(angle) * Math.cos(elevation);
    const y = spawnRadius * Math.sin(elevation) + THREE.MathUtils.randFloatSpread(150);

    enemy.position.set(x, y, z);
    
    // Размер в зависимости от типа
    if (enemyType === ENEMY_TYPES.DESTROYER) {
        enemy.scale.setScalar(2.0); // Разрушители больше
    } else if (enemyType === ENEMY_TYPES.SCOUT) {
        enemy.scale.setScalar(1.2); // Разведчики меньше
    } else {
        enemy.scale.setScalar(1.5); // Стандартный размер для истребителей
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
        speed = ENEMY_SPEED * 0.6; // Медленнее
        rotationSpeed = THREE.MathUtils.randFloat(-0.01, 0.01); // Менее маневренный
        enemy.userData.health = 3; // У разрушителей больше жизней
    } else if (enemyType === ENEMY_TYPES.SCOUT) {
        speed = ENEMY_SPEED * 1.6; // Намного быстрее
        rotationSpeed = THREE.MathUtils.randFloat(-0.03, 0.03); // Очень маневренный
        enemy.userData.health = 1; // Хрупкие
    } else {
        speed = ENEMY_SPEED;
        rotationSpeed = THREE.MathUtils.randFloat(-0.02, 0.02);
        enemy.userData.health = 2; // Стандартное здоровье
    }
    
    enemy.userData.velocity = direction.multiplyScalar(speed);
    enemy.userData.rotationSpeed = rotationSpeed;
    
    // Добавляем поведенческие параметры
    enemy.userData.aggressiveness = Math.random(); // 0 - пассивный, 1 - агрессивный
    enemy.userData.lastShotTime = 0; // Время последнего выстрела
    enemy.userData.shootingCooldown = enemyType === ENEMY_TYPES.DESTROYER ? 3.0 : 
                                     (enemyType === ENEMY_TYPES.SCOUT ? 1.0 : 2.0); // Время перезарядки

    scene.add(enemy);
    aliens.push(enemy);
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
                console.log("Попадание в астероид! Шанс аптечки:", randValue, "< " + HEALTH_PACK_DROP_CHANCE);
                
                // С некоторым шансом создаем аптечку
                if (randValue < HEALTH_PACK_DROP_CHANCE) {
                    console.log("Выпала аптечка из астероида!");
                    createHealthPack(asteroid.position.clone());
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

                // TODO: Добавить эффект взрыва врага/счет очков

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

        // Простое движение вперед и легкий поворот
        enemy.position.addScaledVector(enemy.userData.velocity, delta);
        enemy.rotateY(enemy.userData.rotationSpeed * delta);

        // Обновляем вектор скорости после поворота (чтобы летели по новой траектории)
        enemy.getWorldDirection(enemy.userData.velocity); // Получаем новое локальное -Z направление
        enemy.userData.velocity.multiplyScalar(ENEMY_SPEED);

        // Удаляем врагов, улетевших слишком далеко (опционально)
        const maxEnemyDistance = 1200;
         if (enemy.position.length() > maxEnemyDistance) {
             scene.remove(enemy);
             aliens.splice(i, 1);
             continue; // Переходим к следующему врагу
         }

        // TODO: Добавить стрельбу врагов
        // TODO: Добавить столкновение врагов с игроком
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
        if (Math.random() < 0.01) { // Шанс 1% на спавн в кадр (можно настроить)
             createEnemy();
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
            console.log("Аптечка истекла по времени жизни");
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
                console.log("Игрок подобрал аптечку! Здоровье +1");
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

        // Простое движение вперед и легкий поворот
        enemy.position.addScaledVector(enemy.userData.velocity, delta);
        enemy.rotateY(enemy.userData.rotationSpeed * delta);

        // Обновляем вектор скорости после поворота (чтобы летели по новой траектории)
        enemy.getWorldDirection(enemy.userData.velocity); // Получаем новое локальное -Z направление
        enemy.userData.velocity.multiplyScalar(ENEMY_SPEED);

        // Удаляем врагов, улетевших слишком далеко (опционально)
        const maxEnemyDistance = 1200;
         if (enemy.position.length() > maxEnemyDistance) {
             scene.remove(enemy);
             aliens.splice(i, 1);
             continue; // Переходим к следующему врагу
         }

        // TODO: Добавить стрельбу врагов
        // TODO: Добавить столкновение врагов с игроком
    }

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
    gameOverText.textContent = 'ИГРА ОКОНЧЕНА';
    gameOverText.style.color = '#ff0000';
    gameOverText.style.fontSize = '4rem';
    gameOverText.style.marginBottom = '2rem';
    gameOverText.style.fontFamily = 'Arial, sans-serif';
    gameOverText.style.textShadow = '0 0 10px #ff0000';
    
    const restartButton = document.createElement('button');
    restartButton.textContent = 'НАЧАТЬ ЗАНОВО';
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
    console.log("Создание аптечки на позиции:", position);
    
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
        console.log("Аптечка создана! Всего аптечек:", healthPacks.length);
        
        return healthPack;
    } catch (error) {
        console.error("Ошибка при создании аптечки:", error);
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