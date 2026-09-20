// Expertise — seven disciplines as a network that resolves from scatter into order.
// The HTML list items are positioned over the projected nodes so they stay accessible.
export function mount(THREE, canvas, { list } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(window.__renderMode ? 1 : Math.min(devicePixelRatio, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 13);

  const items = [...list.querySelectorAll("li")];
  const ids = items.map((li) => li.dataset.id);
  const n = ids.length;
  // Ordered layout: a ring with the governance node near the centre, sized to the visible frustum
  // so it fits portrait phones as well as wide screens.
  const ordered = ids.map(() => new THREE.Vector3());
  const angles = ids.map((id) => { if (id === "governance") return null; const k = ids.filter((x) => x !== "governance").indexOf(id); return (k / (n - 1)) * Math.PI * 2 - Math.PI / 2; });
  function layout() {
    const halfH = Math.tan((camera.fov / 2) * Math.PI / 180) * camera.position.z;
    const halfW = halfH * camera.aspect;
    const rx = Math.min(5.4, halfW * 0.66), ry = Math.min(3.3, halfH * 0.62);
    ids.forEach((id, i) => {
      const a = angles[i];
      if (a === null) ordered[i].set(0, 0.2, 0);
      else ordered[i].set(Math.cos(a) * rx, Math.sin(a) * ry, Math.sin(a * 2) * 0.6);
    });
  }
  const scatter = ordered.map((v, i) => new THREE.Vector3((Math.sin(i * 12.9) * 6), (Math.cos(i * 7.3) * 4), (Math.sin(i * 3.1) * 5)));
  const pos = scatter.map((v) => v.clone());

  const links = [];
  items.forEach((li, i) => {
    const btn = li.querySelector("button");
    const linked = (window.__profileLinks && window.__profileLinks[ids[i]]) || [];
    linked.forEach((t) => { const j = ids.indexOf(t); if (j >= 0 && !links.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) links.push([i, j]); });
  });
  if (!links.length) for (let i = 0; i < n; i++) links.push([i, (i + 1) % n], [i, (i + 3) % n]);

  const nodeGeo = new THREE.IcosahedronGeometry(0.28, 2);
  const nodeMat = new THREE.MeshStandardMaterial({ color: 0x1a1e25, roughness: 0.25, metalness: 0.85, emissive: 0xc8925a, emissiveIntensity: 0.15 });
  const nodes = ids.map(() => { const m = new THREE.Mesh(nodeGeo, nodeMat.clone()); scene.add(m); return m; });
  const ringGeo = new THREE.TorusGeometry(0.42, 0.012, 8, 48);
  const rings = ids.map(() => { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xc8925a, transparent: true, opacity: 0.35 })); scene.add(m); return m; });

  const lineGeo = new THREE.BufferGeometry();
  const linePos = new Float32Array(links.length * 6);
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0xc8925a, transparent: true, opacity: 0.35 }));
  scene.add(lines);

  // Background lattice: small dark cubes that also resolve into a grid.
  const LAT = 120;
  const latGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  const lat = new THREE.InstancedMesh(latGeo, new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.4, metalness: 0.7 }), LAT);
  scene.add(lat);
  const latA = [], latB = [];
  for (let i = 0; i < LAT; i++) {
    latA.push(new THREE.Vector3(Math.sin(i * 1.7) * 9, Math.cos(i * 2.3) * 6, -3 + Math.sin(i * 0.7) * 6));
    latB.push(new THREE.Vector3(((i % 12) - 5.5) * 1.5, (((i / 12) | 0) - 4.5) * 1.5, -6));
  }

  scene.add(new THREE.AmbientLight(0x1a1e25, 1.5));
  const key = new THREE.PointLight(0xe0b27a, 50, 40, 1.4); key.position.set(5, 4, 8); scene.add(key);
  const fill = new THREE.PointLight(0x1d3557, 20, 40, 1.6); fill.position.set(-6, -3, 6); scene.add(fill);

  let active = false, raf = 0, order = 0, t0 = performance.now(), highlighted = -1;
  const m4 = new THREE.Matrix4(), tmp = new THREE.Vector3();

  function resize() {
    const w = canvas.clientWidth || 600, h = canvas.clientHeight || 560;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    layout();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  function frame(now) {
    if (!active) return;
    const t = (now - t0) / 1000;
    order += (1 - order) * 0.03; // resolve from chaos to structure over ~2.5 s
    const e = order * order * (3 - 2 * order);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (let i = 0; i < n; i++) {
      pos[i].lerpVectors(scatter[i], ordered[i], e);
      pos[i].y += Math.sin(t * 0.8 + i) * 0.04;
      nodes[i].position.copy(pos[i]);
      rings[i].position.copy(pos[i]);
      rings[i].lookAt(camera.position);
      const hi = i === highlighted;
      nodes[i].material.emissiveIntensity = hi ? 0.9 : 0.15;
      rings[i].material.opacity = hi ? 0.9 : 0.35;
      rings[i].scale.setScalar(hi ? 1.35 : 1);
      // Project to screen and place the HTML node over it.
      tmp.copy(pos[i]).project(camera);
      const above = ordered[i].y > 0.5;
      const lw = items[i].offsetWidth || 160;
      const x = Math.min(w - lw / 2 - 4, Math.max(lw / 2 + 4, (tmp.x + 1) / 2 * w));
      items[i].style.left = x + "px";
      items[i].style.top = ((1 - tmp.y) / 2 * h + (above ? -40 : 40)) + "px";
      items[i].style.transform = above ? "translate(-50%, -100%)" : "translate(-50%, 0)";
    }
    links.forEach(([a, b], k) => {
      linePos.set([pos[a].x, pos[a].y, pos[a].z, pos[b].x, pos[b].y, pos[b].z], k * 6);
    });
    lineGeo.attributes.position.needsUpdate = true;
    lines.material.opacity = 0.08 + 0.3 * e;
    for (let i = 0; i < LAT; i++) {
      tmp.lerpVectors(latA[i], latB[i], e);
      m4.makeRotationY(t * 0.2 * (1 - e)); m4.setPosition(tmp);
      lat.setMatrixAt(i, m4);
    }
    lat.instanceMatrix.needsUpdate = true;
    camera.position.x = Math.sin(t * 0.12) * 0.6;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  return {
    highlight(id) { highlighted = ids.indexOf(id); },
    setActive(on) { if (on === active) return true; active = on; if (on) raf = requestAnimationFrame(frame); else cancelAnimationFrame(raf); return true; },
    destroy() { active = false; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); nodeGeo.dispose(); ringGeo.dispose(); lineGeo.dispose(); latGeo.dispose(); },
  };
}
