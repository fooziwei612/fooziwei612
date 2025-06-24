// app.js (with Day/Night Toggle Button Added)

import * as THREE from './libs/three/three.module.js';
import { GLTFLoader } from './libs/three/jsm/GLTFLoader.js';
import { DRACOLoader } from './libs/three/jsm/DRACOLoader.js';
import { RGBELoader } from './libs/three/jsm/RGBELoader.js';
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
        this.scene.add(this.dolly);

        const ambient = new THREE.HemisphereLight(0xFFFFFF, 0xAAAAAA, 0.8);
        this.scene.add(ambient);
        this.ambientLight = ambient;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        container.appendChild(this.renderer.domElement);

        this.setEnvironment();

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

    setEnvironment() {
        const loader = new RGBELoader().setDataType(THREE.UnsignedByteType);
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();

        loader.load('./assets/hdr/venice_sunset_1k.hdr', texture => {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            pmremGenerator.dispose();
            this.scene.environment = envMap;
            texture.dispose();
        });
    }

    toggleDayNight() {
        this.isDay = !this.isDay;
        const hdrPath = this.isDay
            ? './assets/hdr/venice_sunset_1k.hdr'
            : './assets/hdr/night_street_01_1k.hdr';

        const hdrLoader = new RGBELoader().setDataType(THREE.UnsignedByteType);
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();

        hdrLoader.load(hdrPath, texture => {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            pmremGenerator.dispose();
            this.scene.environment = envMap;
            texture.dispose();
        });

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
                    } else if (child.material.name.includes('Glass')) {
                        child.material.opacity = 0.1;
                        child.material.transparent = true;
                    } else if (child.material.name.includes("SkyBox")) {
                        const mat1 = child.material;
                        const mat2 = new THREE.MeshBasicMaterial({ map: mat1.map });
                        child.material = mat2;
                        mat1.dispose();
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
        const btn = new VRButton(this.renderer);

        const timeoutId = setTimeout(() => {
            this.useGaze = true;
            this.gazeController = new GazeController(this.scene, this.dummyCam);
        }, 2000);

        this.controllers = this.buildControllers(this.dolly);
        this.controllers.forEach(controller => {
            controller.addEventListener('selectstart', () => controller.userData.selectPressed = true);
            controller.addEventListener('selectend', () => controller.userData.selectPressed = false);
            controller.addEventListener('connected', () => clearTimeout(timeoutId));
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

        // Add Day/Night Button
        this.toggleButton = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 32, 32),
            new THREE.MeshStandardMaterial({ color: 0xffff00 })
        );
        this.toggleButton.name = "ToggleButton";
        this.toggleButton.position.set(0, 1.5, -2);
        this.camera.add(this.toggleButton);

        this.renderer.setAnimationLoop(this.render.bind(this));
    }

    buildControllers(parent = this.scene) {
        const controllerModelFactory = new XRControllerModelFactory();
        const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
        const line = new THREE.Line(geometry);
        line.scale.z = 0;

        const controllers = [];
        for (let i = 0; i <= 1; i++) {
            const controller = this.renderer.xr.getController(i);
            controller.add(line.clone());
            controller.userData.selectPressed = false;
            parent.add(controller);
            controllers.push(controller);

            const grip = this.renderer.xr.getControllerGrip(i);
            grip.add(controllerModelFactory.createControllerModel(grip));
            parent.add(grip);
        }
        return controllers;
    }

    render() {
        const dt = this.clock.getDelta();

        if (this.renderer.xr.isPresenting) {
            if ((this.useGaze && this.gazeController?.mode === GazeController.Modes.MOVE) || this.selectPressed) {
                this.moveDolly(dt);
                const dollyPos = this.dolly.getWorldPosition(new THREE.Vector3());
                let boardFound = false;
                Object.entries(this.boardData || {}).forEach(([name, info]) => {
                    const obj = this.scene.getObjectByName(name);
                    if (obj && dollyPos.distanceTo(obj.getWorldPosition(new THREE.Vector3())) < 3) {
                        boardFound = true;
                        if (this.boardShown !== name) this.showInfoboard(name, info, obj.position);
                    }
                });
                if (!boardFound && this.ui) this.ui.visible = false;
            }
        }

        // Toggle Button Raycast
        this.controllers?.forEach(controller => {
            if (controller.userData.selectPressed) {
                const tempMatrix = new THREE.Matrix4().identity().extractRotation(controller.matrixWorld);
                this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
                this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
                const intersects = this.raycaster.intersectObject(this.toggleButton);
                if (intersects.length > 0) this.toggleDayNight();
            }
        });

        if (this.immersive !== this.renderer.xr.isPresenting) {
            this.resize();
            this.immersive = this.renderer.xr.isPresenting;
        }

        this.stats.update();
        this.renderer.render(this.scene, this.camera);
    }
}

export { App };
