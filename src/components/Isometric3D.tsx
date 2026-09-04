"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { QuoteLine } from "@/lib/types";

export interface RoomLayout {
  name: string;
  wMm: number;
  dMm: number;
  x: number | null;
  y: number | null;
}

const M = 1000; // mm → metres
const mat = (c: number, rough = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0.05 });
function box(w: number, h: number, d: number, c: number, rough = 0.85) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, rough));
}

// ---- Furniture builders (metres). Each faces +z (into the room), base at y=0,
// centred on x. Returns the group + its footprint {w, d} and optional yOffset. ----
type Built = { group: THREE.Group; w: number; d: number; y?: number };

function wardrobe(w: number, h = 2.1): Built {
  const g = new THREE.Group();
  const body = box(w, h, 0.6, 0x8b5e3c); body.position.y = h / 2; g.add(body);
  const doors = Math.max(2, Math.round(w / 0.5));
  for (let i = 1; i < doors; i++) {
    const line = box(0.015, h - 0.1, 0.01, 0x5a3a22);
    line.position.set(-w / 2 + (w / doors) * i, h / 2, 0.31); g.add(line);
  }
  for (let i = 0; i < doors; i++) {
    const hd = box(0.02, 0.18, 0.03, 0x2b2b2b);
    hd.position.set(-w / 2 + (w / doors) * (i + 0.5), h * 0.55, 0.32); g.add(hd);
  }
  return { group: g, w, d: 0.6 };
}
function bed(w: number): Built {
  const g = new THREE.Group(); const L = 2.0;
  g.add(place(box(w, 0.3, L, 0x6b4b3a), 0, 0.15, 0));
  g.add(place(box(w - 0.1, 0.18, L - 0.1, 0xeae2d6), 0, 0.4, 0.02));
  g.add(place(box(w, 0.7, 0.08, 0x7c93b8), 0, 0.45, -L / 2 + 0.04));
  for (const sx of [-1, 1]) g.add(place(box(w / 2 - 0.12, 0.12, 0.4, 0xffffff), sx * (w / 4), 0.55, -L / 2 + 0.35));
  const duvet = box(w - 0.06, 0.1, L - 0.7, 0x9fb0cc); duvet.position.set(0, 0.5, 0.25); g.add(duvet);
  return { group: g, w, d: L };
}
function sofa(w: number): Built {
  const g = new THREE.Group(); const d = 0.9;
  g.add(place(box(w, 0.35, d, 0x8a8f98), 0, 0.2, 0.05));
  g.add(place(box(w, 0.5, 0.18, 0x777c85), 0, 0.5, -d / 2 + 0.09));
  for (const sx of [-1, 1]) g.add(place(box(0.18, 0.45, d, 0x6f747d), sx * (w / 2 - 0.09), 0.42, 0));
  for (let i = 0; i < Math.max(2, Math.round(w / 0.8)); i++) g.add(place(box(0.35, 0.12, 0.35, 0xb9c1cc), -w / 2 + 0.4 + i * 0.7, 0.42, 0.1));
  return { group: g, w, d };
}
function kitchen(w: number): Built {
  const g = new THREE.Group(); const d = 0.6;
  g.add(place(box(w, 0.72, d, 0xd8b38a), 0, 0.36, 0));
  g.add(place(box(w, 0.05, d + 0.03, 0x4a4a4a, 0.4), 0, 0.75, 0.01)); // counter
  g.add(place(box(w, 0.6, 0.34, 0xcdb090), 0, 1.7, -d / 2 + 0.17)); // uppers
  const doors = Math.max(2, Math.round(w / 0.6));
  for (let i = 1; i < doors; i++) g.add(place(box(0.015, 0.66, 0.01, 0xa9835f), -w / 2 + (w / doors) * i, 0.4, d / 2 - 0.01));
  return { group: g, w, d };
}
function tvUnit(w: number, h = 1.5): Built {
  const g = new THREE.Group(); const d = 0.4;
  g.add(place(box(w, 0.4, d, 0x3a3a3a), 0, 0.2, 0));
  g.add(place(box(w * 0.85, Math.min(0.9, h * 0.5), 0.05, 0x111111, 0.3), 0, 1.15, -d / 2 + 0.03)); // screen
  return { group: g, w, d };
}
function dining(): Built {
  const g = new THREE.Group();
  g.add(place(box(1.2, 0.05, 0.8, 0x8a5a3c), 0, 0.74, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(place(box(0.06, 0.74, 0.06, 0x6b4326), sx * 0.55, 0.37, sz * 0.35));
  for (const sz of [-1, 1]) for (const sx of [-0.4, 0.4]) {
    g.add(place(box(0.38, 0.45, 0.38, 0xbfae95), sx, 0.22, sz * 0.62));
    g.add(place(box(0.38, 0.4, 0.05, 0xbfae95), sx, 0.62, sz * (0.62 + (sz > 0 ? 0.16 : -0.16))));
  }
  return { group: g, w: 1.6, d: 1.7 };
}
function mandir(w: number, h = 1.6): Built {
  const g = new THREE.Group();
  g.add(place(box(w, h * 0.7, 0.4, 0xc79a3e), 0, h * 0.35, 0));
  const dome = new THREE.Mesh(new THREE.ConeGeometry(w * 0.4, 0.35, 6), mat(0xd4a017));
  dome.position.set(0, h * 0.7 + 0.18, 0); g.add(dome);
  return { group: g, w, d: 0.4 };
}
function desk(w: number): Built {
  const g = new THREE.Group();
  g.add(place(box(Math.max(0.9, w), 0.05, 0.55, 0xb98a6a), 0, 0.74, 0));
  g.add(place(box(0.5, 0.6, 0.5, 0x555, 0.4), 0, 0.3, 0.35)); // chair-ish
  return { group: g, w: Math.max(0.9, w), d: 0.9 };
}
function console(w: number): Built {
  const g = new THREE.Group();
  g.add(place(box(w, 0.5, 0.4, 0xa9744f), 0, 0.25, 0)); return { group: g, w, d: 0.4 };
}
function dressing(w: number): Built {
  const g = new THREE.Group();
  g.add(place(box(w, 0.75, 0.45, 0xc0a0b0), 0, 0.375, 0));
  g.add(place(box(w * 0.8, 0.9, 0.03, 0xdfe9ef, 0.2), 0, 1.3, -0.2)); return { group: g, w, d: 0.45 };
}
function plant(): Built {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.3, 12), mat(0xa9744f));
  pot.position.y = 0.15; g.add(pot);
  const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), mat(0x4f7d3a)); f.position.y = 0.55; g.add(f);
  return { group: g, w: 0.4, d: 0.4 };
}
function generic(w: number, h: number, d: number, c: number): Built {
  const g = new THREE.Group(); g.add(place(box(w, h, d, c), 0, h / 2, 0)); return { group: g, w, d };
}
function place<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T { o.position.set(x, y, z); return o; }

