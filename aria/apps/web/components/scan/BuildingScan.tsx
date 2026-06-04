"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { USDZLoader } from "three/examples/jsm/loaders/USDZLoader.js";

// Seeded UUID → public USDZ path. Add new buildings here as scans land.
const SCANS: Record<string, string> = {
  "014b39a9-09b8-432b-9b62-363e06383d1f": "/scans/building_a/scan.usdz",
  "870d979d-6eaf-4d7f-894a-8ca34e527237": "/scans/building_b/scan.usdz",
};

export function BuildingScan({ buildingId }: { buildingId: string }) {
  const scanUrl = SCANS[buildingId];
  const mountRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [vertexCount, setVertexCount] = useState<number | null>(null);

  useEffect(() => {
    if (!scanUrl) return;
    const mount = mountRef.current;
    if (!mount) return;

    let cancelled = false;
    let raf = 0;

    (async () => {
      if (cancelled) return;

      const width = mount.clientWidth || 400;
      const height = mount.clientHeight || 230;

      const scene = new THREE.Scene();
      scene.background = null;

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 500);
      camera.position.set(0, 0.4, 2.2);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      mount.appendChild(renderer.domElement);

      const hemi = new THREE.HemisphereLight(0xffffff, 0x111122, 0.85);
      scene.add(hemi);
      const key = new THREE.DirectionalLight(0xffffff, 1.2);
      key.position.set(3, 4, 2);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffb27a, 0.35);
      fill.position.set(-2, 1, -3);
      scene.add(fill);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.8;
      controls.minDistance = 0.4;
      controls.maxDistance = 8;
      controls.addEventListener("start", () => {
        controls.autoRotate = false;
        setInteracted(true);
      });

      const loader = new USDZLoader();
      try {
        const group = await loader.loadAsync(scanUrl);
        if (cancelled) return;

        // Recenter and fit to view. Distance is computed from the bounding
        // box, fitted to whichever screen axis is tighter, then placed at a
        // cinematic 3/4 angle.
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        group.position.sub(center);
        scene.add(group);

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const fov = (camera.fov * Math.PI) / 180;
        const aspect = mount.clientWidth / mount.clientHeight;
        const distH = maxDim / (2 * Math.tan(fov / 2));
        const distW = distH / aspect;
        const fitOffset = 1.15;
        const dist = fitOffset * Math.max(distH, distW);

        const cinematic = new THREE.Vector3(0.55, 0.4, 1).normalize();
        camera.position.copy(cinematic.multiplyScalar(dist));
        camera.near = Math.max(0.001, dist / 500);
        camera.far = dist * 50;
        camera.updateProjectionMatrix();
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.minDistance = dist * 0.3;
        controls.maxDistance = dist * 4;
        controls.update();

        // Real vertex count for the metadata overlay.
        let verts = 0;
        group.traverse((obj: THREE.Object3D) => {
          if ((obj as THREE.Mesh).isMesh) {
            const geom = (obj as THREE.Mesh).geometry;
            const attr = geom?.attributes?.position;
            if (attr) verts += attr.count;
          }
        });
        setVertexCount(verts);
        setLoaded(true);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[building-scan] USDZ load failed", err);
        if (!cancelled) setFailed(true);
      }

      const onResize = () => {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        if (w === 0 || h === 0) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(mount);

      const tick = () => {
        controls.update();
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      tick();

      // cleanup closure
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        controls.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      };
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      // The async init also installs a cleanup; that runs separately via the
      // closure above. We just stop the loop here.
      while (mount.firstChild) mount.removeChild(mount.firstChild);
    };
  }, [scanUrl]);

  return (
    <section className="relative flex h-full flex-col gap-2 bg-[#0a0a0a] p-3">
      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.3em]">
        <div className="flex items-center gap-2 text-[#ff6b00]/80">
          <span className="h-1 w-1 bg-[#ff6b00]" />
          3D SCAN · LIDAR CAPTURE
        </div>
        <span className="text-white/30">
          {failed ? "PROCESSING" : loaded ? "READY" : "LOADING"}
        </span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-sm border border-[#ff6b00]/20 bg-black/60">
        <div
          ref={mountRef}
          className="absolute inset-0"
          style={{
            transition: "opacity 400ms ease-out",
            opacity: loaded ? 1 : 0,
          }}
        />

        {!loaded && !failed && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] tracking-[0.3em] text-white/30">
            DECODING SCAN…
          </div>
        )}
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] tracking-[0.3em] text-white/40">
            SCAN PROCESSING…
          </div>
        )}

        {loaded && !failed && (
          <ScanMetadata vertexCount={vertexCount} />
        )}

        {loaded && !interacted && !failed && (
          <div className="pointer-events-none absolute bottom-3 right-4 font-mono text-[9px] tracking-[0.3em] text-white/40 transition-opacity duration-300">
            DRAG TO ROTATE · SCROLL TO ZOOM
          </div>
        )}
      </div>
    </section>
  );
}

function ScanMetadata({ vertexCount }: { vertexCount: number | null }) {
  const vertsLabel = vertexCount
    ? vertexCount >= 1_000_000
      ? `${(vertexCount / 1_000_000).toFixed(1)}M VERTICES`
      : `${Math.round(vertexCount / 1000)}K VERTICES`
    : "180K VERTICES";
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-white/[0.08] bg-black/70 px-3 py-2 font-mono text-[10px] leading-relaxed backdrop-blur">
      <Row label="CAPTURE" value="PHONE LIDAR · 5 MIN" />
      <Row label="MESH" value={vertsLabel} />
      <Row label="ACCURACY" value="±5CM" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 whitespace-nowrap">
      <span className="w-20 shrink-0 tracking-[0.2em] text-[#ff6b00]/70">
        {label}
      </span>
      <span className="text-white/85">{value}</span>
    </div>
  );
}
