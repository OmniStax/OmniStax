/* The hand the figures share, as solids in its own frame: the wrist at the origin, the fingers
   reaching along +x when straight, the thumb's side +y, and the palm facing -z, the way the fingers
   curl. A right hand; a left is its mirror across y, which the caller applies. The proportions are
   the right hand of College Physics 2e 22.9 (a two-ellipsoid palm, fingers that taper per segment,
   a three-segment thumb), so a figure that grips a wire with it at full curl draws that hand. Both
   the 3D mesh and the flat drawing are made from these parts, so a pose reads the same in each. */

export type P3 = readonly [number, number, number];
export type Thumb = 'up' | 'along' | 'out';
export type HandBody = 'palm' | 'wrist' | 'thumb' | 'index' | 'middle' | 'ring' | 'little';
export type HandPart =
  | { readonly body: HandBody; readonly c: P3; readonly r: P3 }               /* an ellipsoid, axes along the frame */
  | { readonly body: HandBody; readonly a: P3; readonly b: P3; readonly r: number };   /* a round-ended segment */
export type HandPose = { readonly curl?: number; readonly thumb?: Thumb };

const RG = 0.056;                       /* the radius the fingers close round at full curl */
const KNUCKLE_X = 0.24, KNUCKLE_Z = -0.004;
/* the point the fingers close round at full curl, where a figure puts the wire the hand grips */
export const GRIP: P3 = [KNUCKLE_X, 0.089, KNUCKLE_Z - RG];
const ARC = [1.7, 1.2, 1.0] as const;   /* each phalanx's turn round the grip at full curl, in radians */
const FINGERS: readonly (readonly [HandBody, number, number, number])[] = [
  ['index', 0.065, 0.020, 1.0], ['middle', 0.021, 0.021, 1.08], ['ring', -0.023, 0.020, 1.02], ['little', -0.063, 0.017, 0.84],
];
/* The thumb from its root by pose: 'up' along +y (gripping a wire, a thumbs-up), 'along' beside the
   index finger, 'out' straight out of the palm. Lengths are kept; only the directions change. */
const THUMB_ROOT: P3 = [0.100, 0.054, -0.016];
const THUMB_UP: readonly P3[] = [THUMB_ROOT, [0.166, 0.119, -0.024], [0.190, 0.187, -0.030], [0.198, 0.249, -0.034]];
const THUMB_DIRS: Readonly<Record<Exclude<Thumb, 'up'>, readonly P3[]>> = {
  along: [[0.8, 0.45, -0.25], [1, 0.1, -0.12], [1, 0, -0.1]],
  out: [[0.55, 0.5, -0.65], [0.25, 0.15, -1], [0.1, 0.05, -1]],
};
const THUMB_R = [0.026, 0.024, 0.022] as const;

const add = (a: P3, b: P3, k = 1): P3 => [a[0] + k * b[0], a[1] + k * b[1], a[2] + k * b[2]];
const len = (a: P3): number => Math.hypot(a[0], a[1], a[2]);
const unit = (a: P3): P3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/* The joints of one finger: each phalanx keeps its length and bends by curl times its full-curl turn. */
function finger(y: number, stretch: number, curl: number): P3[] {
  const L = ARC.map((a) => 2 * RG * Math.sin((a * stretch) / 2));
  const bend = [ARC[0] / 2, (ARC[0] + ARC[1]) / 2, (ARC[1] + ARC[2]) / 2].map((b) => b * stretch * curl);
  const q: P3[] = [[KNUCKLE_X, y, KNUCKLE_Z]];
  let phi = 0;
  L.forEach((l, i) => { phi += bend[i]; q.push(add(q[i], [Math.cos(phi), 0, -Math.sin(phi)], l)); });
  return q;
}
function thumbJoints(t: Thumb): readonly P3[] {
  if (t === 'up') return THUMB_UP;
  const q: P3[] = [THUMB_ROOT];
  THUMB_DIRS[t].forEach((d, i) => q.push(add(q[i], unit(d), len(add(THUMB_UP[i + 1], THUMB_UP[i], -1)))));
  return q;
}

export function handParts({ curl = 0, thumb = 'up' }: HandPose = {}): readonly HandPart[] {
  const c = Math.min(1, Math.max(0, curl));
  const fingers = FINGERS.flatMap(([body, y, r, stretch]) => {
    const q = finger(y, stretch, c);
    return [0, 1, 2].map((i): HandPart => ({ body, a: q[i], b: q[i + 1], r: r * (1 - 0.07 * i) }));
  });
  const th = thumbJoints(thumb);
  return [
    { body: 'palm', c: [0.125, -0.001, 0], r: [0.125, 0.098, 0.030] },
    { body: 'palm', c: [0.110, 0.077, -0.016], r: [0.062, 0.050, 0.032] },
    { body: 'wrist', a: [0.015, 0.001, 0], b: [-0.100, -0.001, 0.002], r: 0.056 },
    ...fingers,
    ...THUMB_R.map((r, i): HandPart => ({ body: 'thumb', a: th[i], b: th[i + 1], r })),
  ];
}
