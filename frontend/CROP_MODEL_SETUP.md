# ShetiMitra crop-vision setup

The live analyzer sends the exact leaf photo selected by the farmer to the
server-configured CropVision service for one request-scoped screening. It
does not invent a diagnosis when the analysis service is unavailable. The returned diagnosis
contains a visual confidence, visible focus boxes, a visual affected-area
estimate when possible, and a bounded field-care plan. Photos are not stored by
ShetiMitra; signed-in accounts retain the result summary only.

## Start the live CropVision workflow

The backend uses server-only vision configuration. Keep its credentials and
model configuration outside the Vite environment:

```text
GOOGLE_APPLICATION_CREDENTIALS=C:\secure\vertex-service-account.json
GOOGLE_CLOUD_PROJECT=your-google-cloud-project
GOOGLE_CLOUD_LOCATION=global
GEMINI_MODEL=your-enabled-vision-model
OPENWEATHER_API_KEY=optional-weather-key
```

Start both services from the project root:

```powershell
.\start_backend.bat
.\start_frontend.bat
```

Open **Crop Analyzer**, take or upload a JPG, PNG, or WebP leaf photo (up to
10 MB), then choose **Analyse leaf with ShetiMitra**. CropVision receives that
original photo, not a browser thumbnail.
The highlighted boxes are visual focus regions, not proof of a disease. Review
the suggested plan, then explicitly choose whether to add it to the calendar.

`OPENWEATHER_API_KEY` is optional for diagnosis but required before the app can
mark a spray window as safer. A missing forecast is always shown as unverified,
never safe.

## Optional local ONNX Runtime Web model

ONNX Runtime Web remains installed for a separately validated local classifier
or lesion/segmentation model. It is deliberately optional: do **not** download
a generic COCO/object-detection model and call its boxes plant disease boxes.
Only connect a model trained and evaluated for the target crops and symptoms.

Set these browser values only when such a validated model is ready:

Set these values in the deployment environment (not in a committed `.env` file):

```text
VITE_CROP_MODEL_URL=/models/shetimitra-crop-classifier.onnx
VITE_CROP_MODEL_NAME=EfficientNet-Lite crop classifier v1
VITE_CROP_MODEL_LABELS=Healthy leaf,Fungal leaf spot,Early blight,Late blight,Powdery mildew,Rust,Leaf miner / pest damage,Nitrogen deficiency,Potassium deficiency,Water stress
VITE_CROP_SEGMENTATION_MODEL_URL=/models/shetimitra-lesion-seg.onnx
```

The optional browser adapter expects one `float32` NCHW input shaped `[1, 3, 224, 224]`, ImageNet-normalised RGB, and one vector of logits whose order exactly matches `VITE_CROP_MODEL_LABELS`. `onnxruntime-web` executes it in the browser with the WASM provider, keeping leaf images on-device.

Export an EfficientNet or ViT classifier to that contract. A separate, validated YOLOv8-seg lesion model must be connected before the product displays affected-leaf-area percentage; a class-only classifier cannot calculate that number honestly.

## Before production

- Validate class labels separately for cotton, wheat, paddy, soybean and tomato field images, including blur, shadow and mixed backgrounds.
- Have qualified local agronomists approve every crop/disease treatment path and product recommendation for the deployment region.
- Add a per-crop registered-product catalogue rather than hard-coding pesticide dosages. The current UI intentionally directs the farmer to local label and extension guidance.
- Use an authenticated server-side service account and an enabled vision model; the frontend cannot and must not contain the API credential.
