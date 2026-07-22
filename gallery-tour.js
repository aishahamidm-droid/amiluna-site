import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { buildPublicAssetUrl } from "./site-runtime.js";

const canvas = document.getElementById("gallery-tour-canvas");
const titleEl = document.getElementById("tour-step-title");
const captionEl = document.getElementById("tour-step-caption");
const outlineEl = document.getElementById("tour-outline");
const toggleBtn = document.getElementById("tour-toggle");
const restartBtn = document.getElementById("tour-restart");
const audioToggleBtn = document.getElementById("tour-audio-toggle");
const audioEl = document.getElementById("gallery-tour-audio");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x131919);
scene.fog = new THREE.Fog(0x131919, 28, 62);

const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
camera.position.set(0, 5.7, 18.4);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

function getPixelRatio() {
  return Math.min(window.devicePixelRatio || 1, 1.35);
}

function resizeRenderer() {
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(getPixelRatio());
  renderer.setSize(width, height, false);
}

const world = new THREE.Group();
scene.add(world);
RectAreaLightUniformsLib.init();

const textureLoader = new THREE.TextureLoader();

function loadTexture(path, repeatX = 1, repeatY = 1) {
  const texture = textureLoader.load(buildPublicAssetUrl(path));
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const woodColor = loadTexture("hero/textures/wood/color.jpg", 8, 12);
const woodNormal = loadTexture("hero/textures/wood/normal.jpg", 8, 12);
const woodRough = loadTexture("hero/textures/wood/rough.jpg", 8, 12);
const wallTexture = loadTexture("hero/textures/wall/wall.jpg", 1.4, 0.8);

const wallMat = new THREE.MeshStandardMaterial({
  map: wallTexture,
  color: 0xe6e1d9,
  roughness: 0.96,
  metalness: 0.02
});

const softWallMat = new THREE.MeshStandardMaterial({
  map: wallTexture,
  color: 0xd9d4cc,
  roughness: 0.97,
  metalness: 0.02
});

const floorMat = new THREE.MeshStandardMaterial({
  map: woodColor,
  normalMap: woodNormal,
  roughnessMap: woodRough,
  roughness: 0.72,
  metalness: 0.04
});

const ceilingMat = new THREE.MeshStandardMaterial({
  color: 0x575d54,
  roughness: 0.95,
  metalness: 0.01
});

const trimMat = new THREE.MeshStandardMaterial({
  color: 0xe7e2d9,
  roughness: 0.78,
  metalness: 0.03
});

const darkFrameMat = new THREE.MeshStandardMaterial({
  color: 0x25272b,
  roughness: 0.4,
  metalness: 0.16
});

const lightFrameMat = new THREE.MeshStandardMaterial({
  color: 0x9f8d77,
  roughness: 0.45,
  metalness: 0.14
});

const ambient = new THREE.AmbientLight(0xffffff, 0.28);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0xffffff, 0x667067, 0.34);
scene.add(hemi);

const windowLight = new THREE.DirectionalLight(0xffffff, 0.24);
windowLight.position.set(7, 15, 10);
windowLight.castShadow = true;
windowLight.shadow.mapSize.width = 1024;
windowLight.shadow.mapSize.height = 1024;
windowLight.shadow.camera.left = -22;
windowLight.shadow.camera.right = 22;
windowLight.shadow.camera.top = 18;
windowLight.shadow.camera.bottom = -18;
scene.add(windowLight);

const ceilingBounce = new THREE.RectAreaLight(0xffffff, 1.4, 16, 12);
ceilingBounce.position.set(0, 9.4, 0);
ceilingBounce.rotation.x = Math.PI;
scene.add(ceilingBounce);

const roomW = 28;
const roomH = 9.8;
const roomD = 32;

function addBox(w, h, d, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  world.add(mesh);
  return mesh;
}

addBox(roomW, 0.22, roomD, 0, -0.11, 0, floorMat);
addBox(roomW, 0.2, roomD, 0, roomH, 0, ceilingMat);

