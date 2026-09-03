"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { QuoteLine } from "@/lib/types";

export interface RoomLayout {
  name: string;
  wMm: number;
  dMm: number;
  x: number | null; // 0-100 centre on plan
  y: number | null;
}

// Furniture styling by product keyword: [colour, depthMm, defaultHeightMm, atHeightMm]
function furnitureStyle(product: string): { color: number; depth: number; h: number; y: number } {
  const p = product.toLowerCase();
  if (p.includes("wardrobe")) return { color: 0x8b5e3c, depth: 600, h: 2100, y: 0 };
  if (p.includes("loft")) return { color: 0x6b4226, depth: 600, h: 600, y: 2100 };
  if (p.includes("wall cabinet")) return { color: 0xcdb090, depth: 350, h: 600, y: 1400 };
  if (p.includes("base cabinet") || p.includes("platform") || p.includes("dry balcony")) return { color: 0xd8b38a, depth: 600, h: 750, y: 0 };
  if (p.includes("tall") || p.includes("pantry") || p.includes("appliance")) return { color: 0xc9a06a, depth: 600, h: 2100, y: 0 };
  if (p.includes("tv")) return { color: 0x333333, depth: 400, h: 1500, y: 0 };
  if (p.includes("console") || p.includes("shoe") || p.includes("foyer")) return { color: 0xa9744f, depth: 450, h: 900, y: 0 };
  if (p.includes("mandir")) return { color: 0xb5892b, depth: 400, h: 1800, y: 0 };
  if (p.includes("dressing") || p.includes("vanity")) return { color: 0xc0a0b0, depth: 450, h: 900, y: 0 };
  if (p.includes("bed")) return { color: 0x7c93b8, depth: 2000, h: 500, y: 0 };
  if (p.includes("workstation") || p.includes("study") || p.includes("crockery")) return { color: 0xb98a6a, depth: 500, h: 750, y: 0 };
  return { color: 0x9a8fb0, depth: 500, h: 800, y: 0 };
}

