import React from "react";
import type { FitExercise } from "../../fit/fitStore";
import { getFitMocapBinding, resolveFitMotionKey } from "../../fit/awenaMocapRegistry";

type Vec3 = [number, number, number];
type Joint =
  | "head" | "neck"
  | "shoulderL" | "shoulderR" | "elbowL" | "elbowR" | "handL" | "handR"
  | "hipL" | "hipR" | "kneeL" | "kneeR" | "ankleL" | "ankleR" | "toeL" | "toeR";
type Pose3D = Record<Joint, Vec3>;
type Equipment3D = "none" | "barbell" | "dumbbells" | "kettlebell" | "pullup";
type Motion3D = { start: Pose3D; end: Pose3D; duration: number; equipment: Equipment3D; cueA: string; cueB: string };

const V = (x: number, y: number, z = 0): Vec3 => [x, y, z];
const pose = (partial: Partial<Pose3D> = {}): Pose3D => ({
  head: V(0, 2.73, 0), neck: V(0, 2.38, 0),
  shoulderL: V(-.42, 2.25, 0), shoulderR: V(.42, 2.25, 0),
  elbowL: V(-.54, 1.78, .02), elbowR: V(.54, 1.78, .02),
  handL: V(-.55, 1.35, .04), handR: V(.55, 1.35, .04),
  hipL: V(-.22, 1.35, 0), hipR: V(.22, 1.35, 0),
  kneeL: V(-.25, .68, .04), kneeR: V(.25, .68, .04),
  ankleL: V(-.27, .08, 0), ankleR: V(.27, .08, 0),
  toeL: V(-.27, .03, .30), toeR: V(.27, .03, .30),
  ...partial,
});