for (let i = -11.5; i <= 11.5; i += 2.3) {
  const seam = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.003, roomD - 1.2),
    new THREE.MeshStandardMaterial({
      color: 0x876650,
      roughness: 0.82,
      metalness: 0.01,
      transparent: true,
      opacity: 0.18
    })
  );
  seam.position.set(i, 0.004, 0);
  seam.receiveShadow = true;
  world.add(seam);
}

const backWallZ = -roomD / 2;
const longWindowW = 23;
const longWindowH = 8.2;
const longWindowY = 4.8;

addBox((roomW - longWindowW) / 2, roomH, 0.24, -(longWindowW / 2 + (roomW - longWindowW) / 4), roomH / 2, backWallZ, wallMat);
addBox((roomW - longWindowW) / 2, roomH, 0.24, longWindowW / 2 + (roomW - longWindowW) / 4, roomH / 2, backWallZ, wallMat);
addBox(longWindowW, roomH - (longWindowY + longWindowH / 2), 0.24, 0, longWindowY + longWindowH / 2 + (roomH - (longWindowY + longWindowH / 2)) / 2, backWallZ, wallMat);
addBox(longWindowW, longWindowY - longWindowH / 2, 0.24, 0, (longWindowY - longWindowH / 2) / 2, backWallZ, wallMat);
addBox(0.24, roomH, roomD, -roomW / 2, roomH / 2, 0, wallMat);
addBox(0.24, roomH, roomD, roomW / 2, roomH / 2, 0, wallMat);
addBox(8.5, roomH, 0.24, -9.75, roomH / 2, roomD / 2, wallMat);
addBox(8.5, roomH, 0.24, 9.75, roomH / 2, roomD / 2, wallMat);
addBox(8.5, 2.1, 0.24, 0, roomH - 1.05, roomD / 2, wallMat);
addBox(12.0, 10.35, 0.28, 0, 3.625, -8.2, softWallMat);

addBox(roomW, 0.12, 0.11, 0, 0.06, -roomD / 2 + 0.055, trimMat);
addBox(roomW, 0.12, 0.11, 0, 0.06, roomD / 2 - 0.055, trimMat);

const leftTrim = addBox(roomD, 0.12, 0.11, -roomW / 2 + 0.055, 0.06, 0, trimMat);
leftTrim.rotation.y = Math.PI / 2;

const rightTrim = addBox(roomD, 0.12, 0.11, roomW / 2 - 0.055, 0.06, 0, trimMat);
rightTrim.rotation.y = Math.PI / 2;

function addLongWindow(x, y, z, w, h) {
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xe6e0d6,
    roughness: 0.82,
    metalness: 0.03
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xc7e3e1,
    transparent: true,
    opacity: 0.14,
    transmission: 0.96,
    roughness: 0.06,
    metalness: 0,
    ior: 1.5,
    thickness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.04
  });

  const pieces = [
    new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.12), frameMat),
    new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.12), frameMat),
    new THREE.Mesh(new THREE.BoxGeometry(0.14, h, 0.12), frameMat),
    new THREE.Mesh(new THREE.BoxGeometry(0.14, h, 0.12), frameMat)
  ];

  pieces[0].position.set(x, y + h / 2 - 0.07, z);
  pieces[1].position.set(x, y - h / 2 + 0.07, z);
  pieces[2].position.set(x - w / 2 + 0.07, y, z);
  pieces[3].position.set(x + w / 2 - 0.07, y, z);
  pieces.forEach((mesh) => world.add(mesh));

  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.24, h - 0.24), glassMat);
  glass.position.set(x, y, z + 0.03);
  world.add(glass);

  const mullionMat = new THREE.MeshStandardMaterial({
    color: 0xe1dbd1,
    roughness: 0.8,
    metalness: 0.03
  });

  const mullion1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, h - 0.24, 0.05), mullionMat);
  mullion1.position.set(x - w / 4, y, z + 0.02);
  world.add(mullion1);

  const mullion2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, h - 0.24, 0.05), mullionMat);
  mullion2.position.set(x + w / 4, y, z + 0.02);
  world.add(mullion2);

  const mullionH = new THREE.Mesh(new THREE.BoxGeometry(w - 0.24, 0.08, 0.05), mullionMat);
  mullionH.position.set(x, y, z + 0.02);
  world.add(mullionH);
}

