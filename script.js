import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

const canvas = document.getElementById("webgl");

/* -----------------------------
   SCENE / CAMERA / RENDERER
----------------------------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf1f3f5);
scene.fog = new THREE.Fog(0xf1f3f5, 34, 68);

function getViewType() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  if (w <= 640) {
    return h > w ? "mobilePortrait" : "mobileLandscape";
  }

  return "desktop";
}

const cameraSettings = {
  desktop: {
    fov: 60,
    position: { x: 0, y: 5.8, z: 18.5 },
    target:   { x: 0, y: 4.2, z: -5.6 }
  },

  mobilePortrait: {
    fov: 125,
    position: { x: 0, y: 4.0, z: 15.8 },
    target:   { x: 0, y: 4.2, z: -5.6 }
  },

  mobileLandscape: {
    fov: 72,
    position: { x: 0, y: 4.8, z: 17.2 },
    target:   { x: 0, y: 4.2, z: -5.6 }
  }
};

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

function applyCameraView() {
  const viewType = getViewType();
  const settings = cameraSettings[viewType];

  camera.fov = settings.fov;
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.position.set(
    settings.position.x,
    settings.position.y,
    settings.position.z
  );

  camera.lookAt(
    settings.target.x,
    settings.target.y,
    settings.target.z
  );

  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.set(
      settings.target.x,
      settings.target.y,
      settings.target.z
    );
    controls.update();
  }
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;

/* -----------------------------
   CONTROLS
----------------------------- */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = false;
controls.minDistance = 10;
controls.maxDistance = 28;
controls.maxPolarAngle = Math.PI / 2.08;
controls.enabled = true;

applyCameraView();

/* -----------------------------
   COLORS
----------------------------- */
const COLORS = {
  wall: 0xfaf9f6,
  wallSoft: 0xf3f1ec,
  ceiling: 0x5f6458,
  floor: 0xd8dcdf,
  floorLine: 0xc7ccd1,
  trim: 0xe7e9eb,
  charcoal: 0x2f3135,
  bronze: 0x9f8d77,
  glass: 0xd9e7ef,
  daylight: 0xffffff,
  shadow: 0xd3d7db
};

const world = new THREE.Group();
scene.add(world);
RectAreaLightUniformsLib.init();

/* -----------------------------
   MATERIALS
----------------------------- */
const textureLoader = new THREE.TextureLoader();

const woodColor = textureLoader.load("/textures/wood/color.jpg");
const woodNormal = textureLoader.load("/textures/wood/normal.jpg");
const woodRough = textureLoader.load("/textures/wood/rough.jpg");

woodColor.wrapS = woodColor.wrapT = THREE.RepeatWrapping;
woodNormal.wrapS = woodNormal.wrapT = THREE.RepeatWrapping;
woodRough.wrapS = woodRough.wrapT = THREE.RepeatWrapping;

woodColor.repeat.set(8, 12);
woodNormal.repeat.set(8, 12);
woodRough.repeat.set(8, 12);

woodColor.colorSpace = THREE.SRGBColorSpace;

const plasterColor = textureLoader.load("/textures/wall/wall.jpg");
plasterColor.wrapS = plasterColor.wrapT = THREE.RepeatWrapping;
plasterColor.repeat.set(1.4, 0.8);
plasterColor.colorSpace = THREE.SRGBColorSpace;

const wallMat = new THREE.MeshStandardMaterial({
  map: plasterColor,
  color: 0xe8e6e1,
  roughness: 0.96,
  metalness: 0.01
});

const softWallMat = new THREE.MeshStandardMaterial({
  map: plasterColor,
  color: 0xdddad4,
  roughness: 0.97,
  metalness: 0.01
});

const floorMat = new THREE.MeshStandardMaterial({
  map: woodColor,
  normalMap: woodNormal,
  roughnessMap: woodRough,
  roughness: 0.72,
  metalness: 0.04
});

const ceilingMat = new THREE.MeshStandardMaterial({
  color: COLORS.ceiling,
  roughness: 0.95,
  metalness: 0.01
});

const floorLineMat = new THREE.MeshStandardMaterial({
  color: 0x8b6d58,
  roughness: 0.82,
  metalness: 0.01,
  transparent: true,
  opacity: 0.18
});

const trimMat = new THREE.MeshStandardMaterial({
  color: COLORS.trim,
  roughness: 0.76,
  metalness: 0.03
});

const darkFrameMat = new THREE.MeshStandardMaterial({
  color: COLORS.charcoal,
  roughness: 0.4,
  metalness: 0.16
});

