# ShetiMitra crop-model setup

The crop analyzer intentionally does not invent a disease result. It runs a real model only when a validated ONNX classifier is supplied.

## Browser inference contract

Set these values in the deployment environment (not in a committed `.env` file):

```text
VITE_CROP_MODEL_URL=/models/shetimitra-crop-classifier.onnx
VITE_CROP_MODEL_NAME=EfficientNet-Lite crop classifier v1
VITE_CROP_MODEL_LABELS=Healthy leaf,Fungal leaf spot,Early blight,Late blight,Powdery mildew,Rust,Leaf miner / pest damage,Nitrogen deficiency,Potassium deficiency,Water stress
VITE_CROP_SEGMENTATION_MODEL_URL=/models/shetimitra-lesion-seg.onnx
```

The current browser adapter expects one `float32` NCHW input shaped `[1, 3, 224, 224]`, ImageNet-normalised RGB, and one vector of logits whose order exactly matches `VITE_CROP_MODEL_LABELS`. `onnxruntime-web` executes it in the browser with the WASM provider, keeping leaf images on-device.

Export an EfficientNet or ViT classifier to that contract. A separate, validated YOLOv8-seg lesion model must be connected before the product displays affected-leaf-area percentage; a class-only classifier cannot calculate that number honestly.

## Weather safety

Add `OPENWEATHER_API_KEY` only to the backend environment. The FastAPI `/api/crop-weather` endpoint proxies the forecast, applies conservative rain/wind/heat flags, and never returns the key to the browser. A missing forecast is always shown as unverified, never as a safe spray window.

## Before production

- Validate class labels separately for cotton, wheat, paddy, soybean and tomato field images, including blur, shadow and mixed backgrounds.
- Have qualified local agronomists approve every crop/disease treatment path and product recommendation for the deployment region.
- Add a per-crop registered-product catalogue rather than hard-coding pesticide dosages. The current UI intentionally directs the farmer to local label and extension guidance.