addLongWindow(0, longWindowY, -15.9, longWindowW, longWindowH);

const skyCanvas = document.createElement("canvas");
skyCanvas.width = 1024;
skyCanvas.height = 512;
const skyCtx = skyCanvas.getContext("2d");
const skyGrad = skyCtx.createLinearGradient(0, 0, 0, skyCanvas.height);
skyGrad.addColorStop(0, "#b8d8e8");
skyGrad.addColorStop(0.45, "#dbeef4");
skyGrad.addColorStop(1, "#edf6fa");
skyCtx.fillStyle = skyGrad;
skyCtx.fillRect(0, 0, skyCanvas.width, skyCanvas.height);
for (let i = 0; i < 6; i += 1) {
  skyCtx.fillStyle = "rgba(255,255,255,0.18)";
  skyCtx.beginPath();
  skyCtx.ellipse(150 + i * 140, 100 + (i % 2) * 40, 110, 28, 0, 0, Math.PI * 2);
  skyCtx.fill();
}
const skyTexture = new THREE.CanvasTexture(skyCanvas);
skyTexture.colorSpace = THREE.SRGBColorSpace;
const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 16),
  new THREE.MeshBasicMaterial({ map: skyTexture })
);
backdrop.position.set(0, 10, -26);
scene.add(backdrop);

function createArtwork({ width, height, texturePath, frame = "dark" }) {
  const group = new THREE.Group();
  const artTexture = textureLoader.load(buildPublicAssetUrl(texturePath));
  artTexture.colorSpace = THREE.SRGBColorSpace;

  const outer = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.15, height + 0.15, 0.11),
    frame === "light" ? lightFrameMat : darkFrameMat
  );
  outer.castShadow = true;
  outer.receiveShadow = true;
  group.add(outer);

  const mount = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.02, height + 0.02, 0.045),
    new THREE.MeshStandardMaterial({
      color: 0xf5f3ef,
      roughness: 0.95,
      metalness: 0.01
    })
  );
  mount.position.z = 0.01;
  group.add(mount);

  const art = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({
      map: artTexture,
      roughness: 0.9,
      metalness: 0.02,
      emissive: 0xffffff,
      emissiveMap: artTexture,
      emissiveIntensity: 0.13
    })
  );
  art.position.z = 0.065;
  group.add(art);

  return group;
}

const leftWallArt1 = createArtwork({ width: 4.8, height: 6.5, texturePath: "artworks/AAA7.jpg", frame: "dark" });
leftWallArt1.position.set(-13.85, 4.8, -9.0);
leftWallArt1.rotation.y = Math.PI / 2;
world.add(leftWallArt1);

const leftWallArt2 = createArtwork({ width: 5.0, height: 5.0, texturePath: "artworks/AAA4.jpg", frame: "light" });
leftWallArt2.position.set(-13.85, 5.0, -1.5);
leftWallArt2.rotation.y = Math.PI / 2;
world.add(leftWallArt2);

const leftWallArt3 = createArtwork({ width: 4.8, height: 6.5, texturePath: "artworks/AAA6.jpg", frame: "dark" });
leftWallArt3.position.set(-13.85, 4.8, 5.3);
leftWallArt3.rotation.y = Math.PI / 2;
world.add(leftWallArt3);

const rightWallArt1 = createArtwork({ width: 4.8, height: 6.5, texturePath: "artworks/AAA3.jpg", frame: "dark" });
rightWallArt1.position.set(13.85, 4.8, -9.0);
rightWallArt1.rotation.y = -Math.PI / 2;
world.add(rightWallArt1);

const rightWallArt2 = createArtwork({ width: 5.5, height: 4.5, texturePath: "artworks/AAA1.jpg", frame: "light" });
rightWallArt2.position.set(13.85, 5.0, -1.5);
rightWallArt2.rotation.y = -Math.PI / 2;
world.add(rightWallArt2);

const rightWallArt3 = createArtwork({ width: 4.8, height: 6.5, texturePath: "artworks/AAA5.jpg", frame: "dark" });
rightWallArt3.position.set(13.85, 4.8, 5.3);
rightWallArt3.rotation.y = -Math.PI / 2;
world.add(rightWallArt3);