const lightFrameMat = new THREE.MeshStandardMaterial({
  color: COLORS.bronze,
  roughness: 0.45,
  metalness: 0.14
});

/* -----------------------------
   LIGHTING
----------------------------- */
const ambient = new THREE.AmbientLight(0xffffff, 0.18);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0xffffff, 0xd8dde1, 0.28);
scene.add(hemi);

const daylight = new THREE.DirectionalLight(0xffffff, 0.25);
daylight.position.set(7, 15, 10);
daylight.castShadow = true;
daylight.shadow.mapSize.width = 2048;
daylight.shadow.mapSize.height = 2048;
daylight.shadow.camera.left = -24;
daylight.shadow.camera.right = 24;
daylight.shadow.camera.top = 24;
daylight.shadow.camera.bottom = -24;
daylight.shadow.bias = -0.00008;
scene.add(daylight);

/* -----------------------------
   SOFT CEILING BOUNCE LIGHT
----------------------------- */
const ceilingBounce = new THREE.RectAreaLight(
  0xffffff,
  0.9,
  14,
  12
);

ceilingBounce.position.set(0, 9.6, 0);
ceilingBounce.rotation.x = Math.PI;
scene.add(ceilingBounce);

/* -----------------------------
   ROOM DIMENSIONS
----------------------------- */
const roomW = 28;
const roomH = 9.8;
const roomD = 32;

/* -----------------------------
   HELPERS
----------------------------- */
function addBox(w, h, d, x, y, z, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  world.add(mesh);
  return mesh;
}

/* -----------------------------
   FLOOR / CEILING
----------------------------- */
const floor = addBox(roomW, 0.22, roomD, 0, -0.11, 0, floorMat);
floor.receiveShadow = true;

const ceiling = addBox(roomW, 0.2, roomD, 0, roomH, 0, ceilingMat);
ceiling.receiveShadow = true;

// floor seams
for (let i = -11.5; i <= 11.5; i += 2.3) {
  const seam = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.003, roomD - 1.2),
    floorLineMat
  );
  seam.position.set(i, 0.004, 0);
  seam.receiveShadow = true;
  world.add(seam);
}

/* -----------------------------
   WALLS
----------------------------- */
const backWallZ = -roomD / 2;

const longWindowW = 23.0;
const longWindowH = 8.2;
const longWindowY = 4.8;

// left back wall section
addBox(
  (roomW - longWindowW) / 2,
  roomH,
  0.24,
  -(longWindowW / 2 + (roomW - longWindowW) / 4),
  roomH / 2,
  backWallZ,
  wallMat
);

// right back wall section
addBox(
  (roomW - longWindowW) / 2,
  roomH,
  0.24,
  (longWindowW / 2 + (roomW - longWindowW) / 4),
  roomH / 2,
  backWallZ,
  wallMat
);

// top wall section above window
addBox(
  longWindowW,
  roomH - (longWindowY + longWindowH / 2),
  0.24,
  0,
  longWindowY + longWindowH / 2 + (roomH - (longWindowY + longWindowH / 2)) / 2,
  backWallZ,
  wallMat
);

// bottom wall section below window
addBox(
  longWindowW,
  longWindowY - longWindowH / 2,
  0.24,
  0,
  (longWindowY - longWindowH / 2) / 2,
  backWallZ,
  wallMat
);

addBox(0.24, roomH, roomD, -roomW / 2, roomH / 2, 0, wallMat);
addBox(0.24, roomH, roomD, roomW / 2, roomH / 2, 0, wallMat);

// front wall with open entry
addBox(8.5, roomH, 0.24, -9.75, roomH / 2, roomD / 2, wallMat);
addBox(8.5, roomH, 0.24, 9.75, roomH / 2, roomD / 2, wallMat);
addBox(8.5, 2.1, 0.24, 0, roomH - 1.05, roomD / 2, wallMat);

// central partition wall
const centerWall = addBox(12.0, 10.35, 0.28, 0, 3.625, -8.2, softWallMat);
centerWall.castShadow = true;

/* -----------------------------
   TRIMS
----------------------------- */
addBox(roomW, 0.12, 0.11, 0, 0.06, -roomD / 2 + 0.055, trimMat);
addBox(roomW, 0.12, 0.11, 0, 0.06, roomD / 2 - 0.055, trimMat);

const trimLeft = addBox(roomD, 0.12, 0.11, -roomW / 2 + 0.055, 0.06, 0, trimMat);
trimLeft.rotation.y = Math.PI / 2;

const trimRight = addBox(roomD, 0.12, 0.11, roomW / 2 - 0.055, 0.06, 0, trimMat);
trimRight.rotation.y = Math.PI / 2;

