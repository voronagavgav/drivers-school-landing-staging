# demo-images/

Generated illustrative images for **demo / non-official** content only. Served at `/demo-images/<file>`.

Empty until an image-generation key is configured. To generate (FLUX 2):

```
# add ONE to ~/drivers-school/.env  (BFL direct is cheapest + newest for FLUX 2, ~$0.03/MP):
#   BFL_API_KEY=...        (preferred)
#   FAL_KEY=...            (alt; ~2× on FLUX 2 but one key for many models)
node .content-import/gen_demo_image.mjs "<prompt>" <name> [pro|flex|dev]
```

NEVER use generated raster here for official ПДР **signs** (use `public/sign-vectors/`, official vector
diagrams) or for precise **diagrams** (use authored SVG via `.content-import/question-svgs/`). Generated
pixels can't be trusted for exact road markings / sign pictograms.
