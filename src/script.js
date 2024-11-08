import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import particlesVertexShader from "./shaders/particles/vertex.glsl";
import particlesFragmentShader from "./shaders/particles/fragment.glsl";
import GUI from "lil-gui";

/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

// Loaders
const textureLoader = new THREE.TextureLoader();

// Debug
const gui = new GUI();
const debugObjects = {
  particlesColor: "#e0f0f0",
};
// if (window.location.hash !== "#debug") {
//   gui.hide();
// }

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

  // Materials
  particlesMaterial.uniforms.uResolution.value.set(
    sizes.width * sizes.pixelRatio,
    sizes.height * sizes.pixelRatio
  );

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(sizes.pixelRatio);
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  35,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(0, 0, 18);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.touches.ONE = null;
controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setClearColor("#181818");
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);

/**
 * Diplacement
 */
const displacement = {};

// 2D canvas
displacement.canvas = document.createElement("canvas");
if (window.location.hash === "#debug") {
  displacement.canvas.width = 128;
  displacement.canvas.height = 128;
  displacement.canvas.style.position = "fixed";
  displacement.canvas.style.width = "256px";
  displacement.canvas.style.height = "256px";
  displacement.canvas.style.top = 0;
  displacement.canvas.style.left = 0;
  displacement.canvas.style.zIndex = 10;
  document.body.append(displacement.canvas);
}

// Context
displacement.context = displacement.canvas.getContext("2d");
displacement.context.fillRect(
  0,
  0,
  displacement.canvas.width,
  displacement.canvas.width
);

// Glow image
displacement.glowImage = new Image();
displacement.glowImage.src = "./glow.png";

// Interactive plane
displacement.interactivePlane = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshBasicMaterial({ color: "red", side: THREE.DoubleSide })
);
displacement.interactivePlane.visible = false;
scene.add(displacement.interactivePlane);

// Raycaster
displacement.raycaster = new THREE.Raycaster();

// Coordinates
displacement.screenCursor = new THREE.Vector2(9999, 9999); // by default, the position would be the center and ruin dogs nose. So we change the position.
displacement.canvasCursor = new THREE.Vector2(9999, 9999);
displacement.canvasCursorPrevious = new THREE.Vector2(9999, 9999);

// Handlers
const moveHandler = (event) => {
  const clientX = event.type.startsWith("pointer")
    ? event.clientX
    : event.touches[0].clientX;
  const clientY = event.type.startsWith("pointer")
    ? event.clientY
    : event.touches[0].clientY;
  displacement.screenCursor.x = (clientX / sizes.width) * 2 - 1;
  displacement.screenCursor.y = -(clientY / sizes.height) * 2 + 1;
};
window.addEventListener("pointermove", moveHandler);

// Mobile detection
let hasTouchScreen = false;
if ("maxTouchPoints" in navigator) {
  hasTouchScreen = navigator.maxTouchPoints > 0;
} else if ("msMaxTouchPoints" in navigator) {
  hasTouchScreen = navigator.msMaxTouchPoints > 0;
} else {
  const mQ = matchMedia?.("(pointer:coarse)");
  if (mQ?.media === "(pointer:coarse)") {
    hasTouchScreen = !!mQ.matches;
  } else if ("orientation" in window) {
    hasTouchScreen = true; // deprecated, but good fallback
  } else {
    // Only as a last resort, fall back to user agent sniffing
    const UA = navigator.userAgent;
    hasTouchScreen =
      /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) ||
      /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA);
  }
}

// Mobile interaction
if (hasTouchScreen) {
  // Disable desktop function
  window.removeEventListener("pointermove", moveHandler);

  // Mobile camera size
  camera.position.z = 30;

  // Mobile touch event
  window.addEventListener("touchstart", moveHandler);
  window.addEventListener("touchmove", moveHandler);
  window.addEventListener("touchend", () => {
    displacement.screenCursor.x = 9999;
    displacement.screenCursor.y = 9999;
  });
}

// Texture
displacement.texture = new THREE.CanvasTexture(displacement.canvas);

/**
 * Particles
 */
const particlesGeometry = new THREE.PlaneGeometry(10, 10, 128, 128);
particlesGeometry.setIndex(null); // fix 6 vertices on each index
particlesGeometry.deleteAttribute("normal");

const intensityArray = new Float32Array(
  particlesGeometry.attributes.position.count
);
const anglesArray = new Float32Array(
  particlesGeometry.attributes.position.count
);

for (let i = 0; i < particlesGeometry.attributes.position.count; i++) {
  intensityArray[i] = Math.random();
  anglesArray[i] = Math.random() * Math.PI * 2;
}
particlesGeometry.setAttribute(
  "aIntensity",
  new THREE.BufferAttribute(intensityArray, 1)
);
particlesGeometry.setAttribute(
  "aAngle",
  new THREE.BufferAttribute(anglesArray, 1)
);

const particlesMaterial = new THREE.ShaderMaterial({
  vertexShader: particlesVertexShader,
  fragmentShader: particlesFragmentShader,
  uniforms: {
    uResolution: new THREE.Uniform(
      new THREE.Vector2(
        sizes.width * sizes.pixelRatio,
        sizes.height * sizes.pixelRatio
      )
    ),
    uPictureTexture: new THREE.Uniform(textureLoader.load("./picture-1.png")),
    uDisplacementTexture: new THREE.Uniform(displacement.texture),
    uColor: new THREE.Uniform(new THREE.Color(debugObjects.particlesColor)),
  },
});
const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles);

// Debug
gui.addColor(debugObjects, "particlesColor").onChange(() => {
  particlesMaterial.uniforms.uColor.value = new THREE.Color(
    debugObjects.particlesColor
  );
});

/**
 * Animate
 */
const tick = () => {
  // Update controls
  controls.update();

  /**
   * Raycaster
   */
  displacement.raycaster.setFromCamera(displacement.screenCursor, camera);
  const intersections = displacement.raycaster.intersectObject(
    displacement.interactivePlane
  );

  if (intersections.length !== 0) {
    const uv = intersections[0].uv;

    displacement.canvasCursor.x = uv.x * displacement.canvas.width;
    displacement.canvasCursor.y = (1 - uv.y) * displacement.canvas.height;
  }

  /**
   * Displacement
   */
  displacement.context.globalCompositeOperation = "source-over";
  displacement.context.globalAlpha = 0.02;
  displacement.context.fillRect(
    0,
    0,
    displacement.canvas.width,
    displacement.canvas.height
  );

  // Speed alpha
  const cursorDistance = displacement.canvasCursorPrevious.distanceTo(
    displacement.canvasCursor
  );
  displacement.canvasCursorPrevious.copy(displacement.canvasCursor);
  const alpha = Math.min(cursorDistance * 0.1, 1);

  // Draw glow
  const glowSize = displacement.canvas.width * 0.25;

  displacement.context.globalCompositeOperation = "lighten";
  displacement.context.globalAlpha = alpha;
  displacement.context.drawImage(
    displacement.glowImage,
    displacement.canvasCursor.x - glowSize * 0.5,
    displacement.canvasCursor.y - glowSize * 0.5,
    glowSize,
    glowSize
  );

  // Texture
  displacement.texture.needsUpdate = true;

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
