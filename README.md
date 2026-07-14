# MASOFISH — Vercel-Ready Web App

This folder is ready to deploy as a static site on Vercel. It includes the Stitch-based interface and the local TensorFlow.js / Teachable Machine fish-identification model.

## Included pages

- `index.html` — dashboard
- `fish-identification.html` — image upload and AI identification
- `identification-result.html` — prediction results
- `tides-weather.html`
- `announcements.html`
- `recipes.html`
- `model/` — `model.json`, `metadata.json`, and `weights.bin`

## Deploy using GitHub

1. Create a new GitHub repository.
2. Upload the contents of this folder to the repository root. Do not upload the outer ZIP as the project.
3. In Vercel, choose **Add New → Project** and import the repository.
4. Use **Other** as the Framework Preset.
5. Leave the Build Command empty.
6. Leave the Output Directory empty so Vercel serves the project root.
7. Select **Deploy**.

## Deploy using the Vercel CLI

From inside this folder:

```bash
npm install -g vercel
vercel
```

For a production deployment:

```bash
vercel --prod
```

## Important notes

- Fish identification runs in the visitor's browser after the model is downloaded.
- No external fish-identification API key is required.
- TensorFlow.js, the Teachable Machine image library, Tailwind CSS, Google Fonts, and Material Symbols are currently loaded from public CDNs, so the deployed site needs internet access on first load.
- The fish model currently recognizes Milkfish, Indian Mackerel, Eel, Tilapia, Scatfish, Mullet, Rabbitfish, and No Fish.
- Update the model by replacing the three files inside `model/` while preserving their filenames.