// Which primary furniture to model for a room (keeps the scene clean & readable).
function primaryFor(room: string, lines: QuoteLine[]): Built[] {
  const out: Built[] = [];
  const push = (b: Built) => out.push(b);
  const rL = lines.filter((l) => l.room === room);
  const has = (kw: string) => rL.find((l) => l.product.toLowerCase().includes(kw));
  const widthM = (l?: QuoteLine, def = 1.6) => (l && l.width ? l.width / M : def);

  if (/kitchen/i.test(room)) { const b = has("base cabinet"); push(kitchen(widthM(b, 2.4))); }
  if (/bedroom/i.test(room)) {
    const w = has("wardrobe"); push(wardrobe(widthM(w, 1.8), (w?.height || 2100) / M));
    push(bed(/king/i.test(room) ? 1.8 : 1.6));
    if (has("dressing")) push(dressing(0.9));
  }
  if (/living|dining|foyer/i.test(room)) {
    const tv = has("tv"); push(tvUnit(widthM(tv, 1.8), (tv?.height || 1500) / M));
    push(sofa(2.0)); push(dining());
    if (has("mandir")) push(mandir(0.6));
    if (has("console") || has("shoe")) push(console(1.2));
    push(plant());
  }
  if (/study|office/i.test(room)) { push(desk(1.2)); if (has("wardrobe")) push(wardrobe(1.2)); }
  return out;
}

