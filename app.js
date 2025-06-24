// app.js (Stable version with working movement and Day/Night toggle)

import * as THREE from './libs/three/three.module.js';
import { GLTFLoader } from './libs/three/jsm/GLTFLoader.js';
import { DRACOLoader } from './libs/three/jsm/DRACOLoader.js';
import { Stats } from './libs/stats.module.js';
import { LoadingBar } from './libs/LoadingBar.js';
import { VRButton } from './libs/VRButton.js';
import { CanvasUI } from './libs/CanvasUI.js';
import { GazeController } from './libs/GazeController.js';
import { XRControllerModelFactory } from './libs/three/jsm/XRControllerModelFactory.js';

class App {
    constructor() {
        const container = document.createElement('div');
        document.body.appendChild(container);

        this.assetsPath = './assets/';
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 500);
        this.camera.position.set(0, 1.6, 0);

        this.dolly = new THREE.Object3D();
        this.dolly.position.set(0, 0, 10);
        this.dolly.add(this.camera);
        this.dummyCam = new THREE.Object3D();
        this.camera.add(this.dummyCam);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Day blue
        this.scene.add(this.dolly);

        this.ambientLight = new THREE.HemisphereLight(0xffffff, 0x888888, 0.8);
        this.scene.add(this.ambientLight);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        container.appendChild(this.renderer.domElement);

        window.addEventListener('resize', this.resize.bind(this));

        this.clock = new THREE.Clock();
        this.up = new THREE.Vector3(0, 1, 0);
        this.origin = new THREE.Vector3();
        this.workingVec3 = new THREE.Vector3();
        this.workingQuaternion = new THREE.Quaternion();
        this.raycaster = new THREE.Raycaster();

        this.stats = new Stats();
        container.appendChild(this.stats.dom);

        this.loadingBar = new LoadingBar();

        this.isDay = true;
        this.loadCollege();

        this.immersive = false;

        fetch('./college.json')
            .then(response => response.json())
            .then(obj => {
                this.boardShown = '';
                this.boardData = obj;
            });
    }

    toggleDayNight() {
        this.isDay = !this.isDay;
        this.scene.background = new THREE.Color(this.isDay ? 0x87ceeb : 0x000000);
        this.ambientLight.intensity = this.isDay ? 0.8 : 0.2;
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    loadCollege() {
        const loader = new GLTFLoader().setPath(this.assetsPath);
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('./libs/three/js/draco/');
        loader.setDRACOLoader(dracoLoader);

        loader.load('college.glb', gltf => {
            const college = gltf.scene.children[0];
            this.scene.add(college);

            college.traverse(child => {
                if (child.isMesh) {
                    if (child.name.includes("PROXY")) {
                        child.material.visible = false;
                        this.proxy = child;
                    }
                }
            });

            const door1 = college.getObjectByName("LobbyShop_Door__1_");
            const door2 = college.getObjectByName("LobbyShop_Door__2_");
            const pos = door1.position.clone().sub(door2.position).multiplyScalar(0.5).add(door2.position);
            const obj = new THREE.Object3D();
            obj.name = "LobbyShop";
            obj.position.copy(pos);
            college.add(obj);

            this.loadingBar.visible = false;
            this.setupXR();
        });
    }

    setupXR() {
        this.renderer.xr.enabled = true;
        new VRButton(this.renderer);

        this.controllers = this.buildControllers(this.dolly);

        this.controllers.forEach(controller => {
            controller.addEventListener('selectstart', () => controller.userData.selectPressed = true);
            controller.addEventListener('selectend', () => controller.userData.selectPressed = false);
        });

        const config = {
            panelSize: { height: 0.5 },
            height: 256,
            name: { fontSize: 50, height: 70 },
            info: { position: { top: 70, backgroundColor: "#ccc", fontColor: "#000" } }
        };
        const content = { name: "name", info: "info" };
        this.ui = new CanvasUI(content, config);
        this.scene.add(this.ui.mesh);

        // Toggle button
        this.toggleButton = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 32, 32),
            new THREE.MeshStandardMaterial({ color: 0xffff00 })
        );
        this.toggleButton.name = "ToggleButton";
        this.toggleButton.position.set(0.4, -0.3, -1);
        this.toggleButton.userData.interactive = true;
        this.toggleButton.callback = () => this.toggleDayNight();
        this.camera.add(this.toggleButton);

        this.renderer.setAnimationLoop(this.render.bind(this));
    }

    buildControllers(parent) {
        const controllerModelFactory = new XRControllerModelFactory();
        const controllers = [];

        for (let i = 0; i <= 1; i++) {
            const controller = this.renderer.xr.getController(i);
            controller.userData.selectPressed = false;
            parent.add(controller);
            controllers.push(controller);

            const grip = this.renderer.xr.getControllerGrip(i);
            grip.add(controllerModelFactory.createControllerModel(grip));
            parent.add(grip);
        }

        return controllers;
    }

    moveDolly(dt) {
        if (!this.proxy) return;

        const speed = 2;
        const wallLimit = 1.3;

        let pos = this.dolly.position.clone();
        pos.y += 1;

        const quaternion = this.dolly.quaternion.clone();
        this.dolly.quaternion.copy(this.dummyCam.getWorldQuaternion(this.workingQuaternion));

        const dir = new THREE.Vector3();
        this.dolly.getWorldDirection(dir);
        dir.negate();
        this.raycaster.set(pos, dir);

        let blocked = false;
        const intersect = this.raycaster.intersectObject(this.proxy);
        if (intersect.length > 0 && intersect[0].distance < wallLimit) blocked = true;

        if (!blocked) {
            this.dolly.translateZ(-dt * speed);
        }

        this.dolly.quaternion.copy(quaternion);
    }

    get selectPressed() {
        return this.controllers.some(c => c.userData.selectPressed);
    }

    render() {
        const dt = this.clock.getDelta();

        if (this.renderer.xr.isPresenting) {
            if (this.selectPressed) {
                this.moveDolly(dt);

                const dollyPos = this.dolly.getWorldPosition(new THREE.Vector3());
                let boardFound = false;

                if (this.boardData) {
                    Object.entries(this.boardData).forEach(([name, info]) => {
                        const obj = this.scene.getObjectByName(name);
                        if (obj) {
                            const pos = obj.getWorldPosition(new THREE.Vector3());
                            if (dollyPos.distanceTo(pos) < 3) {
                                boardFound = true;
                                if (this.boardShown !== name) {
                                    this.ui.position.copy(pos).add(this.workingVec3.set(0, 1.3, 0));
                                    this.ui.updateElement('name', info.name);
                                    this.ui.updateElement('info', info.info);
                                    this.ui.update();
                                    this.ui.lookAt(this.dummyCam.getWorldPosition(new THREE.Vector3()));
                                    this.ui.visible = true;
                                    this.boardShown = name;
                                }
                            }
                        }
                    });
                }

                if (!boardFound) {
                    this.boardShown = "";
                    this.ui.visible = false;
                }
            }
        }

        this.stats.update();
        this.renderer.render(this.scene, this.camera);
    }
}

export { App };