const standing = pose();
const MOTIONS_3D: Record<string, Motion3D> = {
  squat: {
    start: pose({ handL: V(-.34, 2.22, .08), handR: V(.34, 2.22, .08), elbowL: V(-.58, 2.05, .12), elbowR: V(.58, 2.05, .12) }),
    end: pose({
      head: V(0, 2.16, .06), neck: V(0, 1.84, .05), shoulderL: V(-.42, 1.72, .05), shoulderR: V(.42, 1.72, .05),
      elbowL: V(-.58, 1.56, .15), elbowR: V(.58, 1.56, .15), handL: V(-.34, 1.70, .12), handR: V(.34, 1.70, .12),
      hipL: V(-.24, 1.00, -.22), hipR: V(.24, 1.00, -.22), kneeL: V(-.48, .63, .30), kneeR: V(.48, .63, .30),
      ankleL: V(-.30, .08, 0), ankleR: V(.30, .08, 0), toeL: V(-.30, .03, .34), toeR: V(.30, .03, .34),
    }), duration: 2600, equipment: "barbell", cueA: "DESCENDS", cueB: "POUSSE",
  },
  goblet: {
    start: pose({ elbowL: V(-.28, 2.00, .20), elbowR: V(.28, 2.00, .20), handL: V(-.12, 1.92, .32), handR: V(.12, 1.92, .32) }),
    end: pose({
      head: V(0, 2.16, .06), neck: V(0, 1.84, .05), shoulderL: V(-.42, 1.72, .05), shoulderR: V(.42, 1.72, .05),
      elbowL: V(-.31, 1.55, .25), elbowR: V(.31, 1.55, .25), handL: V(-.12, 1.48, .36), handR: V(.12, 1.48, .36),
      hipL: V(-.24, 1.00, -.22), hipR: V(.24, 1.00, -.22), kneeL: V(-.48, .63, .30), kneeR: V(.48, .63, .30),
      ankleL: V(-.30, .08, 0), ankleR: V(.30, .08, 0), toeL: V(-.30, .03, .34), toeR: V(.30, .03, .34),
    }), duration: 2600, equipment: "kettlebell", cueA: "DESCENDS", cueB: "REMONTÉE",
  },
  deadlift: {
    start: pose({ handL: V(-.28, 1.24, .22), handR: V(.28, 1.24, .22), elbowL: V(-.34, 1.75, .12), elbowR: V(.34, 1.75, .12) }),
    end: pose({
      head: V(0, 1.78, .48), neck: V(0, 1.57, .36), shoulderL: V(-.38, 1.48, .34), shoulderR: V(.38, 1.48, .34),
      elbowL: V(-.31, 1.02, .43), elbowR: V(.31, 1.02, .43), handL: V(-.29, .54, .42), handR: V(.29, .54, .42),
      hipL: V(-.22, 1.12, -.12), hipR: V(.22, 1.12, -.12), kneeL: V(-.27, .62, .22), kneeR: V(.27, .62, .22),
    }), duration: 2800, equipment: "barbell", cueA: "CHARNIÈRE", cueB: "VERROUILLE",
  },
  rdl: {
    start: pose({ handL: V(-.28, 1.24, .22), handR: V(.28, 1.24, .22), elbowL: V(-.34, 1.75, .12), elbowR: V(.34, 1.75, .12) }),
    end: pose({
      head: V(0, 1.82, .56), neck: V(0, 1.63, .43), shoulderL: V(-.38, 1.53, .40), shoulderR: V(.38, 1.53, .40),
      elbowL: V(-.31, 1.13, .46), elbowR: V(.31, 1.13, .46), handL: V(-.29, .73, .44), handR: V(.29, .73, .44),
      hipL: V(-.22, 1.19, -.27), hipR: V(.22, 1.19, -.27), kneeL: V(-.25, .66, .08), kneeR: V(.25, .66, .08),
    }), duration: 2850, equipment: "barbell", cueA: "HANCHES ARRIÈRE", cueB: "REMONTÉE",
  },
  curl: {
    start: standing,
    end: pose({ elbowL: V(-.52, 1.79, .04), elbowR: V(.52, 1.79, .04), handL: V(-.42, 2.18, .18), handR: V(.42, 2.18, .18) }),
    duration: 2300, equipment: "dumbbells", cueA: "FLÉCHIS", cueB: "CONTRÔLE",
  },
  "lateral-raise": {
    start: standing,
    end: pose({ elbowL: V(-.92, 2.18, .02), elbowR: V(.92, 2.18, .02), handL: V(-1.34, 2.18, .02), handR: V(1.34, 2.18, .02) }),
    duration: 2450, equipment: "dumbbells", cueA: "MONTE", cueB: "DESCENDS",
  },
  ohp: {
    start: pose({ elbowL: V(-.55, 2.02, .05), elbowR: V(.55, 2.02, .05), handL: V(-.35, 2.35, .05), handR: V(.35, 2.35, .05) }),
    end: pose({ elbowL: V(-.38, 2.60, .02), elbowR: V(.38, 2.60, .02), handL: V(-.34, 3.10, .02), handR: V(.34, 3.10, .02) }),
    duration: 2350, equipment: "barbell", cueA: "POUSSE", cueB: "REVIENS",
  },
  pullup: {
    start: pose({
      head: V(0, 2.18, 0), neck: V(0, 1.88, 0), shoulderL: V(-.40, 1.78, 0), shoulderR: V(.40, 1.78, 0),
      elbowL: V(-.60, 2.26, 0), elbowR: V(.60, 2.26, 0), handL: V(-.67, 2.92, 0), handR: V(.67, 2.92, 0),
      hipL: V(-.20, .92, 0), hipR: V(.20, .92, 0), kneeL: V(-.22, .38, .03), kneeR: V(.22, .38, .03),
      ankleL: V(-.20, -.10, .04), ankleR: V(.20, -.10, .04), toeL: V(-.20, -.12, .30), toeR: V(.20, -.12, .30),
    }),
    end: pose({
      head: V(0, 2.72, .08), neck: V(0, 2.43, .04), shoulderL: V(-.40, 2.30, 0), shoulderR: V(.40, 2.30, 0),
      elbowL: V(-.69, 2.42, .03), elbowR: V(.69, 2.42, .03), handL: V(-.67, 2.92, 0), handR: V(.67, 2.92, 0),
      hipL: V(-.20, 1.46, 0), hipR: V(.20, 1.46, 0), kneeL: V(-.22, .90, .03), kneeR: V(.22, .90, .03),
      ankleL: V(-.20, .38, .04), ankleR: V(.20, .38, .04), toeL: V(-.20, .36, .30), toeR: V(.20, .36, .30),
    }), duration: 2700, equipment: "pullup", cueA: "TIRE", cueB: "REDESCENDS",
  },
  row: {
    start: pose({
      head: V(0, 1.82, .58), neck: V(0, 1.62, .43), shoulderL: V(-.38, 1.52, .39), shoulderR: V(.38, 1.52, .39),
      elbowL: V(-.37, 1.13, .48), elbowR: V(.37, 1.13, .48), handL: V(-.30, .72, .53), handR: V(.30, .72, .53),
      hipL: V(-.22, 1.18, -.20), hipR: V(.22, 1.18, -.20), kneeL: V(-.27, .63, .09), kneeR: V(.27, .63, .09),
    }),
    end: pose({
      head: V(0, 1.82, .58), neck: V(0, 1.62, .43), shoulderL: V(-.38, 1.52, .39), shoulderR: V(.38, 1.52, .39),
      elbowL: V(-.45, 1.36, -.02), elbowR: V(.45, 1.36, -.02), handL: V(-.28, 1.25, .10), handR: V(.28, 1.25, .10),
      hipL: V(-.22, 1.18, -.20), hipR: V(.22, 1.18, -.20), kneeL: V(-.27, .63, .09), kneeR: V(.27, .63, .09),
    }), duration: 2450, equipment: "barbell", cueA: "TIRE", cueB: "ALLONGE",
  },
  "lat-pulldown": {
    start: pose({ elbowL: V(-.62, 2.52, .02), elbowR: V(.62, 2.52, .02), handL: V(-.75, 2.95, .02), handR: V(.75, 2.95, .02) }),
    end: pose({ elbowL: V(-.60, 1.94, .03), elbowR: V(.60, 1.94, .03), handL: V(-.42, 2.20, .06), handR: V(.42, 2.20, .06) }),
    duration: 2500, equipment: "barbell", cueA: "TIRE", cueB: "REMONTÉE",
  },
  "triceps-push": {
    start: pose({ elbowL: V(-.42, 1.91, .16), elbowR: V(.42, 1.91, .16), handL: V(-.31, 1.76, .31), handR: V(.31, 1.76, .31) }),
    end: pose({ elbowL: V(-.42, 1.91, .16), elbowR: V(.42, 1.91, .16), handL: V(-.38, 1.28, .18), handR: V(.38, 1.28, .18) }),
    duration: 2250, equipment: "none", cueA: "POUSSE", cueB: "REVIENS",
  },
  "cable-fly": {
    start: pose({ elbowL: V(-.91, 2.13, .05), elbowR: V(.91, 2.13, .05), handL: V(-1.27, 1.98, .23), handR: V(1.27, 1.98, .23) }),
    end: pose({ elbowL: V(-.44, 2.05, .18), elbowR: V(.44, 2.05, .18), handL: V(-.10, 1.98, .50), handR: V(.10, 1.98, .50) }),
    duration: 2550, equipment: "none", cueA: "RESSERRE", cueB: "OUVRE",
  },
  bench: {
    start: pose({
      head: V(0, 1.02, .92), neck: V(0, 1.02, .62), shoulderL: V(-.42, 1.02, .44), shoulderR: V(.42, 1.02, .44),
      elbowL: V(-.72, 1.18, .38), elbowR: V(.72, 1.18, .38), handL: V(-.38, 1.35, .36), handR: V(.38, 1.35, .36),
      hipL: V(-.22, .95, -.32), hipR: V(.22, .95, -.32), kneeL: V(-.28, .58, -.80), kneeR: V(.28, .58, -.80),
      ankleL: V(-.31, .08, -.62), ankleR: V(.31, .08, -.62), toeL: V(-.31, .03, -.30), toeR: V(.31, .03, -.30),
    }),
    end: pose({
      head: V(0, 1.02, .92), neck: V(0, 1.02, .62), shoulderL: V(-.42, 1.02, .44), shoulderR: V(.42, 1.02, .44),
      elbowL: V(-.40, 1.57, .38), elbowR: V(.40, 1.57, .38), handL: V(-.38, 1.92, .36), handR: V(.38, 1.92, .36),
      hipL: V(-.22, .95, -.32), hipR: V(.22, .95, -.32), kneeL: V(-.28, .58, -.80), kneeR: V(.28, .58, -.80),
      ankleL: V(-.31, .08, -.62), ankleR: V(.31, .08, -.62), toeL: V(-.31, .03, -.30), toeR: V(.31, .03, -.30),
    }), duration: 2400, equipment: "barbell", cueA: "POUSSE", cueB: "DESCENDS",
  },
  "incline-db": {
    start: pose({ elbowL: V(-.66, 1.92, .14), elbowR: V(.66, 1.92, .14), handL: V(-.39, 2.14, .25), handR: V(.39, 2.14, .25) }),
    end: pose({ elbowL: V(-.39, 2.48, .08), elbowR: V(.39, 2.48, .08), handL: V(-.37, 2.87, .08), handR: V(.37, 2.87, .08) }),
    duration: 2350, equipment: "dumbbells", cueA: "POUSSE", cueB: "DESCENDS",
  },
  calf: {
    start: standing,
    end: pose(Object.fromEntries(Object.entries(standing).map(([key, p]) => [key, V(p[0], p[1] + .14, p[2])])) as Partial<Pose3D>),
    duration: 2200, equipment: "none", cueA: "MONTE", cueB: "CONTRÔLE",
  },
  plank: {
    start: pose({
      head: V(0, .93, .95), neck: V(0, .86, .64), shoulderL: V(-.37, .82, .42), shoulderR: V(.37, .82, .42),
      elbowL: V(-.40, .38, .35), elbowR: V(.40, .38, .35), handL: V(-.40, .10, .58), handR: V(.40, .10, .58),
      hipL: V(-.20, .70, -.42), hipR: V(.20, .70, -.42), kneeL: V(-.22, .42, -1.05), kneeR: V(.22, .42, -1.05),
      ankleL: V(-.22, .16, -1.55), ankleR: V(.22, .16, -1.55), toeL: V(-.22, .05, -1.36), toeR: V(.22, .05, -1.36),
    }),
    end: pose({
      head: V(0, .95, .95), neck: V(0, .88, .64), shoulderL: V(-.37, .84, .42), shoulderR: V(.37, .84, .42),
      elbowL: V(-.40, .38, .35), elbowR: V(.40, .38, .35), handL: V(-.40, .10, .58), handR: V(.40, .10, .58),
      hipL: V(-.20, .72, -.42), hipR: V(.20, .72, -.42), kneeL: V(-.22, .43, -1.05), kneeR: V(.22, .43, -1.05),
      ankleL: V(-.22, .16, -1.55), ankleR: V(.22, .16, -1.55), toeL: V(-.22, .05, -1.36), toeR: V(.22, .05, -1.36),
    }), duration: 3000, equipment: "none", cueA: "GAINE", cueB: "RESPIRE",
  },
  "hip-thrust": {
    start: pose({
      head: V(0, 1.05, .90), neck: V(0, 1.03, .60), shoulderL: V(-.40, 1.00, .40), shoulderR: V(.40, 1.00, .40),
      elbowL: V(-.55, .78, .18), elbowR: V(.55, .78, .18), handL: V(-.34, .70, -.10), handR: V(.34, .70, -.10),
      hipL: V(-.22, .55, -.42), hipR: V(.22, .55, -.42), kneeL: V(-.30, .70, -.98), kneeR: V(.30, .70, -.98),
      ankleL: V(-.32, .08, -1.12), ankleR: V(.32, .08, -1.12), toeL: V(-.32, .03, -.80), toeR: V(.32, .03, -.80),
    }),
    end: pose({
      head: V(0, 1.05, .90), neck: V(0, 1.03, .60), shoulderL: V(-.40, 1.00, .40), shoulderR: V(.40, 1.00, .40),
      elbowL: V(-.55, .90, .18), elbowR: V(.55, .90, .18), handL: V(-.34, .94, -.18), handR: V(.34, .94, -.18),
      hipL: V(-.22, 1.02, -.42), hipR: V(.22, 1.02, -.42), kneeL: V(-.30, .72, -.98), kneeR: V(.30, .72, -.98),
      ankleL: V(-.32, .08, -1.12), ankleR: V(.32, .08, -1.12), toeL: V(-.32, .03, -.80), toeR: V(.32, .03, -.80),
    }), duration: 2600, equipment: "barbell", cueA: "MONTE", cueB: "SERRE",
  },
  "leg-press": {
    start: pose({
      head: V(0, 1.78, -.65), neck: V(0, 1.57, -.48), shoulderL: V(-.38, 1.48, -.34), shoulderR: V(.38, 1.48, -.34),
      elbowL: V(-.48, 1.08, -.28), elbowR: V(.48, 1.08, -.28), handL: V(-.43, .77, -.12), handR: V(.43, .77, -.12),
      hipL: V(-.22, .82, .02), hipR: V(.22, .82, .02), kneeL: V(-.30, .84, .64), kneeR: V(.30, .84, .64),
      ankleL: V(-.32, .55, 1.02), ankleR: V(.32, .55, 1.02), toeL: V(-.32, .50, 1.28), toeR: V(.32, .50, 1.28),
    }),
    end: pose({
      head: V(0, 1.78, -.65), neck: V(0, 1.57, -.48), shoulderL: V(-.38, 1.48, -.34), shoulderR: V(.38, 1.48, -.34),
      elbowL: V(-.48, 1.08, -.28), elbowR: V(.48, 1.08, -.28), handL: V(-.43, .77, -.12), handR: V(.43, .77, -.12),
      hipL: V(-.22, .82, .02), hipR: V(.22, .82, .02), kneeL: V(-.28, .72, .94), kneeR: V(.28, .72, .94),
      ankleL: V(-.30, .72, 1.58), ankleR: V(.30, .72, 1.58), toeL: V(-.30, .67, 1.84), toeR: V(.30, .67, 1.84),
    }), duration: 2700, equipment: "none", cueA: "POUSSE", cueB: "REPLIE",
  },
};

