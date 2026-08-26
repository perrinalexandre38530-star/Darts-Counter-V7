import React from "react";
import type { FitExercise } from "../../fit/fitStore";
import { resolveFitMotionKey } from "../../fit/awenaMocapRegistry";

const AWENA_AVATAR = "/awena/awena-avatar.webp";

type Point = [number, number];
type JointKey =
  | "head" | "neck"
  | "shoulderL" | "shoulderR" | "elbowL" | "elbowR" | "handL" | "handR"
  | "hipL" | "hipR" | "kneeL" | "kneeR" | "ankleL" | "ankleR";

type Pose = Record<JointKey, Point>;
type EquipmentKind = "barbell" | "dumbbells" | "cableFly" | "pullup" | "pulldown" | "bench" | "inclineBench" | "legPress" | "machineCalf" | "hipBench" | "kettlebell" | "none";

type MotionConfig = {
  start: Pose;
  end: Pose;
  equipment: EquipmentKind;
  duration?: number;
  cueUp: string;
  cueDown: string;
  floorY?: number;
};

const P = (x: number, y: number): Point => [x, y];
const pose = (partial: Partial<Pose>): Pose => ({
  head: P(160, 40), neck: P(160, 54),
  shoulderL: P(145, 62), shoulderR: P(175, 62),
  elbowL: P(139, 88), elbowR: P(181, 88),
  handL: P(136, 111), handR: P(184, 111),
  hipL: P(150, 106), hipR: P(170, 106),
  kneeL: P(148, 137), kneeR: P(172, 137),
  ankleL: P(145, 166), ankleR: P(175, 166),
  ...partial,
});

const standing = pose({});

