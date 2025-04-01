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

const asteroids = [];
const aliens = []; // Пока пустой, добавим позже
const lasers = [];

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
    // camera.position.set(0, 5, 15); // Возвращаем исходную позицию
    camera.position.set(0, 2, 5);

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
    const playerGeometry = new THREE.BoxGeometry(1, 1, 2);
    const playerMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
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

    const blocker = document.getElementById('info'); 
    const instructions = document.createElement('div');
    instructions.style.position = 'absolute';
    instructions.style.top = '50%';
    instructions.style.left = '50%';
    instructions.style.transform = 'translate(-50%, -50%)';
    instructions.style.fontSize = '20px';
    instructions.style.textAlign = 'center';
    instructions.style.cursor = 'pointer';
    instructions.innerHTML = 'Нажмите, чтобы начать управление';
    // Проверяем, есть ли уже такой элемент, чтобы не добавлять повторно
    if (!blocker.querySelector('div[style*="cursor: pointer"]')) {
        blocker.appendChild(instructions);
    }

    instructions.addEventListener('click', function () {
        controls.lock();
    });

    controls.addEventListener('lock', function () {
        instructions.style.display = 'none';
        blocker.style.display = 'none'; 
    });

    controls.addEventListener('unlock', function () {
        blocker.style.display = 'block';
        instructions.style.display = '';
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
            // case 'Space': 
            //     shootLaser();
            //     break;
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
    addAsteroids(50);

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

function addAsteroids(count) {
    // console.log(`Добавление ${count} астероидов...`); // Убираем логи
    const asteroidGeometry = new THREE.SphereGeometry(1, 8, 8); // Простая сфера для астероида
    const asteroidMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 }); // Серый

    for (let i = 0; i < count; i++) {
        const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
        // Размещаем астероиды случайно, но не слишком близко к старту
        const x = THREE.MathUtils.randFloatSpread(500) + (Math.random() < 0.5 ? -50 : 50); // Подальше по X
        const y = THREE.MathUtils.randFloatSpread(200);
        const z = THREE.MathUtils.randFloatSpread(500) + (Math.random() < 0.5 ? -50 : 50); // Подальше по Z

        asteroid.position.set(x, y, z);
        asteroid.scale.setScalar(THREE.MathUtils.randFloat(0.5, 5)); // Разный размер
        asteroid.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );

        // Добавляем простое движение (пока просто вращение)
        asteroid.userData.rotationSpeed = new THREE.Vector3(
            THREE.MathUtils.randFloat(-0.01, 0.01),
            THREE.MathUtils.randFloat(-0.01, 0.01),
            THREE.MathUtils.randFloat(-0.01, 0.01)
        );

        scene.add(asteroid);
        asteroids.push(asteroid);
    }
}

// Пока не реализовано
function shootLaser() {
    console.log("Стрельба!");
    // Логика создания и запуска лазера
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

    // Обновляем астероиды (вращение)
    asteroids.forEach(asteroid => {
        asteroid.rotation.x += asteroid.userData.rotationSpeed.x;
        asteroid.rotation.y += asteroid.userData.rotationSpeed.y;
        asteroid.rotation.z += asteroid.userData.rotationSpeed.z;
    });

    // --- Обновление PointerLock (раскомментировано) ---
    if (controls.isLocked === true) {
        // Затухание скорости
        velocity.x -= velocity.x * 5.0 * delta; // Уменьшим немного коэффициент затухания
        velocity.z -= velocity.z * 5.0 * delta;
        velocity.y -= velocity.y * 5.0 * delta; // Добавим затухание по Y
        
        // Векторы направления
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        camera.getWorldDirection(forward); // Направление взгляда камеры
        right.crossVectors(camera.up, forward).normalize(); // Вектор вправо от камеры

        // Обработка ввода
        const moveDirection = new THREE.Vector3();
        if (moveForward) moveDirection.add(forward);
        if (moveBackward) moveDirection.sub(forward);
        if (moveRight) moveDirection.add(right);
        if (moveLeft) moveDirection.sub(right);
        moveDirection.normalize(); // Нормализуем, чтобы диагональное движение не было быстрее

        const speed = 40.0; // Можно настроить скорость

        // Добавляем ускорение в направлении ввода
        velocity.addScaledVector(moveDirection, speed * delta);

        // Применяем общую скорость к позиции камеры
        controls.getObject().position.addScaledVector(velocity, delta);

        // --- Позиционируем корабль ПЕРЕД камерой (остается без изменений) --- 
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        const offset = cameraDirection.multiplyScalar(3).add(new THREE.Vector3(0, -0.5, 0));
        const targetPosition = new THREE.Vector3().copy(camera.position).add(offset);

        player.position.lerp(targetPosition, 0.1);
        
        const targetQuaternion = new THREE.Quaternion();
        const euler = new THREE.Euler(0, camera.rotation.y, 0, 'YXZ');
        targetQuaternion.setFromEuler(euler);
        player.quaternion.slerp(targetQuaternion, 0.1);
    }
   
    /* --- Обновляем OrbitControls (закомментировано) ---
    controls.update(); 
    */

    // Обновляем лазеры, врагов, столкновения...
    // ... (пока пусто) ...

    renderer.render(scene, camera);
} 