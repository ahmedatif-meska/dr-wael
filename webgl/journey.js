// Journey — a corridor of seven illuminated gates; scroll progress moves the camera through them.
export function mount(THREE, canvas, { count = 7 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(window.__renderMode ? 1 : Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0d10, 6, 34);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);

  const SPACING = 7, W = 10, H = 6;
  const gates = new THREE.Group();
  scene.add(gates);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.3, metalness: 0.8 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xc8925a, transparent: true, opacity: 0.85 });
  const pillar = new THREE.BoxGeometry(0.28, H, 0.28);
  const lintel = new THREE.BoxGeometry(W + 0.56, 0.28, 0.28);
  const strip = new THREE.BoxGeometry(0.04, H, 0.06);
  const glows = [];
  for (let i = 0; i < count; i++) {
    const g = new THREE.Group();
    g.position.z = -i * SPACING;
    const l = new THREE.Mesh(pillar, frameMat); l.position.set(-W / 2, H / 2, 0);
    const r = new THREE.Mesh(pillar, frameMat); r.position.set(W / 2, H / 2, 0);
    const top = new THREE.Mesh(lintel, frameMat); top.position.set(0, H, 0);
    const sl = new THREE.Mesh(strip, glowMat.clone()); sl.position.set(-W / 2 + 0.17, H / 2, 0.15);
    const sr = new THREE.Mesh(strip, glowMat.clone()); sr.position.set(W / 2 - 0.17, H / 2, 0.15);
    g.add(l, r, top, sl, sr);
    gates.add(g);
    glows.push([sl.material, sr.material]);
  }

  // Floor and walls with a faint grid.
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.2, metalness: 0.8 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, count * SPACING + 40), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.z = -(count * SPACING) / 2;
  scene.add(floor);
  const grid = new THREE.GridHelper(count * SPACING + 40, 60, 0x2a2f38, 0x1a1e25);
  grid.position.set(0, 0.01, -(count * SPACING) / 2);
  scene.add(grid);

  const key = new THREE.PointLight(0xe0b27a, 40, 30, 1.5);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0x1a1e25, 1.2));
  const far = new THREE.PointLight(0xe0b27a, 90, 60, 1.2);
  far.position.set(0, 3, -count * SPACING - 8);
  scene.add(far);

  let active = false, raf = 0, progress = 0, shown = 0, t0 = performance.now();

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  function frame(now) {
    if (!active) return;
    const t = (now - t0) / 1000;
    shown += (progress - shown) * 0.08;
    const z = 4 - shown * (count - 1) * SPACING;
    camera.position.set(Math.sin(t * 0.15) * 0.25, 2.2 + Math.sin(t * 0.3) * 0.05, z);
    camera.lookAt(0, 2.6, z - 10);
    key.position.set(0, 4.2, z - 2);
    const cur = shown * (count - 1);
    glows.forEach((pair, i) => {
      const d = Math.abs(i - cur);
      const o = 0.25 + 0.75 * Math.max(0, 1 - d);
      pair[0].opacity = pair[1].opacity = o;
    });
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  return {
    setProgress(p) { progress = Math.min(1, Math.max(0, p)); },
    setActive(on) { if (on === active) return true; active = on; if (on) raf = requestAnimationFrame(frame); else cancelAnimationFrame(raf); return true; },
    destroy() { active = false; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); pillar.dispose(); lintel.dispose(); strip.dispose(); },
  };
}