export default function Isometric3D({ lines, layout }: { lines: QuoteLine[]; layout: RoomLayout[] }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<() => string>(() => "");
  const [aiImg, setAiImg] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = mount.clientWidth || 800;
    const H = mount.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef0f3);

    const physical = layout.filter((r) => r.name && !/other services/i.test(r.name));
    const roomNames = physical.length
      ? physical.map((r) => r.name)
      : Array.from(new Set(lines.map((l) => l.room))).filter((r) => !/other services/i.test(r));

    const foot = (name: string) => {
      const r = physical.find((x) => x.name === name);
      return { w: (r && r.wMm ? r.wMm : 3600) / M, d: (r && r.dMm ? r.dMm : 3600) / M };
    };
    const usePos = physical.length > 0 && physical.every((r) => typeof r.x === "number" && typeof r.y === "number");
    const SPAN = 13;
    const pos: Record<string, { x: number; z: number }> = {};
    if (usePos) roomNames.forEach((n) => { const r = physical.find((x) => x.name === n)!; pos[n] = { x: ((r.x as number) / 100 - 0.5) * SPAN, z: ((r.y as number) / 100 - 0.5) * SPAN }; });
    else { const cols = Math.ceil(Math.sqrt(roomNames.length)); const cell = Math.max(4, ...roomNames.map((n) => Math.max(foot(n).w, foot(n).d))) + 1.2; roomNames.forEach((n, i) => { pos[n] = { x: ((i % cols) - (cols - 1) / 2) * cell, z: (Math.floor(i / cols) - (Math.ceil(roomNames.length / cols) - 1) / 2) * cell }; }); }

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3eee7, roughness: 1 });
    const roomTint: Record<string, number> = { Kitchen: 0xf0e6d6, "Master Bedroom": 0xe6ecf5, "Kids Bedroom": 0xe7f1e7, "Guest Bedroom": 0xf1eadf, "Parents Bedroom": 0xefe6f2, "Living, Dining & Foyer": 0xf3edda, "Office / Study": 0xeae7f2 };

    function label(text: string): THREE.Sprite {
      const c = document.createElement("canvas"); c.width = 256; c.height = 64;
      const ctx = c.getContext("2d")!; ctx.fillStyle = "#531220"; ctx.font = "bold 26px Arial"; ctx.textAlign = "center"; ctx.fillText(text, 128, 42);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true })); s.scale.set(2.2, 0.55, 1); return s;
    }

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    const WALL_H = 1.4;

    for (const name of roomNames) {
      const { w, d } = foot(name);
      const p = pos[name] || { x: 0, z: 0 };
      const g = new THREE.Group(); g.position.set(p.x, 0, p.z);
      g.add(place(new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), mat(roomTint[name] ?? 0xf5efe6, 1)), 0, -0.03, 0));
      // far walls only (dollhouse): back (-z) and left (-x)
      g.add(place(box(w, WALL_H, 0.08, 0xf3eee7, 1), 0, WALL_H / 2, -d / 2));
      g.add(place(box(0.08, WALL_H, d, 0xeae3da, 1), -w / 2, WALL_H / 2, 0));
      const lab = label(name.replace(", Dining & Foyer", "")); lab.position.set(0, WALL_H + 0.4, 0); g.add(lab);

      // place primary furniture along back then left wall, facing inward
      const items = primaryFor(name, lines);
      let backX = -w / 2 + 0.3, leftZ = -d / 2 + 0.3, onLeft = false;
      for (const it of items) {
        if (!onLeft && backX + it.w > w / 2 - 0.2) onLeft = true;
        if (!onLeft) {
          it.group.position.set(backX + it.w / 2, it.y ?? 0, -d / 2 + it.d / 2 + 0.06);
          backX += it.w + 0.25;
        } else {
          it.group.rotation.y = Math.PI / 2;
          it.group.position.set(-w / 2 + it.d / 2 + 0.06, it.y ?? 0, leftZ + it.w / 2);
          leftZ += it.w + 0.25;
        }
        g.add(it.group);
      }
      scene.add(g);
      minX = Math.min(minX, p.x - w / 2); maxX = Math.max(maxX, p.x + w / 2);
      minZ = Math.min(minZ, p.z - d / 2); maxZ = Math.max(maxZ, p.z + d / 2);
    }

    if (!isFinite(minX)) { minX = -4; maxX = 4; minZ = -4; maxZ = 4; }
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const extent = Math.max(maxX - minX, maxZ - minZ, 4) * 0.62;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe3e8, 0.7));
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(extent * 2, extent * 3, extent); scene.add(dir);

    const aspect = W / H;
    const cam = new THREE.OrthographicCamera(-extent * aspect, extent * aspect, extent, -extent, 0.1, 2000);
    cam.position.set(cx + extent * 2, extent * 2.2, cz + extent * 2); cam.lookAt(cx, 0, cz);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio)); renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);
    captureRef.current = () => renderer.domElement.toDataURL("image/png");

    const controls = new OrbitControls(cam, renderer.domElement); controls.target.set(cx, 0, cz); controls.enableDamping = true; controls.update();
    let raf = 0; const loop = () => { controls.update(); renderer.render(scene, cam); raf = requestAnimationFrame(loop); }; loop();
    const onResize = () => { const a = mount.clientWidth / mount.clientHeight; cam.left = -extent * a; cam.right = extent * a; cam.top = extent; cam.bottom = -extent; cam.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); controls.dispose(); renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); };
  }, [lines, layout]);

  function download() {
    const url = captureRef.current(); if (!url) return;
    const a = document.createElement("a"); a.href = url; a.download = "hauspire-3d.png"; a.click();
  }
  async function aiRender() {
    const url = captureRef.current(); if (!url) return;
    setBusy(true); setAiStatus("Rendering… (AI beautify)"); setAiImg("");
    try {
      const res = await fetch("/api/render-3d", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ imageBase64: url.split(",")[1] }) });
      if (res.status === 501) { setAiStatus("AI render not configured — set an image-generation key (see notes)."); return; }
      if (res.status === 429) { setAiStatus("Image-AI quota exceeded — this needs billing enabled. Use ⬇ Download image (free) instead."); return; }
      if (!res.ok) { const e = await res.json().catch(() => ({} as any)); setAiStatus(`AI render failed: ${e.message || (e.detail ? String(e.detail).slice(0, 160) : res.status)}`); return; }
      const d = await res.json();
      if (d.image) { setAiImg(`data:image/png;base64,${d.image}`); setAiStatus(""); } else setAiStatus("No image returned.");
    } catch (e: any) { setAiStatus(`Error: ${String(e?.message || e)}`); } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="no-print mb-2 flex gap-2">
        <button onClick={download} className="rounded border border-brand px-3 py-1 text-sm font-semibold text-brand">⬇ Download image</button>
        <button onClick={aiRender} disabled={busy} className="rounded bg-brand px-3 py-1 text-sm font-bold text-white disabled:opacity-50">✨ AI render this view</button>
        {aiStatus && <span className="self-center text-[11px] text-neutral-500">{aiStatus}</span>}
      </div>
      <div ref={mountRef} className="h-[520px] w-full rounded-lg border border-brand-line bg-white" />
      {aiImg && (
        <div className="mt-3">
          <div className="text-xs font-semibold text-brand">AI-rendered view</div>
          <img src={aiImg} alt="AI render" className="mt-1 w-full max-w-2xl rounded-lg border border-brand-line" />
        </div>
      )}
      <p className="mt-2 text-[11px] text-neutral-500">
        Furnished isometric built from the quote dimensions and plan layout — drag to rotate, scroll to zoom.
        “AI render” beautifies this exact view (needs an image-generation key); the model above stays dimensionally accurate.
      </p>
    </div>
  );
}