/* -----------------------------
   LONG BACK WINDOW
----------------------------- */
function addLongWindow(x, y, z, w, h) {
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xe6e0d6,
    roughness: 0.82,
    metalness: 0.03
  });

  const mullionMat = new THREE.MeshStandardMaterial({
    color: 0xe1dbd1,
    roughness: 0.8,
    metalness: 0.03
  });

  const frameTop = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.14, 0.12),
    frameMat
  );
  frameTop.position.set(x, y + h / 2 - 0.07, z);
  world.add(frameTop);

  const frameBottom = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.14, 0.12),
    frameMat
  );
  frameBottom.position.set(x, y - h / 2 + 0.07, z);
  world.add(frameBottom);

  const frameLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, h, 0.12),
    frameMat
  );
  frameLeft.position.set(x - w / 2 + 0.07, y, z);
  world.add(frameLeft);

  const frameRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, h, 0.12),
    frameMat
  );
  frameRight.position.set(x + w / 2 - 0.07, y, z);
  world.add(frameRight);

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.24, h - 0.24),
    new THREE.MeshPhysicalMaterial({
      color: 0xc7e3e1,
      transparent: true,
      opacity: 0.14,
      transmission: 0.96,
      roughness: 0.06,
      metalness: 0,
      ior: 1.5,
      thickness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      reflectivity: 0.9
    })
  );

  glass.position.set(x, y, z + 0.03);
  world.add(glass);

  const innerGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.24, h - 0.24),
    new THREE.MeshPhysicalMaterial({
      color: 0xc7e3e1,
      transparent: true,
      opacity: 0.06,
      transmission: 0.98,
      roughness: 0.08,
      metalness: 0,
      ior: 1.5,
      thickness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.08
    })
  );

  innerGlass.position.set(x, y, z - 0.015);
  world.add(innerGlass);

  const glassTint = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.24, h - 0.24),
    new THREE.MeshBasicMaterial({
      color: 0xc7e3e1,
      transparent: true,
      opacity: 0.08,
      depthWrite: false
    })
  );
  glassTint.position.set(x, y, z + 0.012);
  world.add(glassTint);

  const mullion1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, h - 0.24, 0.05),
    mullionMat
  );
  mullion1.position.set(x - w / 4, y, z + 0.02);
  world.add(mullion1);

  const mullion2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, h - 0.24, 0.05),
    mullionMat
  );
  mullion2.position.set(x + w / 4, y, z + 0.02);
  world.add(mullion2);

  const mullionH = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.24, 0.08, 0.05),
    mullionMat
  );
  mullionH.position.set(x, y, z + 0.02);
  world.add(mullionH);

  const glare = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.12, h * 0.82),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.08
    })
  );
  glare.position.set(x - w * 0.22, y, z + 0.04);
  glare.rotation.z = -0.18;
  world.add(glare);

  const sill = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.1, 0.08, 0.18),
    frameMat
  );
  sill.position.set(x, y - h / 2 - 0.06, z + 0.03);
  world.add(sill);
}

addLongWindow(0, longWindowY, -15.9, longWindowW, longWindowH);

/* -----------------------------
   OUTSIDE SKY BACKDROP
----------------------------- */
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

for (let i = 0; i < 6; i++) {
  skyCtx.fillStyle = "rgba(255,255,255,0.18)";
  skyCtx.beginPath();
  skyCtx.ellipse(
    150 + i * 140,
    100 + (i % 2) * 40,
    110,
    28,
    0,
    0,
    Math.PI * 2
  );
  skyCtx.fill();
}

const skyTexture = new THREE.CanvasTexture(skyCanvas);
skyTexture.colorSpace = THREE.SRGBColorSpace;

const outsideBackdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 16),
  new THREE.MeshBasicMaterial({ map: skyTexture })
);
outsideBackdrop.position.set(0, 10, -26);
scene.add(outsideBackdrop);

/* -----------------------------
   ART TEXTURES
----------------------------- */
function loadSpecificTexture(fileName) {
  const tex = textureLoader.load(`/artworks/${fileName}`);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* -----------------------------
   ARTWORKS
----------------------------- */
function createArtwork({ width, height, texture, frame = "dark" }) {
  const group = new THREE.Group();
  const frameMat = frame === "light" ? lightFrameMat : darkFrameMat;

  const outer = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.15, height + 0.15, 0.11),
    frameMat
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
      map: texture,
      roughness: 0.9,
      metalness: 0.02,
      emissive: 0xffffff,
      emissiveMap: texture,
      emissiveIntensity: 0.15
    })
  );
  art.position.z = 0.065;
  group.add(art);

  return group;
}

