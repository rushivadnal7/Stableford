import {
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  LinearFilter,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Raycaster,
  RGBAFormat,
  Scene,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Texture,
  Vector3,
  type Material,
} from 'three';
import { loadModel } from './assets';
import type { SceneColors } from './colors';
import { alongPath, bagAt, ballAt, bezier, CART_ROUTE, cartAt, PLACES, statueTurnAt, warmthAt, type Vec3 } from './story';

const TRAIL_DOTS = 70;
const ANISOTROPY = 4;

/** A soft round falloff, used for blob shadows and the dotted tracer. Built in code, so it costs no download. */
function softDisc(size = 64): DataTexture {
  const data = new Uint8Array(size * size * 4);
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.min(1, Math.hypot(x - c, y - c) / c);
      const a = 1 - d;
      data.set([255, 255, 255, Math.round(a * a * (3 - 2 * a) * 255)], (y * size + x) * 4);
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Finds the height of the land under a point by casting a ray down onto it. */
class Ground {
  land: Object3D | null = null;
  private ray = new Raycaster();
  private down = new Vector3(0, -1, 0);
  private origin = new Vector3();

  heightAt(x: number, z: number, fallback = 0.25): number {
    if (!this.land) return fallback;
    this.origin.set(x, 30, z);
    this.ray.set(this.origin, this.down);
    return this.ray.intersectObject(this.land, true)[0]?.point.y ?? fallback;
  }
}

export interface World {
  /** Loads the land and the statue: everything the opening frame needs. */
  loadCore(): Promise<void>;
  /** Loads the bag and the cart, which the story needs later. `compile` warms their shaders so they never cause a hitch. */
  loadRest(compile: () => Promise<void>): Promise<void>;
  /** Puts everything where the story says it is at this progress. */
  update(progress: number): void;
  dispose(): void;
}

export function createWorld(scene: Scene, colors: SceneColors): World {
  const ground = new Ground();
  const dot = softDisc();
  const disposables: Array<{ dispose(): void }> = [dot];
  const track = <T extends { dispose(): void }>(item: T) => (disposables.push(item), item);

  // ---- light: a bright sky, a warm sun from the upper left, and a cool rim from behind to shape the bronze
  const hemisphere = new HemisphereLight(colors.sky, colors.ground, 1.55);
  const sun = new DirectionalLight(colors.sun, 2.7);
  sun.position.set(-9, 12, 9);
  const rim = new DirectionalLight(colors.sky, 1.5);
  rim.position.set(10, 6, -10);
  scene.add(hemisphere, sun, rim);
  const sunCool = colors.sun.clone().lerp(colors.sky, 0.6);

  // ---- blob shadows: a soft dark disc under each thing, far cheaper than shadow maps
  const shadowGeometry = track(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
  const blob = (size: number, opacity: number) => {
    const material = track(new MeshBasicMaterial({ map: dot, color: colors.shadow, transparent: true, opacity, depthWrite: false }));
    const mesh = new Mesh(shadowGeometry, material);
    mesh.scale.set(size, 1, size);
    mesh.renderOrder = 1;
    scene.add(mesh);
    return { mesh, material, base: opacity };
  };
  const statueShadow = blob(4.2, 0.5);
  const bagShadow = blob(1.9, 0.5);
  const cartShadow = blob(6.2, 0.45);
  const ballShadow = blob(0.7, 0.4);

  // ---- ball and its dotted tracer
  const ball = new Mesh(track(new SphereGeometry(PLACES.ball.radius, 24, 16)), track(new MeshStandardMaterial({ color: colors.ball, roughness: 0.35 })));
  scene.add(ball);
  const trailGeometry = track(new BufferGeometry());
  trailGeometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(TRAIL_DOTS * 3), 3));
  const trail = new Points(
    trailGeometry,
    track(new PointsMaterial({ color: colors.flag, size: 0.2, map: dot, transparent: true, depthWrite: false, sizeAttenuation: true })),
  );
  trail.frustumCulled = false;
  trail.renderOrder = 2;
  scene.add(trail);

  // ---- flag and cup
  const flag = new Group();
  const pole = new Mesh(track(new CylinderGeometry(0.035, 0.035, 3.4, 6).translate(0, 1.7, 0)), track(new MeshStandardMaterial({ color: colors.ball, roughness: 0.5 })));
  const cloth = new Shape().moveTo(0, 0).lineTo(1.25, -0.42).lineTo(0, -0.84).closePath();
  const flagCloth = new Mesh(track(new ShapeGeometry(cloth).translate(0.03, 3.36, 0)), track(new MeshBasicMaterial({ color: colors.flag, side: DoubleSide })));
  const cup = new Mesh(track(new CircleGeometry(0.24, 20).rotateX(-Math.PI / 2)), track(new MeshBasicMaterial({ color: colors.shadow })));
  cup.position.y = 0.02;
  flag.add(pole, flagCloth, cup);
  scene.add(flag);

  // ---- the loaded models
  let statue: Object3D | undefined;
  let bag: Object3D | undefined;
  let cart: Object3D | undefined;
  let cartHeights: number[] = [];

  // resting heights, filled in once the land is known
  const at = { statue: 0.25, bag: 0.25, tee: 0.25, landing: 0.25, flag: 0.25 };
  let flight: { from: Vec3; control: Vec3; to: Vec3 } = { from: [0, 0, 0], control: [0, 0, 0], to: [0, 0, 0] };

  /** Applies shared setup to every mesh of a loaded model. */
  const prepare = (root: Object3D) => {
    root.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials as Array<Material & { map?: Texture | null }>) if (material.map) material.map.anisotropy = ANISOTROPY;
    });
    disposables.push({
      dispose: () =>
        root.traverse((object) => {
          const mesh = object as Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Array<Material & { map?: Texture | null }>) {
            material.map?.dispose();
            material.dispose();
          }
        }),
    });
  };

  const placeCore = () => {
    const { statue: s, bag: b, flag: f, ball: bl } = PLACES;
    at.statue = ground.heightAt(s.x, s.z);
    at.bag = ground.heightAt(b.x, b.z);
    at.flag = ground.heightAt(f.x, f.z);
    at.tee = ground.heightAt(bl.from[0], bl.from[1]);
    at.landing = ground.heightAt(bl.to[0], bl.to[1]);

    statue?.position.set(s.x, at.statue - 0.03, s.z);
    statueShadow.mesh.position.set(s.x, at.statue + 0.03, s.z);
    bagShadow.mesh.position.set(b.x, at.bag + 0.03, b.z);
    flag.position.set(f.x, at.flag, f.z);

    const from: Vec3 = [bl.from[0], at.tee + bl.radius, bl.from[1]];
    const to: Vec3 = [bl.to[0], at.landing + bl.radius, bl.to[1]];
    // the control point is chosen so that the curve peaks at exactly `apex`
    const control: Vec3 = [(from[0] + to[0]) / 2, (4 * bl.apex - from[1] - to[1]) / 2, (from[2] + to[2]) / 2];
    flight = { from, control, to };

    // the dotted tracer follows the same curve, dot by dot
    const positions = trailGeometry.getAttribute('position');
    for (let i = 0; i < TRAIL_DOTS; i++) {
      const [x, y, z] = bezier(from, control, to, i / (TRAIL_DOTS - 1));
      positions.setXYZ(i, x, y, z);
    }
    positions.needsUpdate = true;
  };

  placeCore();

  return {
    async loadCore() {
      const [land, statueModel] = await Promise.all([loadModel('land'), loadModel('statue')]);
      prepare(land);
      prepare(statueModel);
      scene.add(land, statueModel);
      land.updateMatrixWorld(true);
      ground.land = land;
      statue = statueModel;
      placeCore();
    },

    async loadRest(compile) {
      const [bagModel, cartModel] = await Promise.all([loadModel('bag'), loadModel('cart')]);
      prepare(bagModel);
      prepare(cartModel);
      bagModel.position.set(PLACES.bag.x, at.bag, PLACES.bag.z);
      bagModel.rotation.y = MathUtils.degToRad(PLACES.bag.yaw);
      scene.add(bagModel, cartModel);

      // The route's heights, sampled sparsely (a ray per point would be wasteful) and interpolated.
      cartHeights = CART_ROUTE.map((_, i) => (i % 4 === 0 || i === CART_ROUTE.length - 1 ? ground.heightAt(CART_ROUTE[i]![0], CART_ROUTE[i]![1]) : NaN));
      let last = 0;
      cartHeights.forEach((h, i) => {
        if (Number.isNaN(h)) {
          let next = i + 1;
          while (Number.isNaN(cartHeights[next]!)) next++;
          cartHeights[i] = MathUtils.lerp(cartHeights[last]!, cartHeights[next]!, (i - last) / (next - last));
        } else last = i;
      });

      // Shaders compile the first time something is drawn, which would hitch the moment the bag or cart appears.
      // Show them for one compile pass, off screen, so that never happens in front of the visitor.
      bagModel.visible = cartModel.visible = true;
      await compile();
      bagModel.visible = cartModel.visible = false;
      bag = bagModel;
      cart = cartModel;
    },

    update(progress) {
      // light warms toward evening
      sun.color.copy(sunCool).lerp(colors.sun, warmthAt(progress));

      if (statue) statue.rotation.y = MathUtils.degToRad(PLACES.statue.yaw + statueTurnAt(progress));

      // ball: struck as the picture opens, lands beside the flag; its shadow shrinks as it climbs
      const t = ballAt(progress);
      const [bx, by, bz] = bezier(flight.from, flight.control, flight.to, t);
      ball.position.set(bx, by, bz);
      const groundBelow = MathUtils.lerp(at.tee, at.landing, t) + 0.03;
      const height = Math.max(0, by - groundBelow);
      ballShadow.mesh.position.set(bx, groundBelow, bz);
      const lift = 1 - Math.min(1, height / PLACES.ball.apex);
      ballShadow.mesh.scale.setScalar(0.35 + 0.5 * lift);
      ballShadow.material.opacity = ballShadow.base * (0.3 + 0.7 * lift);
      trailGeometry.setDrawRange(0, Math.floor(t * (TRAIL_DOTS - 1)));

      // bag: drops onto the green as the camera turns to it
      if (bag) {
        const b = bagAt(progress);
        bag.visible = b > 0.002;
        const eased = 1 - (1 - b) ** 3;
        bag.position.y = at.bag + (1 - eased) * 2.6;
        bag.scale.setScalar(0.85 + 0.15 * eased);
        bagShadow.material.opacity = bagShadow.base * eased;
      } else bagShadow.material.opacity = 0;

      // cart: drives in along its route and parks
      if (cart) {
        const c = cartAt(progress);
        cart.visible = c > 0.001;
        const { x, z, heading } = alongPath(CART_ROUTE, c);
        const index = c * (CART_ROUTE.length - 1);
        const i = Math.min(cartHeights.length - 2, Math.floor(index));
        const y = MathUtils.lerp(cartHeights[i] ?? at.bag, cartHeights[i + 1] ?? at.bag, index - i);
        cart.position.set(x, y, z);
        cart.rotation.y = heading;
        cartShadow.mesh.position.set(x, y + 0.03, z);
        cartShadow.mesh.rotation.y = heading;
        cartShadow.material.opacity = cart.visible ? cartShadow.base : 0;
      } else cartShadow.material.opacity = 0;
    },

    dispose() {
      disposables.forEach((item) => item.dispose());
      scene.clear();
    },
  };
}