const centerArt = createArtwork({ width: 6.5, height: 6.5, texturePath: "artworks/AAA2.jpg", frame: "dark" });
centerArt.position.set(0, 4.8, -8.02);
world.add(centerArt);

function addCenterWallSconce(x) {
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xfff2dc,
    emissive: 0xffe6b3,
    emissiveIntensity: 2.2,
    roughness: 0.25,
    metalness: 0.05,
    transparent: true,
    opacity: 0.9
  });

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x9f8d77,
    roughness: 0.35,
    metalness: 0.7
  });

  const group = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.08), metalMat);
  const topGlass = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.35), glassMat);
  const bottomGlass = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.35), glassMat);
  topGlass.position.set(0, 0.45, 0.2);
  bottomGlass.position.set(0, -0.45, 0.2);
  group.add(plate, topGlass, bottomGlass);
  group.position.set(x, 4.9, -8.05);
  world.add(group);

  const glow = new THREE.PointLight(0xfff2dc, 4.5, 4);
  glow.position.set(x, 4.9, -7.8);
  scene.add(glow);
}

addCenterWallSconce(-5.0);
addCenterWallSconce(5.0);

function addTrackLight({ x, zPositions, targetX, targetYPositions }) {
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x2f3135,
    roughness: 0.58,
    metalness: 0.18
  });

  const headMat = new THREE.MeshStandardMaterial({
    color: 0x232529,
    roughness: 0.52,
    metalness: 0.22
  });

  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, roomD - 4), railMat);
  rail.position.set(x, roomH - 0.06, 0);
  world.add(rail);

  zPositions.forEach((z, index) => {
    const targetY = targetYPositions[index];
    [-0.55, 0.55].forEach((offset) => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 12), headMat);
      stem.position.set(x, roomH - 0.16, z + offset);
      world.add(stem);

      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.22, 18), headMat);
      head.rotation.z = Math.PI / 2;
      head.position.set(x, roomH - 0.27, z + offset);
      world.add(head);

      const areaLight = new THREE.RectAreaLight(0xfff2dc, 10, 1.2, 2.0);
      areaLight.position.set(x, roomH - 0.35, z + offset);
      areaLight.lookAt(targetX, targetY, z);
      scene.add(areaLight);
    });
  });
}

addTrackLight({ x: -12.7, zPositions: [-9.0, -1.5, 5.3], targetX: -13.2, targetYPositions: [4.8, 5.0, 4.8] });
addTrackLight({ x: 12.7, zPositions: [-9.0, -1.5, 5.3], targetX: 13.2, targetYPositions: [4.8, 5.0, 4.8] });

const dustGeo = new THREE.BufferGeometry();
const dustCount = 44;
const dustPositions = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i += 1) {
  dustPositions[i * 3] = (Math.random() - 0.5) * 18;
  dustPositions[i * 3 + 1] = 1 + Math.random() * 7;
  dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 24;
}
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
const dust = new THREE.Points(
  dustGeo,
  new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.03,
    transparent: true,
    opacity: 0.14
  })
);
scene.add(dust);

