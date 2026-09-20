// Hero — financial architecture: a field of dark glass slabs whose heights breathe,
// lit by a copper key light. Instanced, no shadows, DPR-capped.
export function mount(THREE, canvas, { reduced } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(window.__renderMode ? 1 : Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0d10, 0.055);
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
  camera.position.set(0, 2.8, 11);
  camera.lookAt(0, 1.6, 0);

  const COLS = 28, ROWS = 10, GAP = 1.15;
  const count = COLS * ROWS;
  const geo = new THREE.BoxGeometry(0.82, 1, 0.82);
  geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 0.35, metalness: 0.6, envMapIntensity: 0.4 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);

  // Copper edge accents: a second, slightly larger wireframe-like thin top plate per slab.
  const capGeo = new THREE.BoxGeometry(0.86, 0.03, 0.86);
  const capMat = new THREE.MeshBasicMaterial({ color: 0xc8925a, transparent: true, opacity: 0.55 });
  const caps = new THREE.InstancedMesh(capGeo, capMat, count);
  caps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(caps);

  // Deterministic "data" heights seeded from the profile's numbers (27, 15, 17, 4).
  const seeds = [27, 15, 17, 4];
  const base = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const c = i % COLS, r = (i / COLS) | 0;
    const s = seeds[(c + r) % 4] / 27;
    const wave = 0.5 + 0.5 * Math.sin(c * 0.55 + r * 0.9);
    base[i] = 0.3 + s * 2.4 * wave + (r % 3 === 0 ? 0.7 : 0);
  }

  const key = new THREE.PointLight(0xe0b27a, 60, 40, 1.6);
  key.position.set(6, 6, 4);
  scene.add(key);
  const fill = new THREE.PointLight(0x1d3557, 30, 40, 1.8);
  fill.position.set(-8, 3, 6);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0x1a1e25, 0.8));

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.25, metalness: 0.7 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  let active = false, raf = 0, t0 = performance.now();
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };

  const onMove = (e) => { target.x = (e.clientX / innerWidth - 0.5) * 2; target.y = (e.clientY / innerHeight - 0.5) * 2; };
  window.addEventListener("pointermove", onMove, { passive: true });

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  function frame(now) {
    if (!active) return;
    const t = (now - t0) / 1000;
    cur.x += (target.x - cur.x) * 0.04; cur.y += (target.y - cur.y) * 0.04;
    camera.position.x = cur.x * 1.2;
    camera.position.y = 3.2 - cur.y * 0.5;
    camera.lookAt(0, 1.2, 0);
    for (let i = 0; i < count; i++) {
      const c = i % COLS, r = (i / COLS) | 0;
      const breathe = reduced ? 1 : 1 + 0.12 * Math.sin(t * 0.35 + c * 0.4 + r * 0.7);
      const hgt = base[i] * breathe;
      p.set((c - COLS / 2) * GAP + 1.5, 0, -(r * GAP) + 3);
      s.set(1, hgt, 1);
      m.compose(p, q, s); mesh.setMatrixAt(i, m);
      p.y = hgt; s.set(1, 1, 1);
      m.compose(p, q, s); caps.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true; caps.instanceMatrix.needsUpdate = true;
    key.position.x = 6 + Math.sin(t * 0.2) * 2;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  return {
    setActive(on) { if (on === active) return true; active = on; if (on) { t0 = performance.now() - 1000; raf = requestAnimationFrame(frame); } else cancelAnimationFrame(raf); return true; },
    destroy() { active = false; cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("pointermove", onMove); renderer.dispose(); geo.dispose(); capGeo.dispose(); },
  };
}