/* LEFT WALL: AAA7, AAA4, AAA5 */
const left1 = createArtwork({
  width: 4.8,
  height: 6.5,
  texture: loadSpecificTexture("AAA7.jpg"),
  frame: "dark"
});
left1.position.set(-13.85, 4.8, -9.0);
left1.rotation.y = Math.PI / 2;
world.add(left1);

const left2 = createArtwork({
  width: 5.0,
  height: 5.0,
  texture: loadSpecificTexture("AAA4.jpg"),
  frame: "light"
});
left2.position.set(-13.85, 5.0, -1.5);
left2.rotation.y = Math.PI / 2;
world.add(left2);

const left3 = createArtwork({
  width: 4.8,
  height: 6.5,
  texture: loadSpecificTexture("AAA6.jpg"),
  frame: "dark"
});
left3.position.set(-13.85, 4.8, 5.3);
left3.rotation.y = Math.PI / 2;
world.add(left3);

/* RIGHT WALL: AAA3, AAA1, AAA5 */
const right1 = createArtwork({
  width: 4.8,
  height: 6.5,
  texture: loadSpecificTexture("AAA3.jpg"),
  frame: "dark"
});
right1.position.set(13.85, 4.8, -9.0);
right1.rotation.y = -Math.PI / 2;
world.add(right1);

const right2 = createArtwork({
  width: 5.5,
  height: 4.5,
  texture: loadSpecificTexture("AAA1.jpg"),
  frame: "light"
});
right2.position.set(13.85, 5.0, -1.5);
right2.rotation.y = -Math.PI / 2;
world.add(right2);

const right3 = createArtwork({
  width: 4.8,
  height: 6.5,
  texture: loadSpecificTexture("AAA5.jpg"),
  frame: "dark"
});
right3.position.set(13.85, 4.8, 5.3);
right3.rotation.y = -Math.PI / 2;
world.add(right3);

/* CENTER WALL: AAA2 */
const centerArt = createArtwork({
  width: 6.5,
  height: 6.5,
  texture: loadSpecificTexture("AAA2.jpg"),
  frame: "dark"
});
centerArt.position.set(0, 4.8, -8.02);
world.add(centerArt);

/* -----------------------------
   CENTER WALL SCONCE LIGHT
----------------------------- */
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
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 1.2, 0.08),
    metalMat
  );

  group.add(plate);

  const topGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.6, 0.35),
    glassMat
  );
  topGlass.position.set(0, 0.45, 0.2);
  group.add(topGlass);

  const bottomGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.6, 0.35),
    glassMat
  );
  bottomGlass.position.set(0, -0.45, 0.2);
  group.add(bottomGlass);

  group.position.set(x, 4.9, -8.05);
  world.add(group);

  const glow = new THREE.PointLight(0xfff2dc, 4.5, 4);
  glow.position.set(x, 4.9, -7.8);
  scene.add(glow);
}

addCenterWallSconce(-5.0);
addCenterWallSconce(5.0);

function addCenterWallWasher() {
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x1f2125,
    roughness: 0.55,
    metalness: 0.22
  });

  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(8.4, 0.12, 0.16),
    metalMat
  );
  bar.position.set(0, 7.55, -1.04);
  world.add(bar);

  const washer = new THREE.RectAreaLight(
    0xfff1dc,
    11,
    8.0,
    1.8
  );
  washer.position.set(0, 8.2, -8.02);
  washer.lookAt(0, 5.0, -8.02);
  scene.add(washer);
}

addCenterWallWasher();

/* -----------------------------
   TRACK SPOTLIGHTS
----------------------------- */
function addTrackLight({ x, zPositions, targetX, targetYPositions, side = "left" }) {
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

  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.08, roomD - 4),
    railMat
  );
  rail.position.set(x, roomH - 0.06, 0);
  world.add(rail);

  for (let i = 0; i < zPositions.length; i++) {
    const z = zPositions[i];
    const targetY = targetYPositions[i];
    const offsets = [-0.55, 0.55];

    for (let j = 0; j < offsets.length; j++) {
      const zOffset = offsets[j];

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.18, 12),
        headMat
      );
      stem.position.set(x, roomH - 0.16, z + zOffset);
      world.add(stem);

      const head = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.075, 0.22, 18),
        headMat
      );
      head.rotation.z = Math.PI / 2;
      head.position.set(x, roomH - 0.27, z + zOffset);
      world.add(head);

      const areaLight = new THREE.RectAreaLight(
        0xfff2dc,
        10,
        1.2,
        2.0
      );

      areaLight.position.set(x, roomH - 0.35, z + zOffset);
      areaLight.lookAt(targetX, targetY, z);
      scene.add(areaLight);
    }
  }
}