const sequence = [
  {
    key: "entrance",
    title: "Entrance",
    caption: "Starting at the entrance before the camera leans toward the left wall collection.",
    position: new THREE.Vector3(0, 5.8, 18.5),
    target: new THREE.Vector3(0, 4.6, -5.6),
    duration: 3.0
  },
  {
    key: "left-one",
    title: "Artwork 1",
    caption: "The first left wall piece comes forward with a gentle zoom in and release.",
    position: new THREE.Vector3(-8.6, 5.15, -11.6),
    target: new THREE.Vector3(-13.85, 4.8, -9.0),
    duration: 2.1
  },
  {
    key: "left-one",
    title: "Artwork 1",
    caption: "Holding close on the first piece before pulling back toward the next stop.",
    position: new THREE.Vector3(-11.45, 5.0, -9.9),
    target: new THREE.Vector3(-13.85, 4.8, -9.0),
    duration: 1.8
  },
  {
    key: "left-two",
    title: "Artwork 2",
    caption: "Sliding down the left wall to the second work for the same close-in pause.",
    position: new THREE.Vector3(-8.2, 5.05, -1.55),
    target: new THREE.Vector3(-13.85, 5.0, -1.5),
    duration: 2.1
  },
  {
    key: "left-two",
    title: "Artwork 2",
    caption: "A tighter look at the second piece before easing out again.",
    position: new THREE.Vector3(-11.1, 5.0, -1.55),
    target: new THREE.Vector3(-13.85, 5.0, -1.5),
    duration: 1.8
  },
  {
    key: "left-three",
    title: "Artwork 3",
    caption: "The third left wall piece gets the same slow cinematic rise and retreat.",
    position: new THREE.Vector3(-8.45, 5.15, 5.15),
    target: new THREE.Vector3(-13.85, 4.8, 5.3),
    duration: 2.1
  },
  {
    key: "left-three",
    title: "Artwork 3",
    caption: "The camera settles in close, then backs away to prepare the cross-room move.",
    position: new THREE.Vector3(-11.25, 5.0, 5.15),
    target: new THREE.Vector3(-13.85, 4.8, 5.3),
    duration: 1.8
  },
  {
    key: "right-one",
    title: "Artwork 4",
    caption: "Crossing to the right wall, the first piece is framed from the room edge.",
    position: new THREE.Vector3(8.8, 5.1, -11.6),
    target: new THREE.Vector3(13.85, 4.8, -9.0),
    duration: 2.5
  },
  {
    key: "right-one",
    title: "Artwork 4",
    caption: "A closer look on the right side before the tour keeps moving.",
    position: new THREE.Vector3(11.6, 5.0, -9.9),
    target: new THREE.Vector3(13.85, 4.8, -9.0),
    duration: 1.8
  },
  {
    key: "right-two",
    title: "Artwork 5",
    caption: "The second right wall work is approached with the same in-and-out motion.",
    position: new THREE.Vector3(8.2, 5.0, -1.55),
    target: new THREE.Vector3(13.85, 5.0, -1.5),
    duration: 2.1
  },
  {
    key: "right-two",
    title: "Artwork 5",
    caption: "Holding the middle right piece just long enough to let the detail breathe.",
    position: new THREE.Vector3(11.05, 5.0, -1.55),
    target: new THREE.Vector3(13.85, 5.0, -1.5),
    duration: 1.8
  },
  {
    key: "right-three",
    title: "Artwork 6",
    caption: "The final right wall piece closes the side sweep with one last zoom.",
    position: new THREE.Vector3(8.4, 5.15, 5.15),
    target: new THREE.Vector3(13.85, 4.8, 5.3),
    duration: 2.1
  },
  {
    key: "right-three",
    title: "Artwork 6",
    caption: "The camera eases back and recenters for the closing focus.",
    position: new THREE.Vector3(11.25, 5.0, 5.15),
    target: new THREE.Vector3(13.85, 4.8, 5.3),
    duration: 1.8
  },
  {
    key: "center",
    title: "Centerpiece",
    caption: "The walkthrough returns to the center wall and finishes with a final slow zoom.",
    position: new THREE.Vector3(0, 5.2, 6.0),
    target: new THREE.Vector3(0, 4.8, -8.02),
    duration: 2.8
  },
  {
    key: "center",
    title: "Centerpiece",
    caption: "A soft final push toward the center artwork before the loop begins again.",
    position: new THREE.Vector3(0, 4.95, 0.75),
    target: new THREE.Vector3(0, 4.8, -8.02),
    duration: 2.4
  }
];

const outlineStops = [
  { key: "entrance", label: "Step 01", title: "Entrance", copy: "Open the room and set the tone before the side-to-side artwork pass begins." },
  { key: "left-one", label: "Step 02", title: "Left Artwork 1", copy: "First left wall stop with a close-in lens move and slow retreat." },
  { key: "left-two", label: "Step 03", title: "Left Artwork 2", copy: "The camera glides along the left edge to frame the second piece." },
  { key: "left-three", label: "Step 04", title: "Left Artwork 3", copy: "The last left wall composition closes the first half of the journey." },
  { key: "right-one", label: "Step 05", title: "Right Artwork 1", copy: "A cross-room move brings the right wall into focus." },
  { key: "right-two", label: "Step 06", title: "Right Artwork 2", copy: "The middle right work gets the same in-and-out presentation." },
  { key: "right-three", label: "Step 07", title: "Right Artwork 3", copy: "The final side wall artwork completes the sweep." },
  { key: "center", label: "Step 08", title: "Centerpiece", copy: "The camera recenters and ends on the statement work in the middle." }
];

