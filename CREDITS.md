# Credits

Third-party assets used by the site, and what was done to them.

## 3D models

The hero's opening scene uses four models from Sketchfab, downloaded once and optimised for the web by
[scripts/optimize-models.mjs](scripts/optimize-models.mjs): decimated, re-textured as WebP, rescaled and
compressed with [meshoptimizer](https://github.com/zeux/meshoptimizer). The optimised files ship in
`public/models/`; the originals are not committed (see `scripts/optimize-models.mjs` for how to regenerate
them from a fresh download).

| Model | Author | Licence | Source |
|---|---|---|---|
| Golf Statue | [David Wigforss](https://sketchfab.com/dwigfor) | [CC BY-NC 4.0](http://creativecommons.org/licenses/by-nc/4.0/) | [sketchfab.com/3d-models/golf-statue](https://sketchfab.com/3d-models/golf-statue-d96258f66480403e8490f36d2e2d88cf) |
| Golf (putting green) | [maccanz](https://sketchfab.com/maccanz) | [CC BY-NC-SA 4.0](http://creativecommons.org/licenses/by-nc-sa/4.0/) | [sketchfab.com/3d-models/golf](https://sketchfab.com/3d-models/golf-90251d4dd91541798349d131cb74ffd3) |
| Golf Bag | [mikethornley](https://sketchfab.com/mikethornley) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | [sketchfab.com/3d-models/golf-bag](https://sketchfab.com/3d-models/golf-bag-12113d34eca34f619dfcafaf9ae36a2a) |
| Area 9 Golf Cart | [maxdragonn](https://sketchfab.com/maxdragon) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | [sketchfab.com/3d-models/area-9-golf-cart](https://sketchfab.com/3d-models/area-9-golf-cart-5fd13a5303af4f3bbbba993dad35f788) |

Two of the four licences (CC BY-NC and CC BY-NC-SA) are non-commercial. Stableford's PRD is a portfolio
assignment, not a commercial product, which is the use made of them here; replace the statue and the green
before any commercial deployment, or relicense with the authors.

## Fonts

Instrument Sans, Instrument Serif and Geist Mono, all open source, loaded via `next/font/google`
(see [src/lib/fonts.ts](src/lib/fonts.ts)).