const MOTIONS: Record<string, MotionConfig> = {
  bench: {
    equipment: "bench", cueUp: "POUSSE", cueDown: "CONTRÔLE", duration: 2350, floorY: 157,
    start: pose({
      head: P(235, 92), neck: P(219, 96), shoulderL: P(198, 101), shoulderR: P(202, 91),
      elbowL: P(177, 76), elbowR: P(177, 116), handL: P(154, 73), handR: P(154, 112),
      hipL: P(150, 111), hipR: P(154, 103), kneeL: P(119, 120), kneeR: P(121, 111), ankleL: P(94, 143), ankleR: P(97, 136),
    }),
    end: pose({
      head: P(235, 92), neck: P(219, 96), shoulderL: P(198, 101), shoulderR: P(202, 91),
      elbowL: P(178, 58), elbowR: P(178, 58), handL: P(155, 42), handR: P(155, 42),
      hipL: P(150, 111), hipR: P(154, 103), kneeL: P(119, 120), kneeR: P(121, 111), ankleL: P(94, 143), ankleR: P(97, 136),
    }),
  },
  "incline-db": {
    equipment: "inclineBench", cueUp: "POUSSE", cueDown: "DESCENDS", duration: 2250,
    start: pose({
      head: P(218, 63), neck: P(207, 72), shoulderL: P(193, 79), shoulderR: P(199, 70),
      elbowL: P(170, 67), elbowR: P(181, 94), handL: P(156, 57), handR: P(166, 103),
      hipL: P(167, 112), hipR: P(174, 104), kneeL: P(139, 130), kneeR: P(145, 122), ankleL: P(116, 154), ankleR: P(121, 147),
    }),
    end: pose({
      head: P(218, 63), neck: P(207, 72), shoulderL: P(193, 79), shoulderR: P(199, 70),
      elbowL: P(172, 48), elbowR: P(176, 49), handL: P(156, 32), handR: P(161, 33),
      hipL: P(167, 112), hipR: P(174, 104), kneeL: P(139, 130), kneeR: P(145, 122), ankleL: P(116, 154), ankleR: P(121, 147),
    }),
  },
  "cable-fly": {
    equipment: "cableFly", cueUp: "RESSERRE", cueDown: "OUVRE", duration: 2500,
    start: pose({
      elbowL: P(113, 76), elbowR: P(207, 76), handL: P(77, 86), handR: P(243, 86),
      kneeL: P(146, 138), kneeR: P(177, 136), ankleL: P(139, 166), ankleR: P(190, 166),
    }),
    end: pose({
      elbowL: P(139, 79), elbowR: P(181, 79), handL: P(156, 87), handR: P(164, 87),
      kneeL: P(146, 138), kneeR: P(177, 136), ankleL: P(139, 166), ankleR: P(190, 166),
    }),
  },
  pullup: {
    equipment: "pullup", cueUp: "TIRE", cueDown: "REDESCENDS", duration: 2600, floorY: 174,
    start: pose({
      head: P(160, 73), neck: P(160, 87), shoulderL: P(146, 94), shoulderR: P(174, 94),
      elbowL: P(132, 68), elbowR: P(188, 68), handL: P(116, 28), handR: P(204, 28),
      hipL: P(151, 129), hipR: P(169, 129), kneeL: P(149, 151), kneeR: P(171, 151), ankleL: P(142, 171), ankleR: P(178, 171),
    }),
    end: pose({
      head: P(160, 43), neck: P(160, 57), shoulderL: P(146, 64), shoulderR: P(174, 64),
      elbowL: P(126, 50), elbowR: P(194, 50), handL: P(116, 28), handR: P(204, 28),
      hipL: P(151, 99), hipR: P(169, 99), kneeL: P(149, 123), kneeR: P(171, 123), ankleL: P(142, 148), ankleR: P(178, 148),
    }),
  },
  row: {
    equipment: "barbell", cueUp: "TIRE", cueDown: "ALLONGE", duration: 2350,
    start: pose({
      head: P(218, 73), neck: P(203, 82), shoulderL: P(187, 88), shoulderR: P(193, 79),
      elbowL: P(169, 108), elbowR: P(174, 103), handL: P(148, 128), handR: P(153, 123),
      hipL: P(157, 112), hipR: P(163, 104), kneeL: P(143, 137), kneeR: P(170, 136), ankleL: P(137, 165), ankleR: P(177, 165),
    }),
    end: pose({
      head: P(218, 73), neck: P(203, 82), shoulderL: P(187, 88), shoulderR: P(193, 79),
      elbowL: P(169, 87), elbowR: P(176, 84), handL: P(153, 101), handR: P(159, 97),
      hipL: P(157, 112), hipR: P(163, 104), kneeL: P(143, 137), kneeR: P(170, 136), ankleL: P(137, 165), ankleR: P(177, 165),
    }),
  },
  "lat-pulldown": {
    equipment: "pulldown", cueUp: "TIRE", cueDown: "REMONTÉE", duration: 2450,
    start: pose({
      head: P(160, 61), neck: P(160, 75), shoulderL: P(145, 82), shoulderR: P(175, 82),
      elbowL: P(126, 58), elbowR: P(194, 58), handL: P(105, 28), handR: P(215, 28),
      hipL: P(151, 121), hipR: P(169, 121), kneeL: P(133, 139), kneeR: P(187, 139), ankleL: P(131, 165), ankleR: P(189, 165),
    }),
    end: pose({
      head: P(160, 61), neck: P(160, 75), shoulderL: P(145, 82), shoulderR: P(175, 82),
      elbowL: P(132, 95), elbowR: P(188, 95), handL: P(130, 79), handR: P(190, 79),
      hipL: P(151, 121), hipR: P(169, 121), kneeL: P(133, 139), kneeR: P(187, 139), ankleL: P(131, 165), ankleR: P(189, 165),
    }),
  },
  ohp: {
    equipment: "barbell", cueUp: "POUSSE", cueDown: "ÉPAULES", duration: 2250,
    start: pose({ elbowL: P(136, 80), elbowR: P(184, 80), handL: P(139, 61), handR: P(181, 61) }),
    end: pose({ elbowL: P(143, 44), elbowR: P(177, 44), handL: P(141, 22), handR: P(179, 22) }),
  },
  "lateral-raise": {
    equipment: "dumbbells", cueUp: "MONTE", cueDown: "CONTRÔLE", duration: 2450,
    start: pose({ elbowL: P(137, 91), elbowR: P(183, 91), handL: P(132, 117), handR: P(188, 117) }),
    end: pose({ elbowL: P(111, 66), elbowR: P(209, 66), handL: P(78, 68), handR: P(242, 68) }),
  },
  curl: {
    equipment: "dumbbells", cueUp: "FLÉCHIS", cueDown: "DESCENDS", duration: 2250,
    start: pose({ elbowL: P(139, 88), elbowR: P(181, 88), handL: P(136, 117), handR: P(184, 117) }),
    end: pose({ elbowL: P(139, 88), elbowR: P(181, 88), handL: P(145, 68), handR: P(175, 68) }),
  },
  "triceps-push": {
    equipment: "pulldown", cueUp: "POUSSE", cueDown: "REVIENS", duration: 2200,
    start: pose({ elbowL: P(143, 82), elbowR: P(177, 82), handL: P(144, 72), handR: P(176, 72) }),
    end: pose({ elbowL: P(143, 82), elbowR: P(177, 82), handL: P(140, 112), handR: P(180, 112) }),
  },
  squat: {
    equipment: "barbell", cueUp: "POUSSE", cueDown: "DESCENDS", duration: 2550,
    start: pose({ ...standing, handL: P(138, 58), handR: P(182, 58), elbowL: P(137, 73), elbowR: P(183, 73) }),
    end: pose({
      head: P(160, 64), neck: P(160, 78), shoulderL: P(145, 85), shoulderR: P(175, 85),
      elbowL: P(136, 96), elbowR: P(184, 96), handL: P(137, 81), handR: P(183, 81),
      hipL: P(147, 124), hipR: P(173, 124), kneeL: P(125, 136), kneeR: P(195, 136), ankleL: P(121, 166), ankleR: P(199, 166),
    }),
  },
  "leg-press": {
    equipment: "legPress", cueUp: "POUSSE", cueDown: "REPLIE", duration: 2550, floorY: 169,
    start: pose({
      head: P(91, 72), neck: P(104, 82), shoulderL: P(113, 92), shoulderR: P(119, 84),
      elbowL: P(126, 105), elbowR: P(131, 97), handL: P(139, 116), handR: P(144, 108),
      hipL: P(143, 119), hipR: P(149, 111), kneeL: P(183, 113), kneeR: P(190, 104), ankleL: P(213, 86), ankleR: P(218, 79),
    }),
    end: pose({
      head: P(91, 72), neck: P(104, 82), shoulderL: P(113, 92), shoulderR: P(119, 84),
      elbowL: P(126, 105), elbowR: P(131, 97), handL: P(139, 116), handR: P(144, 108),
      hipL: P(143, 119), hipR: P(149, 111), kneeL: P(187, 102), kneeR: P(194, 94), ankleL: P(236, 78), ankleR: P(241, 70),
    }),
  },
  rdl: {
    equipment: "barbell", cueUp: "HANCHES", cueDown: "CHARNIÈRE", duration: 2550,
    start: pose({ ...standing, handL: P(145, 114), handR: P(175, 114) }),
    end: pose({
      head: P(211, 72), neck: P(197, 81), shoulderL: P(182, 88), shoulderR: P(188, 79),
      elbowL: P(170, 108), elbowR: P(176, 101), handL: P(156, 127), handR: P(162, 121),
      hipL: P(151, 112), hipR: P(161, 105), kneeL: P(146, 139), kneeR: P(174, 139), ankleL: P(143, 166), ankleR: P(178, 166),
    }),
  },
  "hip-thrust": {
    equipment: "hipBench", cueUp: "SERRE", cueDown: "DESCENDS", duration: 2450,
    start: pose({
      head: P(101, 92), neck: P(116, 98), shoulderL: P(129, 104), shoulderR: P(134, 96),
      elbowL: P(145, 115), elbowR: P(149, 107), handL: P(161, 119), handR: P(165, 111),
      hipL: P(174, 126), hipR: P(180, 118), kneeL: P(208, 120), kneeR: P(213, 112), ankleL: P(231, 153), ankleR: P(236, 145),
    }),
    end: pose({
      head: P(101, 92), neck: P(116, 98), shoulderL: P(129, 104), shoulderR: P(134, 96),
      elbowL: P(145, 115), elbowR: P(149, 107), handL: P(161, 119), handR: P(165, 111),
      hipL: P(176, 100), hipR: P(182, 92), kneeL: P(208, 120), kneeR: P(213, 112), ankleL: P(231, 153), ankleR: P(236, 145),
    }),
  },
  calf: {
    equipment: "machineCalf", cueUp: "MONTE", cueDown: "DESCENDS", duration: 2100,
    start: pose({ ...standing }),
    end: pose({
      head: P(160, 35), neck: P(160, 49), shoulderL: P(145, 57), shoulderR: P(175, 57), elbowL: P(139, 83), elbowR: P(181, 83), handL: P(136, 106), handR: P(184, 106), hipL: P(150, 101), hipR: P(170, 101), kneeL: P(148, 132), kneeR: P(172, 132), ankleL: P(145, 158), ankleR: P(175, 158),
    }),
  },
  plank: {
    equipment: "none", cueUp: "GAINAGE", cueDown: "ALIGNEMENT", duration: 3200, floorY: 148,
    start: pose({
      head: P(238, 93), neck: P(221, 99), shoulderL: P(202, 105), shoulderR: P(207, 97),
      elbowL: P(194, 124), elbowR: P(199, 116), handL: P(177, 130), handR: P(182, 122),
      hipL: P(155, 110), hipR: P(161, 102), kneeL: P(119, 116), kneeR: P(125, 109), ankleL: P(83, 128), ankleR: P(89, 121),
    }),
    end: pose({
      head: P(238, 91), neck: P(221, 97), shoulderL: P(202, 103), shoulderR: P(207, 95),
      elbowL: P(194, 124), elbowR: P(199, 116), handL: P(177, 130), handR: P(182, 122),
      hipL: P(155, 108), hipR: P(161, 100), kneeL: P(119, 114), kneeR: P(125, 107), ankleL: P(83, 128), ankleR: P(89, 121),
    }),
  },
  deadlift: {
    equipment: "barbell", cueUp: "VERROUILLE", cueDown: "REPOSE", duration: 2650,
    start: pose({
      head: P(183, 63), neck: P(177, 77), shoulderL: P(165, 85), shoulderR: P(181, 84),
      elbowL: P(155, 108), elbowR: P(181, 108), handL: P(148, 134), handR: P(184, 134),
      hipL: P(148, 119), hipR: P(169, 117), kneeL: P(130, 138), kneeR: P(188, 139), ankleL: P(126, 166), ankleR: P(192, 166),
    }),
    end: pose({ ...standing, handL: P(145, 116), handR: P(175, 116) }),
  },
  goblet: {
    equipment: "kettlebell", cueUp: "POUSSE", cueDown: "DESCENDS", duration: 2550,
    start: pose({ ...standing, elbowL: P(145, 82), elbowR: P(175, 82), handL: P(153, 72), handR: P(167, 72) }),
    end: pose({
      head: P(160, 64), neck: P(160, 78), shoulderL: P(145, 85), shoulderR: P(175, 85),
      elbowL: P(145, 103), elbowR: P(175, 103), handL: P(153, 88), handR: P(167, 88),
      hipL: P(147, 124), hipR: P(173, 124), kneeL: P(125, 136), kneeR: P(195, 136), ankleL: P(121, 166), ankleR: P(199, 166),
    }),
  },
};

