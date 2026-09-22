/**
 * Turns the heavy source models (assets/models-src/*.glb, ~10 MB) into the small files the site ships
 * (public/models/*.glb). Run with:  npm run models:optimize   (or add a model name to do just one)
 *
 * What it does to every model, and why:
 *   - bakes transforms and re-scales/re-centres it, so the scene code never measures anything at runtime:
 *     origin in the middle of the base, +Y up, front facing +Z, and the size below in scene units
 *   - merges parts that share a material (fewer draw calls) and welds vertices
 *   - decimates the mesh to a triangle budget (the source scans are far denser than a screen can show)
 *   - resizes textures and re-encodes them as WebP; the land is colour-graded toward the brand palette
 *   - quantises and meshopt-compresses the geometry (decoded by a tiny WASM decoder in the browser)
 *
 * The originals are not committed (they are large and their licences ask for attribution; see CREDITS.md).
 */
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { clearNodeTransform, dedup, flatten, getBounds, join, meshopt, metalRough, prune, quantize, simplifyPrimitive, transformMesh, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const SRC = 'assets/models-src';
const OUT = 'public/models';

/**
 * One entry per shipped model. `size` is the target extent in scene units along one axis
 * (1 unit is roughly a metre in a slightly oversized diorama: the statue is 3.2 tall, the green 30 wide).
 * `yaw` turns the model so that its front faces +Z.
 */
const MODELS = {
  statue: {
    src: 'golf_statue.glb',
    size: { axis: 'y', value: 3.2 },
    yaw: -42, // the scan faces about 42 degrees toward +X
    tris: 3400, // already light: keep everything
    textures: [{ size: 1024, quality: 80 }],
  },
  land: {
    src: 'golf.glb',
    size: { axis: 'x', value: 30 },
    tris: 14000,
    lockBorder: true, // keep the ragged edge of the island exactly as scanned
    // the scan is a saturated yellow-green; pull it toward the muted lime of the brand palette
    textures: [{ size: 1024, quality: 78, grade: { saturation: 0.62, hue: 8, brightness: 0.96 } }],
  },
  bag: {
    src: 'golf_bag.glb',
    size: { axis: 'y', value: 2.1 }, // clubs included
    // The body is 116k triangles of smooth fabric and can lose 93% of them; the clubs are thin shells
    // that fall apart under the same treatment, so they keep most of theirs.
    simplify: [
      { match: 'golf_clubs', ratio: 0.55, error: 0.003 },
      { match: 'straps', ratio: 0.5, error: 0.005 },
      { match: 'polySurface', ratio: 1 },
      { match: '', ratio: 0.075, error: 0.02 },
    ],
    specGloss: true,
    // texture 0 is the pale metal of the clubs, texture 1 is a flat charcoal fabric that reads as black unless lifted
    textures: [{ size: 512, quality: 80 }, { size: 256, quality: 82, grade: { brightness: 1.9 } }],
  },
  cart: {
    src: 'area_9_golf_cart.glb',
    size: { axis: 'z', value: 4.3 }, // length, once turned to face +Z
    yaw: 90, // the source cart drives toward -X; make it drive toward +Z
    tris: 11500,
    dropTextureIndexes: [1], // a 1 KB flat glass texture: the material colour already does the job
    textures: [{ size: 1024, quality: 80 }],
  },
};

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

/** 4x4 column-major matrix product a * b, plus the three transforms we need. */
const mul = (a, b) => {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
};
const translation = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const scaling = (s) => [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1];
const rotationY = (deg) => {
  const t = (deg * Math.PI) / 180;
  const c = Math.cos(t), s = Math.sin(t);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
};

const triangleCount = (doc) =>
  doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0);

/** The author, licence and source that Sketchfab stores in the file. They travel with the optimised file. */
function readAttribution(file) {
  const bytes = readFileSync(file);
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
  return json.asset?.extras ?? {};
}

/** Old spec/gloss materials (the golf bag) become the metal/roughness the renderer understands. */
async function convertMaterials(doc) {
  await doc.transform(metalRough());
  for (const m of doc.getRoot().listMaterials()) {
    // With no environment map, metal renders black. Keep everything matte to satin so it reads under plain lights.
    m.setMetallicFactor(Math.min(m.getMetallicFactor(), 0.25));
    m.setRoughnessFactor(Math.max(0.55, Math.min(m.getRoughnessFactor(), 0.8)));
  }
}

