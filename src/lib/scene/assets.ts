import type { Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * The four models, optimised by `npm run models:optimize` (about 740 KB together, from 10 MB of source files).
 * Geometry is meshopt-compressed and textures are WebP, so the only decoder needed is a few KB of WASM.
 * Credits and licences are in CREDITS.md.
 */
const MODELS = {
  land: '/models/land.glb',
  statue: '/models/statue.glb',
  bag: '/models/bag.glb',
  cart: '/models/cart.glb',
} as const;

export type ModelName = keyof typeof MODELS;

let loader: GLTFLoader | undefined;

export async function loadModel(name: ModelName): Promise<Group> {
  loader ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(MODELS[name]);
  return gltf.scene;
}