outlineEl.innerHTML = outlineStops
  .map(
    (stop) => `
      <article class="tour-stop" data-stop-key="${stop.key}">
        <span class="tour-stop-step">${stop.label}</span>
        <span class="tour-stop-title">${stop.title}</span>
        <span class="tour-stop-copy">${stop.copy}</span>
      </article>
    `
  )
  .join("");

const outlineItems = [...outlineEl.querySelectorAll(".tour-stop")];

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

const totalDuration = sequence.reduce((sum, item) => sum + item.duration, 0);
let currentTime = 0;
let activeKey = sequence[0].key;
let paused = false;
let lastTick = performance.now();
let audioEnabled = false;

function setActiveStop(key) {
  if (activeKey === key) return;
  activeKey = key;
  outlineItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.stopKey === key);
  });
}

function updateOverlay(frame) {
  titleEl.textContent = frame.title;
  captionEl.textContent = frame.caption;
  setActiveStop(frame.key);
}

function getFrameAt(time) {
  let cursor = 0;

  for (let index = 0; index < sequence.length; index += 1) {
    const current = sequence[index];
    const next = sequence[(index + 1) % sequence.length];
    const start = cursor;
    const end = cursor + current.duration;

    if (time >= start && time < end) {
      const local = current.duration > 0 ? (time - start) / current.duration : 0;
      return {
        from: current,
        to: next,
        progress: easeInOutCubic(local)
      };
    }

    cursor = end;
  }

  return {
    from: sequence[sequence.length - 1],
    to: sequence[0],
    progress: 1
  };
}

const tempPosition = new THREE.Vector3();
const tempTarget = new THREE.Vector3();

function applyFrame(frameState) {
  tempPosition.lerpVectors(frameState.from.position, frameState.to.position, frameState.progress);
  tempTarget.lerpVectors(frameState.from.target, frameState.to.target, frameState.progress);
  camera.position.copy(tempPosition);
  camera.lookAt(tempTarget);
  updateOverlay(frameState.from);
}

setActiveStop(sequence[0].key);

function animate(now) {
  const delta = (now - lastTick) / 1000;
  lastTick = now;

  if (!paused) {
    currentTime = (currentTime + delta) % totalDuration;
  }

  const frameState = getFrameAt(currentTime);
  applyFrame(frameState);
  dust.rotation.y += paused ? 0 : delta * 0.05;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

toggleBtn.addEventListener("click", () => {
  paused = !paused;
  toggleBtn.textContent = paused ? "Resume" : "Pause";
});

restartBtn.addEventListener("click", () => {
  currentTime = 0;
  paused = false;
  toggleBtn.textContent = "Pause";
});

async function enableAudio() {
  if (!audioEl) return;
  audioEl.volume = 0.38;
  try {
    await audioEl.play();
    audioEnabled = true;
    audioToggleBtn.textContent = "Sound Off";
  } catch (_error) {
    audioEnabled = false;
    audioToggleBtn.textContent = "Sound On";
  }
}

function disableAudio() {
  if (!audioEl) return;
  audioEl.pause();
  audioEl.currentTime = 0;
  audioEnabled = false;
  audioToggleBtn.textContent = "Sound On";
}

audioToggleBtn.addEventListener("click", async () => {
  if (audioEnabled) {
    disableAudio();
    return;
  }

  await enableAudio();
});

window.addEventListener(
  "pointerdown",
  () => {
    if (!audioEnabled) {
      enableAudio();
    }
  },
  { once: true }
);

window.addEventListener("resize", resizeRenderer);
resizeRenderer();
requestAnimationFrame((now) => {
  lastTick = now;
  animate(now);
});