/* -----------------------------
   TRACK LIGHT PLACEMENT
----------------------------- */
addTrackLight({
  x: -12.7,
  zPositions: [-9.0, -1.5, 5.3],
  targetX: -13.2,
  targetYPositions: [4.8, 5.0, 4.8],
  side: "left"
});

addTrackLight({
  x: 12.7,
  zPositions: [-9.0, -1.5, 5.3],
  targetX: 13.2,
  targetYPositions: [4.8, 5.0, 4.8],
  side: "right"
});

/* -----------------------------
   SMALL BIN / PEDESTAL
----------------------------- */
const pedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(0.22, 0.22, 0.9, 24),
  new THREE.MeshStandardMaterial({
    color: 0x2e2f33,
    roughness: 0.55,
    metalness: 0.08
  })
);
pedestal.position.set(4.6, 0.45, -8.95);
pedestal.castShadow = true;
world.add(pedestal);

/* -----------------------------
   SUBTLE DUST
----------------------------- */
const dustGeo = new THREE.BufferGeometry();
const dustCount = 110;
const dustPos = new Float32Array(dustCount * 3);

for (let i = 0; i < dustCount; i++) {
  dustPos[i * 3] = (Math.random() - 0.5) * 18;
  dustPos[i * 3 + 1] = 1 + Math.random() * 7;
  dustPos[i * 3 + 2] = (Math.random() - 0.5) * 24;
}

dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));

const dust = new THREE.Points(
  dustGeo,
  new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.028,
    transparent: true,
    opacity: 0.14
  })
);
scene.add(dust);

/* -----------------------------
   RESIZE
----------------------------- */
window.addEventListener("resize", () => {
  applyCameraView();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/* -----------------------------
   ANIMATION
----------------------------- */
const clock = new THREE.Clock();
let paused = false;

function animate() {
  if (!paused) {
    const t = clock.getElapsedTime();
    dust.rotation.y = t * 0.004;
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

const pauseBtn = document.getElementById("pauseBtn");

if (pauseBtn) {
  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.innerText = paused ? "Resume Animation" : "Pause Animation";
  });
}

animate();


/* --- FORM MODAL & SUCCESS LOGIC --- */

window.openContact = function() {
    const modal = document.getElementById('form-modal');
    const messageArea = document.getElementById('message-area');
    const modalTitle = document.getElementById('modal-title');
    const form = document.querySelector('#form-modal form');
    
    if(modal) {
        modal.style.display = 'flex';
        form.style.display = 'block'; // Ensure form is visible
        if(document.getElementById('success-msg')) document.getElementById('success-msg').remove(); // Clear old thanks
        if(messageArea) messageArea.style.display = 'block';
        if(modalTitle) modalTitle.innerText = "Contact AmiLuna";
    }
};

window.openSubscribe = function() {
    const modal = document.getElementById('form-modal');
    const messageArea = document.getElementById('message-area');
    const modalTitle = document.getElementById('modal-title');
    const form = document.querySelector('#form-modal form');
    
    if(modal) {
        modal.style.display = 'flex';
        form.style.display = 'block'; 
        if(document.getElementById('success-msg')) document.getElementById('success-msg').remove();
        if(messageArea) messageArea.style.display = 'none';
        if(modalTitle) modalTitle.innerText = "Join the Collective";
    }
};

window.closeForm = function() {
    const modal = document.getElementById('form-modal');
    if(modal) modal.style.display = 'none';
};

// Handle the Success Confirmation
const contactForm = document.querySelector('#form-modal form');
if(contactForm) {
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault(); // Stop page from reloading
        const formData = new FormData(this);
        
        try {
            const response = await fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                // Hide the form and show "Thank You"
                this.style.display = 'none';
                const successMsg = document.createElement('div');
                successMsg.id = 'success-msg';
                successMsg.innerHTML = `
                    <p style="color: #E5C687; font-size: 1.2rem; margin: 20px 0;">Thank you! Your message has been sent.</p>
                    <button type="button" class="cancel-btn" onclick="closeForm()">CLOSE</button>
                `;
                this.parentNode.appendChild(successMsg);
            }
        } catch (error) {
            alert("Oops! There was a problem sending your message.");
        }
    });
}

// Close when clicking outside
window.addEventListener('click', (event) => {
    const modal = document.getElementById('form-modal');
    if (event.target == modal) closeForm();
});