/** Bakes all node transforms into the vertices, then fits the model to the requested size and origin. */
async function normalise(doc, { size, yaw = 0 }) {
  await doc.transform(flatten());
  const scene = doc.getRoot().listScenes()[0];
  for (const node of scene.listChildren()) if (node.getMesh()) clearNodeTransform(node);

  const meshes = doc.getRoot().listMeshes();
  for (const mesh of meshes) transformMesh(mesh, rotationY(yaw)); // rotate first so the bounds are the final ones
  const b = getBounds(scene);
  const extent = { x: b.max[0] - b.min[0], y: b.max[1] - b.min[1], z: b.max[2] - b.min[2] }[size.axis];
  const cx = (b.min[0] + b.max[0]) / 2;
  const cz = (b.min[2] + b.max[2]) / 2;
  const fit = mul(scaling(size.value / extent), translation(-cx, -b.min[1], -cz));
  for (const mesh of meshes) transformMesh(mesh, fit);
  return getBounds(scene);
}

/** Resizes, re-grades and re-encodes every texture as WebP. */
async function processTextures(doc, cfg) {
  const root = doc.getRoot();
  const original = root.listTextures();
  for (const i of cfg.dropTextureIndexes ?? []) {
    for (const m of root.listMaterials()) if (m.getBaseColorTexture() === original[i]) m.setBaseColorTexture(null);
    original[i].dispose();
  }
  for (const [i, texture] of root.listTextures().entries()) {
    const c = cfg.textures[Math.min(i, cfg.textures.length - 1)];
    let img = sharp(Buffer.from(texture.getImage()));
    if (c.grade) img = img.modulate(c.grade);
    const webp = await img.resize(c.size, c.size, { fit: 'inside', withoutEnlargement: true }).webp({ quality: c.quality, effort: 6 }).toBuffer();
    texture.setImage(new Uint8Array(webp)).setMimeType('image/webp');
  }
  doc.createExtension(EXTTextureWebP).setRequired(true); // the file now declares the format it contains
}

async function optimise(name, cfg) {
  const src = path.join(SRC, cfg.src);
  const doc = await io.read(src);
  const before = { bytes: statSync(src).size, tris: Math.round(triangleCount(doc)) };

  if (cfg.specGloss) await convertMaterials(doc);
  const bounds = await normalise(doc, cfg);

  await Promise.all([MeshoptSimplifier.ready, MeshoptEncoder.ready]);
  await doc.transform(dedup(), weld());
  // decimate per mesh (before join merges them); the first rule whose text is in the mesh name wins
  const rules = cfg.simplify ?? [{ match: '', ratio: Math.min(1, cfg.tris / triangleCount(doc)), error: 0.05 }];
  for (const mesh of doc.getRoot().listMeshes()) {
    const rule = rules.find((r) => mesh.getName().includes(r.match));
    if (!rule || rule.ratio >= 1) continue;
    for (const prim of mesh.listPrimitives()) simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: rule.ratio, error: rule.error ?? 0.05, lockBorder: cfg.lockBorder ?? false });
  }
  await doc.transform(join());
  await processTextures(doc, cfg);
  await doc.transform(prune(), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }), meshopt({ encoder: MeshoptEncoder, level: 'high' }));

  doc.getRoot().setExtras({ ...readAttribution(src), optimised: 'decimated, re-textured as WebP, rescaled and compressed for the web' });

  mkdirSync(OUT, { recursive: true });
  const out = path.join(OUT, `${name}.glb`);
  await io.write(out, doc);
  const after = { bytes: statSync(out).size, tris: Math.round(triangleCount(doc)) };
  console.log(
    `${name.padEnd(7)} ${kb(before.bytes).padStart(8)} -> ${kb(after.bytes).padStart(7)}   ` +
      `${String(before.tris).padStart(7)} -> ${String(after.tris).padStart(6)} tris   ` +
      `size ${[0, 1, 2].map((i) => (bounds.max[i] - bounds.min[i]).toFixed(2)).join(' x ')}`,
  );
  return after.bytes;
}

const only = process.argv.slice(2);
let total = 0;
for (const [name, cfg] of Object.entries(MODELS)) {
  if (only.length && !only.includes(name)) continue;
  total += await optimise(name, cfg);
}
console.log(`total shipped: ${kb(total)}`);