export default function Isometric3D({ lines, layout }: { lines: QuoteLine[]; layout: RoomLayout[] }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = mount.clientWidth || 800;
    const H = mount.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6f1ea);

    // Rooms: use layout (physical rooms) or derive from lines.
    const physical = layout.filter((r) => r.name && !/other services/i.test(r.name));
    const roomNames = physical.length
      ? physical.map((r) => r.name)
      : Array.from(new Set(lines.map((l) => l.room))).filter((r) => !/other services/i.test(r));

    const M = 1000; // mm → metres
    const foot = (name: string) => {
      const r = physical.find((x) => x.name === name);
      const w = r && r.wMm ? r.wMm : 3600;
      const d = r && r.dMm ? r.dMm : 3600;
      return { w: w / M, d: d / M };
    };

    const usePos = physical.length > 0 && physical.every((r) => typeof r.x === "number" && typeof r.y === "number");
    const SPAN = 12; // metres across the plan
    const positions: Record<string, { x: number; z: number }> = {};
    if (usePos) {
      roomNames.forEach((n) => {
        const r = physical.find((x) => x.name === n)!;
        positions[n] = { x: ((r.x as number) / 100 - 0.5) * SPAN, z: ((r.y as number) / 100 - 0.5) * SPAN };
      });
    } else {
      const cols = Math.ceil(Math.sqrt(roomNames.length));
      const cell = Math.max(4, ...roomNames.map((n) => Math.max(foot(n).w, foot(n).d))) + 1;
      roomNames.forEach((n, i) => {
        const cx = (i % cols) - (cols - 1) / 2;
        const cz = Math.floor(i / cols) - (Math.ceil(roomNames.length / cols) - 1) / 2;
        positions[n] = { x: cx * cell, z: cz * cell };
      });
    }

    const wallMat = new THREE.MeshLambertMaterial({ color: 0xe9dfd4, transparent: true, opacity: 0.55 });
    const floorMat = new THREE.MeshLambertMaterial({ color: 0xfaf5ee });

    function label(text: string): THREE.Sprite {
      const c = document.createElement("canvas");
      c.width = 256; c.height = 64;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#531220"; ctx.font = "bold 26px Arial"; ctx.textAlign = "center";
      ctx.fillText(text, 128, 42);
      const tex = new THREE.CanvasTexture(c);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      spr.scale.set(2.2, 0.55, 1);
      return spr;
    }

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

    for (const name of roomNames) {
      const { w, d } = foot(name);
      const pos = positions[name] || { x: 0, z: 0 };
      const g = new THREE.Group();
      g.position.set(pos.x, 0, pos.z);

      // floor
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), floorMat);
      floor.position.y = -0.025;
      g.add(floor);
      // low perimeter walls
      const wh = 0.5, t = 0.06;
      const walls = [
        [w, wh, t, 0, wh / 2, -d / 2],
        [w, wh, t, 0, wh / 2, d / 2],
        [t, wh, d, -w / 2, wh / 2, 0],
        [t, wh, d, w / 2, wh / 2, 0],
      ];
      for (const [ww, hh, dd, px, py, pz] of walls) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, dd), wallMat);
        m.position.set(px, py, pz);
        g.add(m);
      }
      // room label
      const lab = label(name.replace(", Dining & Foyer", ""));
      lab.position.set(0, 1.4, 0);
      g.add(lab);

      // furniture: area lines (with W/H) + beds, placed along walls
      const items = lines.filter((l) => l.room === name && (l.width || /bed/i.test(l.product)));
      // wall allocator: back(-z), left(-x), right(+x), front(+z)
      let wall = 0;
      const cur = [-w / 2 + 0.1, -d / 2 + 0.1, -d / 2 + 0.1, -w / 2 + 0.1]; // running position along each wall
      for (const it of items) {
        const st = furnitureStyle(it.product);
        const bw = Math.max(0.3, (it.width || (/king/i.test(it.product) ? 1800 : 1600)) / M);
        const bh = Math.max(0.2, (it.height || st.h) / M);
        const bd = st.depth / M;
        // pick a wall that has room; advance
        for (let tries = 0; tries < 4; tries++) {
          const along = wall % 2 === 0 ? w : d; // back/front use width; left/right use depth
          if (cur[wall] + bw <= along / 2 - 0.05) break;
          wall = (wall + 1) % 4;
          if (tries === 3) cur[wall] = wall % 2 === 0 ? -w / 2 + 0.1 : -d / 2 + 0.1;
        }
        const box = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), new THREE.MeshLambertMaterial({ color: st.color }));
        if (wall === 0) box.position.set(cur[0] + bw / 2, st.y / M + bh / 2, -d / 2 + bd / 2);
        else if (wall === 1) box.position.set(-w / 2 + bd / 2, st.y / M + bh / 2, cur[1] + bw / 2);
        else if (wall === 2) box.position.set(w / 2 - bd / 2, st.y / M + bh / 2, cur[2] + bw / 2);
        else box.position.set(cur[3] + bw / 2, st.y / M + bh / 2, d / 2 - bd / 2);
        if (wall === 1 || wall === 2) box.geometry = new THREE.BoxGeometry(bd, bh, bw);
        g.add(box);
        cur[wall] += bw + 0.08;
      }

      scene.add(g);
      minX = Math.min(minX, pos.x - w / 2); maxX = Math.max(maxX, pos.x + w / 2);
      minZ = Math.min(minZ, pos.z - d / 2); maxZ = Math.max(maxZ, pos.z + d / 2);
    }

    if (!isFinite(minX)) { minX = -4; maxX = 4; minZ = -4; maxZ = 4; }
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const extent = Math.max(maxX - minX, maxZ - minZ, 4) * 1.25;

    // lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(extent, extent * 1.5, extent * 0.6);
    scene.add(dir);

    // isometric orthographic camera
    const aspect = W / H;
    const cam = new THREE.OrthographicCamera(-extent * aspect, extent * aspect, extent, -extent, 0.1, 1000);
    cam.position.set(cx + extent, extent, cz + extent);
    cam.lookAt(cx, 0, cz);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(cam, renderer.domElement);
    controls.target.set(cx, 0, cz);
    controls.enableDamping = true;
    controls.update();

    let raf = 0;
    const loop = () => { controls.update(); renderer.render(scene, cam); raf = requestAnimationFrame(loop); };
    loop();

    const onResize = () => {
      const w2 = mount.clientWidth, h2 = mount.clientHeight;
      const a = w2 / h2;
      cam.left = -extent * a; cam.right = extent * a; cam.top = extent; cam.bottom = -extent;
      cam.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [lines, layout]);

  return (
    <div>
      <div ref={mountRef} className="h-[520px] w-full rounded-lg border border-brand-line bg-white" />
      <p className="mt-2 text-[11px] text-neutral-500">
        Isometric massing built from the quote dimensions and plan layout. Drag to rotate, scroll to zoom.
        Furniture is sized to the quoted W×H; exact positions are approximate.
      </p>
    </div>
  );
}