export function hasFitAwena3DMotion(exercise: FitExercise): boolean {
  const key = resolveFitMotionKey(exercise);
  return Boolean(key && MOTIONS_3D[key]);
}

function lerpPose(a: Pose3D, b: Pose3D, t: number): Pose3D {
  const out = {} as Pose3D;
  (Object.keys(a) as Joint[]).forEach((key) => {
    const av = a[key], bv = b[key];
    out[key] = [av[0] + (bv[0] - av[0]) * t, av[1] + (bv[1] - av[1]) * t, av[2] + (bv[2] - av[2]) * t];
  });
  return out;
}

function center(a: Vec3, b: Vec3): Vec3 { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; }

export default function FitAwena3DStage({ exercise, compact = false, onFail }: { exercise: FitExercise; compact?: boolean; onFail?: () => void }) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const stoppedRef = React.useRef(false);
  const [ready, setReady] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const pausedRef = React.useRef(paused);
  pausedRef.current = paused;
  const motionKey = resolveFitMotionKey(exercise);
  const motion = motionKey ? MOTIONS_3D[motionKey] : null;
  const binding = getFitMocapBinding(exercise);
  const accent = exercise.accent || "#72def4";

  React.useEffect(() => {
    if (!hostRef.current || !motion || !motionKey) return;
    let disposed = false;
    let raf = 0;
    let resizeObserver: ResizeObserver | null = null;
    const disposables: any[] = [];
    const host = hostRef.current;
    stoppedRef.current = false;

    const boot = async () => {
      try {
        const importModule = new Function("url", "return import(url)") as (url: string) => Promise<any>;
        const THREE = await importModule("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js");
        if (disposed || !hostRef.current) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, .1, 50);
        let orbit = -.32;
        let pitch = .06;
        const cameraRadius = compact ? 5.7 : 5.0;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.display = "block";
        renderer.domElement.style.touchAction = "pan-y";
        host.replaceChildren(renderer.domElement);

        const root = new THREE.Group();
        root.rotation.y = .06;
        scene.add(root);

        const floor = new THREE.Mesh(
          new THREE.CircleGeometry(2.15, 64),
          new THREE.MeshStandardMaterial({ color: 0x0c1018, roughness: .82, metalness: .15, transparent: true, opacity: .72 }),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -.13;
        root.add(floor);
        disposables.push(floor.geometry, floor.material);

        const ring = new THREE.Mesh(
          new THREE.RingGeometry(1.55, 1.59, 72),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(accent), transparent: true, opacity: .34, side: THREE.DoubleSide }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -.115;
        root.add(ring);
        disposables.push(ring.geometry, ring.material);

        const hemi = new THREE.HemisphereLight(0xf4fbff, 0x15131c, 2.1);
        scene.add(hemi);
        const key = new THREE.DirectionalLight(0xffffff, 3.0); key.position.set(3, 5, 5); scene.add(key);
        const rim = new THREE.DirectionalLight(new THREE.Color(accent), 2.8); rim.position.set(-4, 3, -3); scene.add(rim);

        const skinMat = new THREE.MeshStandardMaterial({ color: 0xb9683f, roughness: .64, metalness: .02 });
        const skinLightMat = new THREE.MeshStandardMaterial({ color: 0xc8794e, roughness: .60 });
        const topMat = new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: .54, metalness: .22 });
        const shortsMat = new THREE.MeshStandardMaterial({ color: 0x0c0f16, roughness: .48, metalness: .24 });
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x2a1715, roughness: .73 });
        const hairHiMat = new THREE.MeshStandardMaterial({ color: 0x563026, roughness: .68 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: .5 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x121722, roughness: .4, metalness: .35 });
        const cyanMat = new THREE.MeshStandardMaterial({ color: 0x00d8ff, emissive: 0x003e50, emissiveIntensity: .75, roughness: .35 });
        const pinkMat = new THREE.MeshStandardMaterial({ color: 0xff4fc8, emissive: 0x4b092e, emissiveIntensity: .75, roughness: .35 });
        const limeMat = new THREE.MeshStandardMaterial({ color: 0x8cff58, emissive: 0x183b08, emissiveIntensity: .65, roughness: .35 });
        disposables.push(skinMat, skinLightMat, topMat, shortsMat, hairMat, hairHiMat, whiteMat, darkMat, cyanMat, pinkMat, limeMat);

        const limbDefs: Array<[string, Joint, Joint, number, any]> = [
          ["upperArmL", "shoulderL", "elbowL", .105, skinMat], ["upperArmR", "shoulderR", "elbowR", .105, skinMat],
          ["forearmL", "elbowL", "handL", .09, skinLightMat], ["forearmR", "elbowR", "handR", .09, skinLightMat],
          ["thighL", "hipL", "kneeL", .145, skinMat], ["thighR", "hipR", "kneeR", .145, skinMat],
          ["shinL", "kneeL", "ankleL", .11, skinLightMat], ["shinR", "kneeR", "ankleR", .11, skinLightMat],
        ];
        const limbMeshes = new Map<string, any>();
        for (const [name, , , radius, material] of limbDefs) {
          const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * .91, 1, 14, 1, false), material);
          mesh.name = name; root.add(mesh); limbMeshes.set(name, mesh); disposables.push(mesh.geometry);
        }

        const jointMeshes = new Map<Joint, any>();
        for (const joint of ["shoulderL","shoulderR","elbowL","elbowR","handL","handR","hipL","hipR","kneeL","kneeR","ankleL","ankleR"] as Joint[]) {
          const radius = joint.startsWith("hand") ? .105 : joint.startsWith("hip") ? .135 : .115;
          const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 12), skinMat);
          root.add(mesh); jointMeshes.set(joint, mesh); disposables.push(mesh.geometry);
        }

        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.33, .63, 8, 18), topMat);
        torso.scale.x = 1.08; root.add(torso); disposables.push(torso.geometry);
        const pelvis = new THREE.Mesh(new THREE.SphereGeometry(.36, 24, 16), shortsMat);
        pelvis.scale.set(1.05, .65, .82); root.add(pelvis); disposables.push(pelvis.geometry);
        const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(.105, .12, .20, 14), skinMat); root.add(neckMesh); disposables.push(neckMesh.geometry);
        const head = new THREE.Mesh(new THREE.SphereGeometry(.275, 28, 20), skinLightMat); head.scale.set(.86, 1.08, .90); root.add(head); disposables.push(head.geometry);
        const hairBack = new THREE.Mesh(new THREE.SphereGeometry(.305, 24, 18), hairMat); hairBack.scale.set(.95, 1.12, .82); root.add(hairBack); disposables.push(hairBack.geometry);
        const bun = new THREE.Mesh(new THREE.SphereGeometry(.17, 20, 14), hairHiMat); root.add(bun); disposables.push(bun.geometry);
        const ponyA = new THREE.Mesh(new THREE.CylinderGeometry(.075, .11, .55, 12), hairMat); root.add(ponyA); disposables.push(ponyA.geometry);
        const ponyB = new THREE.Mesh(new THREE.CylinderGeometry(.045, .08, .45, 12), hairHiMat); root.add(ponyB); disposables.push(ponyB.geometry);
        const chestAccentL = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .62, 8), cyanMat); root.add(chestAccentL); disposables.push(chestAccentL.geometry);
        const chestAccentR = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .62, 8), pinkMat); root.add(chestAccentR); disposables.push(chestAccentR.geometry);
        const waistAccent = new THREE.Mesh(new THREE.TorusGeometry(.32, .017, 8, 32), limeMat); waistAccent.rotation.x = Math.PI / 2; root.add(waistAccent); disposables.push(waistAccent.geometry);

        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(.025, 12, 8), darkMat); const eyeR = eyeL.clone();
        root.add(eyeL, eyeR); disposables.push(eyeL.geometry, eyeR.geometry);
        const mouth = new THREE.Mesh(new THREE.TorusGeometry(.055, .009, 6, 20, Math.PI), pinkMat); mouth.rotation.z = Math.PI; root.add(mouth); disposables.push(mouth.geometry);

        const shoeL = new THREE.Mesh(new THREE.BoxGeometry(.21, .12, .42), darkMat); const shoeR = shoeL.clone(); root.add(shoeL, shoeR); disposables.push(shoeL.geometry, shoeR.geometry);
        const shoeStripeL = new THREE.Mesh(new THREE.BoxGeometry(.22, .025, .30), whiteMat); const shoeStripeR = shoeStripeL.clone(); root.add(shoeStripeL, shoeStripeR); disposables.push(shoeStripeL.geometry, shoeStripeR.geometry);

        const equipmentGroup = new THREE.Group(); root.add(equipmentGroup);
        let bar: any = null; let plateL: any = null; let plateR: any = null; const dumbbells: any[] = [];
        if (motion.equipment === "barbell") {
          bar = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1.85, 12), whiteMat); bar.rotation.z = Math.PI / 2; equipmentGroup.add(bar); disposables.push(bar.geometry);
          plateL = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .10, 24), darkMat); plateL.rotation.z = Math.PI / 2; equipmentGroup.add(plateL); disposables.push(plateL.geometry);
          plateR = plateL.clone(); equipmentGroup.add(plateR);
        } else if (motion.equipment === "dumbbells") {
          for (let i = 0; i < 2; i++) {
            const g = new THREE.Group();
            const grip = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .30, 10), whiteMat); grip.rotation.z = Math.PI / 2; g.add(grip); disposables.push(grip.geometry);
            for (const x of [-.16, .16]) { const plate = new THREE.Mesh(new THREE.CylinderGeometry(.085, .085, .07, 16), darkMat); plate.rotation.z = Math.PI / 2; plate.position.x = x; g.add(plate); disposables.push(plate.geometry); }
            equipmentGroup.add(g); dumbbells.push(g);
          }
        } else if (motion.equipment === "kettlebell") {
          const bell = new THREE.Mesh(new THREE.SphereGeometry(.18, 20, 14), darkMat); bell.scale.y = 1.15; equipmentGroup.add(bell); dumbbells.push(bell); disposables.push(bell.geometry);
          const handle = new THREE.Mesh(new THREE.TorusGeometry(.14, .035, 10, 24, Math.PI), whiteMat); handle.rotation.z = Math.PI; equipmentGroup.add(handle); dumbbells.push(handle); disposables.push(handle.geometry);
        } else if (motion.equipment === "pullup") {
          bar = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 2.1, 12), whiteMat); bar.rotation.z = Math.PI / 2; bar.position.set(0, 2.93, 0); equipmentGroup.add(bar); disposables.push(bar.geometry);
        }

        const setSegment = (mesh: any, a: Vec3, b: Vec3) => {
          const av = new THREE.Vector3(...a); const bv = new THREE.Vector3(...b); const d = bv.clone().sub(av); const len = Math.max(.001, d.length());
          mesh.position.copy(av.add(bv).multiplyScalar(.5)); mesh.scale.set(1, len, 1); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
        };
        const setPoint = (mesh: any, p: Vec3) => mesh.position.set(p[0], p[1], p[2]);

        let drag = false, dragX = 0, dragY = 0;
        const down = (event: PointerEvent) => { drag = true; dragX = event.clientX; dragY = event.clientY; renderer.domElement.setPointerCapture?.(event.pointerId); };
        const move = (event: PointerEvent) => { if (!drag) return; const dx = event.clientX - dragX, dy = event.clientY - dragY; dragX = event.clientX; dragY = event.clientY; orbit -= dx * .009; pitch = Math.max(-.25, Math.min(.35, pitch + dy * .004)); };
        const up = () => { drag = false; };
        renderer.domElement.addEventListener("pointerdown", down); renderer.domElement.addEventListener("pointermove", move); renderer.domElement.addEventListener("pointerup", up); renderer.domElement.addEventListener("pointercancel", up);

        const resize = () => {
          if (!host) return; const rect = host.getBoundingClientRect(); const w = Math.max(10, rect.width), h = Math.max(10, rect.height);
          renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
        };
        resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host); resize();

        const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        const clockStart = performance.now();
        const update = (j: Pose3D, phase: number) => {
          for (const [name, a, b] of limbDefs) setSegment(limbMeshes.get(name), j[a], j[b]);
          jointMeshes.forEach((mesh, keyName) => setPoint(mesh, j[keyName]));
          const shoulderC = center(j.shoulderL, j.shoulderR), hipC = center(j.hipL, j.hipR), neck = j.neck;
          setSegment(torso, [shoulderC[0], shoulderC[1] + .04, shoulderC[2]], [hipC[0], hipC[1] + .10, hipC[2]]);
          torso.scale.x = 1.08; torso.scale.z = .72;
          pelvis.position.set(hipC[0], hipC[1] + .02, hipC[2]);
          setSegment(neckMesh, neck, [j.head[0], j.head[1] - .23, j.head[2]]);
          setPoint(head, j.head);
          hairBack.position.set(j.head[0], j.head[1] + .045, j.head[2] - .075);
          bun.position.set(j.head[0] + .04, j.head[1] + .30, j.head[2] - .09);
          setSegment(ponyA, [j.head[0] + .10, j.head[1] + .24, j.head[2] - .13], [j.head[0] + .24 + Math.sin(phase * Math.PI * 2) * .04, j.head[1] - .22, j.head[2] - .18]);
          setSegment(ponyB, [j.head[0] + .24, j.head[1] - .20, j.head[2] - .18], [j.head[0] + .13 + Math.sin(phase * Math.PI * 2) * .06, j.head[1] - .62, j.head[2] - .20]);
          eyeL.position.set(j.head[0] - .075, j.head[1] + .035, j.head[2] + .235); eyeR.position.set(j.head[0] + .075, j.head[1] + .035, j.head[2] + .235);
          mouth.position.set(j.head[0], j.head[1] - .095, j.head[2] + .245); mouth.rotation.x = Math.PI / 2; mouth.rotation.z = Math.PI;
          setSegment(chestAccentL, j.shoulderL, [neck[0] - .05, neck[1] - .05, neck[2] + .02]);
          setSegment(chestAccentR, j.shoulderR, [neck[0] + .05, neck[1] - .05, neck[2] + .02]);
          waistAccent.position.set(hipC[0], hipC[1] + .28, hipC[2]);
          for (const [shoe, stripe, ankle, toe] of [[shoeL, shoeStripeL, j.ankleL, j.toeL], [shoeR, shoeStripeR, j.ankleR, j.toeR]] as any[]) {
            const mid = center(ankle, toe); shoe.position.set(...mid); stripe.position.set(mid[0], mid[1] + .065, mid[2]);
            const angle = Math.atan2(toe[0] - ankle[0], toe[2] - ankle[2]); shoe.rotation.y = angle; stripe.rotation.y = angle;
          }
          if (motion.equipment === "barbell" && bar) {
            const handC = center(j.handL, j.handR); bar.position.set(handC[0], handC[1], handC[2]);
            plateL.position.set(handC[0] - .88, handC[1], handC[2]); plateR.position.set(handC[0] + .88, handC[1], handC[2]);
          } else if (motion.equipment === "dumbbells") {
            dumbbells[0]?.position.set(...j.handL); dumbbells[1]?.position.set(...j.handR);
          } else if (motion.equipment === "kettlebell") {
            const handC = center(j.handL, j.handR); dumbbells[0]?.position.set(handC[0], handC[1] - .16, handC[2]); dumbbells[1]?.position.set(handC[0], handC[1] + .02, handC[2]);
          }
        };

        const render = (now: number) => {
          if (disposed || stoppedRef.current) return;
          const elapsed = now - clockStart;
          const raw = reduced ? .22 : ((elapsed % motion.duration) / motion.duration);
          const phase = pausedRef.current ? .18 : raw;
          const t = (1 - Math.cos(phase * Math.PI * 2)) / 2;
          const j = lerpPose(motion.start, motion.end, t);
          update(j, phase);
          const targetY = motionKey === "plank" || motionKey === "bench" || motionKey === "hip-thrust" ? .85 : 1.42;
          camera.position.set(Math.sin(orbit) * cameraRadius, targetY + 1.12 + pitch, Math.cos(orbit) * cameraRadius);
          camera.lookAt(0, targetY, 0);
          renderer.render(scene, camera);
          raf = requestAnimationFrame(render);
        };
        raf = requestAnimationFrame(render);
        if (!disposed) setReady(true);

        const oldCleanup = () => {
          renderer.domElement.removeEventListener("pointerdown", down); renderer.domElement.removeEventListener("pointermove", move); renderer.domElement.removeEventListener("pointerup", up); renderer.domElement.removeEventListener("pointercancel", up);
          renderer.dispose(); disposables.forEach((resource) => resource?.dispose?.());
        };
        (host as any).__fit3dCleanup = oldCleanup;
      } catch (error) {
        console.warn("[FIT PERF] AWENA 3D runtime unavailable, keeping 2D fallback", error);
        if (!disposed) { setFailed(true); onFail?.(); }
      }
    };
    void boot();
    return () => {
      disposed = true; stoppedRef.current = true; cancelAnimationFrame(raf); resizeObserver?.disconnect();
      const cleanup = (host as any).__fit3dCleanup; if (typeof cleanup === "function") cleanup(); delete (host as any).__fit3dCleanup;
    };
  }, [motionKey, motion, compact, accent, onFail]);

  if (!motion || failed) return null;
  return <div style={{ position: "relative", width: "100%", height: compact ? 112 : 220, minHeight: compact ? 112 : 220, overflow: "hidden", background: `radial-gradient(circle at 50% 44%,${accent}16,rgba(2,4,9,.97) 68%)` }}>
    <div ref={hostRef} aria-label={`Démonstration 3D ${exercise.name}`} style={{ position: "absolute", inset: 0 }}/>
    {!ready ? <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(255,255,255,.62)", fontSize: compact ? 7 : 8.5, fontWeight: 900, letterSpacing: .7 }}>CHARGEMENT 3D…</div> : null}
    <div style={{ position: "absolute", left: 7, top: 7, display: "flex", gap: 5, alignItems: "center", padding: compact ? "3px 6px" : "4px 7px", borderRadius: 999, background: "rgba(3,5,10,.76)", border: `1px solid ${accent}42`, pointerEvents: "none" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}` }}/>
      <span style={{ color: accent, fontSize: compact ? 6 : 7, fontWeight: 1000, letterSpacing: .8 }}>AWENA · 3D LAB</span>
    </div>
    <div style={{ position: "absolute", right: 7, top: 7, padding: compact ? "3px 6px" : "4px 7px", borderRadius: 999, background: "rgba(3,5,10,.76)", border: "1px solid rgba(255,255,255,.09)", color: "rgba(255,255,255,.78)", fontSize: compact ? 5.8 : 6.8, fontWeight: 950, letterSpacing: .6, pointerEvents: "none" }}>{motion.cueA} · {motion.cueB}</div>
    {!compact && ready ? <div style={{ position: "absolute", left: 7, right: 7, bottom: 7, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
      <div style={{ padding: "4px 7px", borderRadius: 999, background: "rgba(3,5,10,.76)", border: "1px solid rgba(255,255,255,.08)", color: "rgba(255,255,255,.58)", fontSize: 6.6, fontWeight: 900, pointerEvents: "none" }}>GLISSER ↔ · ROTATION 3D{binding?.source === "cmu" ? ` · CMU ${binding.sourceMotionId} MAPPÉ` : " · MOCAP READY"}</div>
      <button type="button" onClick={() => setPaused((value) => !value)} style={{ minWidth: 54, minHeight: 28, borderRadius: 999, border: `1px solid ${accent}45`, background: "rgba(3,5,10,.82)", color: accent, fontSize: 6.8, fontWeight: 1000 }}>{paused ? "LECTURE" : "PAUSE"}</button>
    </div> : null}
  </div>;
}