export const FIT_AWENA_ANIMATED_EXERCISE_IDS = Object.freeze(Object.keys(MOTIONS));
export function hasFitAwenaMotion(exercise: string | FitExercise) {
  if (typeof exercise === "string") return Boolean(MOTIONS[exercise]);
  const key = resolveFitMotionKey(exercise);
  return Boolean(key && MOTIONS[key]);
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function pointLerp(a: Point, b: Point, t: number): Point { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; }
function poseLerp(a: Pose, b: Pose, t: number): Pose {
  const out = {} as Pose;
  (Object.keys(a) as JointKey[]).forEach((key) => { out[key] = pointLerp(a[key], b[key], t); });
  return out;
}

function useMotionProgress(duration: number) {
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setProgress(.58); return; }
    let raf = 0;
    let last = 0;
    const tick = (ts: number) => {
      if (ts - last > 32) {
        // 0 → 1 → 0, with smooth acceleration/deceleration at both ends.
        const phase = (ts % duration) / duration;
        setProgress((1 - Math.cos(phase * Math.PI * 2)) / 2);
        last = ts;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [duration]);
  return progress;
}

function limb(a: Point, b: Point, color: string, width: number, opacity = 1) {
  return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={width} strokeLinecap="round" opacity={opacity}/>;
}

function angleDeg(a: Point, b: Point) {
  return Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
}

function Equipment({ kind, joints, accent }: { kind: EquipmentKind; joints: Pose; accent: string }) {
  const handsMid = pointLerp(joints.handL, joints.handR, .5);
  const barY = (joints.handL[1] + joints.handR[1]) / 2;
  switch (kind) {
    case "barbell": {
      const minX = Math.min(joints.handL[0], joints.handR[0]) - 40;
      const maxX = Math.max(joints.handL[0], joints.handR[0]) + 40;
      return <g opacity=".98">
        <line x1={minX} y1={barY} x2={maxX} y2={barY} stroke="#e8eef9" strokeWidth="4.5" strokeLinecap="round"/>
        {[minX + 6, minX + 14, maxX - 14, maxX - 6].map((x) => <line key={x} x1={x} y1={barY - 12} x2={x} y2={barY + 12} stroke="#121826" strokeWidth="7" strokeLinecap="round"/>)}
        {[minX + 6, minX + 14, maxX - 14, maxX - 6].map((x) => <line key={`accent-${x}`} x1={x} y1={barY - 11} x2={x} y2={barY + 11} stroke={accent} strokeWidth="2.2" strokeLinecap="round" opacity=".85"/>)}
      </g>;
    }
    case "dumbbells":
      return <g>{[joints.handL, joints.handR].map((hand, i) => <g key={i} transform={`translate(${hand[0]} ${hand[1]})`}>
        <line x1="-10" y1="0" x2="10" y2="0" stroke="#e6edf8" strokeWidth="3.3"/>
        <rect x="-15" y="-6" width="5" height="12" rx="2.5" fill="#0e1320"/>
        <rect x="10" y="-6" width="5" height="12" rx="2.5" fill="#0e1320"/>
        <rect x="-13.5" y="-5" width="2" height="10" rx="1" fill={accent}/>
        <rect x="11.5" y="-5" width="2" height="10" rx="1" fill={accent}/>
      </g>)}</g>;
    case "cableFly":
      return <g opacity=".92"><line x1="28" y1="32" x2={joints.handL[0]} y2={joints.handL[1]} stroke={accent} strokeWidth="2.2"/><line x1="292" y1="32" x2={joints.handR[0]} y2={joints.handR[1]} stroke={accent} strokeWidth="2.2"/><circle cx="28" cy="32" r="7" fill="none" stroke="#dbe4f3" strokeWidth="3"/><circle cx="292" cy="32" r="7" fill="none" stroke="#dbe4f3" strokeWidth="3"/></g>;
    case "pullup":
      return <g><line x1="86" y1="26" x2="234" y2="26" stroke="#dfe7f4" strokeWidth="6" strokeLinecap="round"/><line x1="104" y1="18" x2="104" y2="26" stroke={accent} strokeWidth="4"/><line x1="216" y1="18" x2="216" y2="26" stroke={accent} strokeWidth="4"/></g>;
    case "pulldown":
      return <g><rect x="229" y="30" width="46" height="118" rx="10" fill="#1b2332" opacity=".9"/><line x1="252" y1="8" x2="252" y2="144" stroke="#697489" strokeWidth="3" opacity=".7"/><line x1="116" y1="28" x2="208" y2="28" stroke="#e4ebf7" strokeWidth="5" strokeLinecap="round"/><line x1="162" y1="8" x2="162" y2="28" stroke={accent} strokeWidth="2.4" opacity=".8"/><rect x="127" y="147" width="70" height="8" rx="4" fill="#667085" opacity=".8"/></g>;
    case "bench":
      return <g><rect x="112" y="111" width="131" height="12" rx="6" fill="#5f6878"/><line x1="130" y1="122" x2="119" y2="159" stroke="#5f6878" strokeWidth="7"/><line x1="223" y1="122" x2="234" y2="159" stroke="#5f6878" strokeWidth="7"/><rect x="143" y="52" width="10" height="57" rx="4" fill="#596171"/><rect x="199" y="52" width="10" height="57" rx="4" fill="#596171"/></g>;
    case "inclineBench":
      return <g><line x1="132" y1="124" x2="216" y2="70" stroke="#5f6878" strokeWidth="12" strokeLinecap="round"/><line x1="144" y1="118" x2="132" y2="158" stroke="#5f6878" strokeWidth="7"/><line x1="198" y1="83" x2="212" y2="150" stroke="#5f6878" strokeWidth="7"/></g>;
    case "legPress":
      return <g opacity=".95"><line x1="230" y1="52" x2="286" y2="18" stroke="#636d7d" strokeWidth="9"/><line x1="228" y1="67" x2="289" y2="28" stroke="#636d7d" strokeWidth="4"/><rect x="78" y="92" width="73" height="13" rx="6" transform="rotate(28 78 92)" fill="#5f6878"/><rect x="223" y="53" width="16" height="43" rx="5" transform="rotate(56 223 53)" fill={accent}/></g>;
    case "machineCalf":
      return <g opacity=".9"><line x1="127" y1="62" x2="193" y2="62" stroke={accent} strokeWidth="6" strokeLinecap="round"/><line x1="124" y1="21" x2="124" y2="159" stroke="#5f6878" strokeWidth="5"/><line x1="196" y1="21" x2="196" y2="159" stroke="#5f6878" strokeWidth="5"/><line x1="116" y1="166" x2="204" y2="166" stroke="#8b95a7" strokeWidth="5"/></g>;
    case "hipBench":
      return <g><rect x="72" y="101" width="66" height="12" rx="6" fill="#5f6878"/><line x1="82" y1="113" x2="74" y2="150" stroke="#5f6878" strokeWidth="6"/><line x1="128" y1="113" x2="136" y2="150" stroke="#5f6878" strokeWidth="6"/><line x1={handsMid[0] - 30} y1={handsMid[1] + 2} x2={handsMid[0] + 30} y2={handsMid[1] + 2} stroke="#202938" strokeWidth="10" strokeLinecap="round"/><line x1={handsMid[0] - 30} y1={handsMid[1] + 2} x2={handsMid[0] + 30} y2={handsMid[1] + 2} stroke={accent} strokeWidth="4" strokeLinecap="round" opacity=".85"/></g>;
    case "kettlebell":
      return <g transform={`translate(${handsMid[0]} ${handsMid[1] + 5})`}><circle cx="0" cy="4" r="11" fill="#111827" opacity=".95"/><circle cx="0" cy="4" r="9" fill={accent} opacity=".7"/><path d="M-6 -2a6 6 0 0 1 12 0" fill="none" stroke="#eef3fb" strokeWidth="3"/></g>;
    default:
      return null;
  }
}

function FigureOutfit({ joints, accent, clipId }: { joints: Pose; accent: string; clipId: string }) {
  const bustY = (joints.neck[1] + joints.hipL[1]) / 2 - 8;
  return <>
    <path d={`M ${joints.shoulderL[0]-4} ${joints.shoulderL[1]+3} Q ${joints.head[0]} ${bustY-10} ${joints.shoulderR[0]+4} ${joints.shoulderR[1]+3} L ${joints.hipR[0]-1} ${joints.hipR[1]-2} Q ${joints.head[0]} ${joints.hipL[1]-3} ${joints.hipL[0]+1} ${joints.hipL[1]-2} Z`} fill={`url(#${clipId}-top)`} stroke="rgba(255,255,255,.10)" strokeWidth="1"/>
    <path d={`M ${joints.hipL[0]-4} ${joints.hipL[1]-1} L ${joints.hipR[0]+4} ${joints.hipR[1]-1} L ${joints.kneeR[0]-1} ${joints.kneeR[1]-4} Q ${joints.head[0]} ${joints.hipL[1]+18} ${joints.kneeL[0]+1} ${joints.kneeL[1]-4} Z`} fill={`url(#${clipId}-shorts)`} stroke="rgba(255,255,255,.08)" strokeWidth="1"/>
    <path d={`M ${joints.shoulderL[0]+2} ${joints.shoulderL[1]+8} Q ${joints.head[0]} ${bustY} ${joints.shoulderR[0]-2} ${joints.shoulderR[1]+8}`} fill="none" stroke="#00d3ff" strokeWidth="2" strokeLinecap="round" opacity=".95"/>
    <path d={`M ${joints.hipL[0]+1} ${joints.hipL[1]+10} Q ${joints.head[0]} ${joints.hipL[1]+2} ${joints.hipR[0]-1} ${joints.hipR[1]+10}`} fill="none" stroke="#ffd54d" strokeWidth="2" strokeLinecap="round" opacity=".9"/>
    <path d={`M ${joints.hipL[0]+2} ${joints.hipL[1]+3} Q ${joints.kneeL[0]-7} ${joints.kneeL[1]-7} ${joints.kneeL[0]-4} ${joints.kneeL[1]+1}`} fill="none" stroke="#ff4fd5" strokeWidth="2" strokeLinecap="round" opacity=".95"/>
    <path d={`M ${joints.hipR[0]-2} ${joints.hipR[1]+3} Q ${joints.kneeR[0]+7} ${joints.kneeR[1]-7} ${joints.kneeR[0]+4} ${joints.kneeR[1]+1}`} fill="none" stroke="#7dff66" strokeWidth="2" strokeLinecap="round" opacity=".95"/>
    <circle cx={joints.head[0]} cy={bustY+5} r="3" fill="#111" opacity=".88"/>
    <circle cx={joints.head[0]} cy={bustY+5} r="1.8" fill={accent} opacity=".95"/>
  </>;
}

function LimbCapsule({ a, b, width, stroke, opacity = 1 }: { a: Point; b: Point; width: number; stroke: string; opacity?: number }) {
  return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={stroke} strokeWidth={width} strokeLinecap="round" opacity={opacity}/>;
}

function Glove({ hand, accent }: { hand: Point; accent: string }) {
  return <g transform={`translate(${hand[0]} ${hand[1]})`}>
    <circle cx="0" cy="0" r="5.5" fill="#131823"/>
    <circle cx="0" cy="0" r="4" fill="#202938"/>
    <path d="M-4 1 Q 0 -2 4 1" fill="none" stroke={accent} strokeWidth="1.4" strokeLinecap="round" opacity=".9"/>
  </g>;
}

function Shoe({ ankle, toe, accent, mirrored = false }: { ankle: Point; toe: Point; accent: string; mirrored?: boolean }) {
  const angle = angleDeg(ankle, toe);
  return <g transform={`translate(${ankle[0]} ${ankle[1]}) rotate(${angle}) scale(${mirrored ? -1 : 1} 1)`}>
    <rect x="-4" y="-5" width="8" height="10" rx="2" fill="#fafcff" opacity=".86"/>
    <path d="M -2 0 C 3 -6 14 -5 18 -1 L 18 6 C 12 7 4 7 -3 4 Z" fill="#0f1218"/>
    <path d="M 2 1 C 7 -2 12 -2 16 0" fill="none" stroke={accent} strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M 0 5 H 18" fill="none" stroke="#ffffff" strokeWidth="1.3" opacity=".9"/>
  </g>;
}

function Hair({ head, neck, progress, clipId }: { head: Point; neck: Point; progress: number; clipId: string }) {
  const sway = Math.sin(progress * Math.PI * 2) * 4;
  const ponyBase: Point = [head[0] + 4, head[1] - 14];
  return <>
    <path d={`M ${head[0]-16} ${head[1]-2} Q ${head[0]-17} ${head[1]-24} ${head[0]} ${head[1]-27} Q ${head[0]+18} ${head[1]-24} ${head[0]+17} ${head[1]-2} Q ${head[0]+16} ${head[1]+8} ${head[0]+4} ${head[1]+11} Q ${head[0]-10} ${head[1]+10} ${head[0]-16} ${head[1]-2} Z`} fill={`url(#${clipId}-hair)`}/>
    <path d={`M ${ponyBase[0]} ${ponyBase[1]} C ${ponyBase[0]+18+sway} ${ponyBase[1]+10}, ${ponyBase[0]+23+sway} ${ponyBase[1]+34}, ${ponyBase[0]+16+sway} ${ponyBase[1]+54} C ${ponyBase[0]+8+sway} ${ponyBase[1]+72}, ${ponyBase[0]-4+sway} ${ponyBase[1]+84}, ${ponyBase[0]-8+sway} ${ponyBase[1]+100}`} fill="none" stroke="#2e1718" strokeWidth="10" strokeLinecap="round" opacity=".9"/>
    <path d={`M ${ponyBase[0]} ${ponyBase[1]+1} C ${ponyBase[0]+16+sway*.85} ${ponyBase[1]+12}, ${ponyBase[0]+19+sway*.85} ${ponyBase[1]+35}, ${ponyBase[0]+12+sway*.85} ${ponyBase[1]+54} C ${ponyBase[0]+6+sway*.85} ${ponyBase[1]+71}, ${ponyBase[0]-6+sway*.85} ${ponyBase[1]+86}, ${ponyBase[0]-10+sway*.85} ${ponyBase[1]+101}`} fill="none" stroke="#5b302c" strokeWidth="5" strokeLinecap="round" opacity=".9"/>
    <circle cx={ponyBase[0]} cy={ponyBase[1]} r="4" fill="#131823"/>
    <circle cx={ponyBase[0]} cy={ponyBase[1]} r="2.2" fill="#00d3ff" opacity=".9"/>
  </>;
}

function AnimatedFigure({ exercise, config, compact }: { exercise: FitExercise; config: MotionConfig; compact: boolean }) {
  const progress = useMotionProgress(config.duration || 2400);
  const joints = poseLerp(config.start, config.end, progress);
  const accent = exercise.accent || "#f6c256";
  const clipId = React.useId().replace(/:/g, "");
  const floorY = config.floorY ?? 168;
  const shoulderMid = pointLerp(joints.shoulderL, joints.shoulderR, .5);
  const hipMid = pointLerp(joints.hipL, joints.hipR, .5);
  const headSize = compact ? 11.5 : 13.5;
  const cue = progress < .5 ? config.cueUp : config.cueDown;
  const handToward = pointLerp(joints.handL, joints.handR, .5);
  const shoeTargetL: Point = [joints.ankleL[0] + 16, joints.ankleL[1] + 2];
  const shoeTargetR: Point = [joints.ankleR[0] + 16, joints.ankleR[1] + 2];

  return <div style={{ position: "relative", width: "100%", height: compact ? 82 : 154 }}>
    <svg viewBox="0 0 320 180" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-label={`Démonstration animée AWENA : ${exercise.name}`} role="img" style={{ display: "block" }}>
      <defs>
        <radialGradient id={`${clipId}-halo`} cx="50%" cy="42%" r="55%"><stop offset="0" stopColor={accent} stopOpacity=".17"/><stop offset="1" stopColor={accent} stopOpacity="0"/></radialGradient>
        <linearGradient id={`${clipId}-skin`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffc3a4"/><stop offset="1" stopColor="#d97847"/></linearGradient>
        <linearGradient id={`${clipId}-skinBack`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d59274"/><stop offset="1" stopColor="#b8643d"/></linearGradient>
        <linearGradient id={`${clipId}-top`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1f2430"/><stop offset="1" stopColor="#0b0e15"/></linearGradient>
        <linearGradient id={`${clipId}-shorts`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#181d27"/><stop offset="1" stopColor="#05070d"/></linearGradient>
        <linearGradient id={`${clipId}-hair`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#704138"/><stop offset="1" stopColor="#1b0c0d"/></linearGradient>
      </defs>

      <ellipse cx="160" cy="93" rx="133" ry="79" fill={`url(#${clipId}-halo)`}/>
      <line x1="24" y1={floorY} x2="296" y2={floorY} stroke="rgba(255,255,255,.11)" strokeWidth="1" strokeDasharray="5 7"/>
      <ellipse cx={hipMid[0]} cy={floorY + 2} rx="44" ry="8" fill="rgba(0,0,0,.23)"/>
      <Equipment kind={config.equipment} joints={joints} accent={accent}/>

      {/* back limbs */}
      <LimbCapsule a={joints.shoulderR} b={joints.elbowR} width={9} stroke={`url(#${clipId}-skinBack)`} opacity={.62}/>
      <LimbCapsule a={joints.elbowR} b={joints.handR} width={8} stroke={`url(#${clipId}-skinBack)`} opacity={.62}/>
      <LimbCapsule a={joints.hipR} b={joints.kneeR} width={12} stroke={`url(#${clipId}-skinBack)`} opacity={.7}/>
      <LimbCapsule a={joints.kneeR} b={joints.ankleR} width={10} stroke={`url(#${clipId}-skinBack)`} opacity={.7}/>

      {/* body and front limbs */}
      <FigureOutfit joints={joints} accent={accent} clipId={clipId}/>
      <LimbCapsule a={joints.shoulderL} b={joints.elbowL} width={10} stroke={`url(#${clipId}-skin)`}/>
      <LimbCapsule a={joints.elbowL} b={joints.handL} width={8.5} stroke={`url(#${clipId}-skin)`}/>
      <LimbCapsule a={joints.hipL} b={joints.kneeL} width={13} stroke={`url(#${clipId}-skin)`}/>
      <LimbCapsule a={joints.kneeL} b={joints.ankleL} width={10.5} stroke={`url(#${clipId}-skin)`}/>

      <line x1={shoulderMid[0]} y1={shoulderMid[1]} x2={hipMid[0]} y2={hipMid[1]} stroke="rgba(255,255,255,.08)" strokeWidth="1.8"/>

      {/* head and face */}
      <Hair head={joints.head} neck={joints.neck} progress={progress} clipId={clipId}/>
      <ellipse cx={joints.head[0]} cy={joints.head[1]} rx={headSize} ry={headSize + 2} fill={`url(#${clipId}-skin)`} stroke="rgba(255,255,255,.15)" strokeWidth=".8"/>
      <circle cx={joints.head[0] - 4} cy={joints.head[1] - 1} r="1.4" fill="#2c1c18"/>
      <circle cx={joints.head[0] + 4} cy={joints.head[1] - 1} r="1.4" fill="#2c1c18"/>
      <path d={`M ${joints.head[0]-4} ${joints.head[1]+5} Q ${joints.head[0]} ${joints.head[1]+8} ${joints.head[0]+4} ${joints.head[1]+5}`} fill="none" stroke="#a44c44" strokeWidth="1.4" strokeLinecap="round"/>
      <path d={`M ${joints.head[0]-2.5} ${joints.head[1]+1.5} Q ${joints.head[0]} ${joints.head[1]+3.3} ${joints.head[0]+2.5} ${joints.head[1]+1.5}`} fill="none" stroke="#cc7f63" strokeWidth="1" opacity=".85"/>

      {/* accessories */}
      <Glove hand={joints.handL} accent={accent}/>
      <Glove hand={joints.handR} accent={accent}/>
      <Shoe ankle={joints.ankleL} toe={shoeTargetL} accent={accent}/>
      <Shoe ankle={joints.ankleR} toe={shoeTargetR} accent={accent} mirrored/>
      <circle cx={joints.shoulderL[0]-7} cy={joints.shoulderL[1]+12} r="6" fill="#0d1320" opacity=".95"/>
      <circle cx={joints.shoulderL[0]-7} cy={joints.shoulderL[1]+12} r="3.5" fill={accent} opacity=".9"/>
      <path d={`M ${joints.shoulderL[0]-10} ${joints.shoulderL[1]+12} H ${joints.shoulderL[0]-4}`} stroke="#ffffff" strokeWidth=".9" opacity=".8"/>

      {/* motion accent */}
      <path d={`M ${pointLerp(config.start.handL, config.end.handL, .12)[0]} ${pointLerp(config.start.handL, config.end.handL, .12)[1]} Q ${handToward[0]-8} ${handToward[1]-8} ${pointLerp(config.start.handL, config.end.handL, .88)[0]} ${pointLerp(config.start.handL, config.end.handL, .88)[1]}`} fill="none" stroke={accent} strokeWidth="1.8" strokeDasharray="4 4" opacity=".45"/>
    </svg>

    <div style={{ position: "absolute", left: compact ? 6 : 9, top: compact ? 5 : 8, display: "flex", alignItems: "center", gap: 5, padding: compact ? "3px 6px" : "4px 7px", borderRadius: 999, background: "rgba(4,6,12,.78)", border: `1px solid ${accent}35`, backdropFilter: "blur(8px)" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}` }}/>
      <span style={{ color: accent, fontSize: compact ? 6.2 : 7.1, fontWeight: 1000, letterSpacing: .9 }}>AWENA 3D</span>
    </div>
    <div style={{ position: "absolute", right: compact ? 6 : 9, top: compact ? 5 : 8, padding: compact ? "3px 6px" : "4px 8px", borderRadius: 999, background: "rgba(4,6,12,.80)", border: "1px solid rgba(255,255,255,.09)", color: "rgba(255,255,255,.78)", fontSize: compact ? 6 : 7, fontWeight: 950, letterSpacing: .65 }}>{cue}</div>
    {!compact ? <div style={{ position: "absolute", right: 9, bottom: 8, padding: "4px 8px", borderRadius: 999, background: "rgba(4,6,12,.80)", border: "1px solid rgba(255,255,255,.09)", color: "rgba(255,255,255,.74)", fontSize: 7, fontWeight: 950, letterSpacing: .65 }}>{((config.duration || 2400) / 1000).toFixed(1)} S · BOUCLE</div> : null}
  </div>;
}

export default function FitAwenaMotionStage({ exercise, compact = false }: { exercise: FitExercise; compact?: boolean }) {
  const motionKey = resolveFitMotionKey(exercise);
  const config = motionKey ? MOTIONS[motionKey] : undefined;
  if (!config) return null;
  return <AnimatedFigure exercise={exercise} config={config} compact={compact}/>;
}
