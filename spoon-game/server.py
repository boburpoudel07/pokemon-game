"""
Spoon Game — YOLOv8 detection server.
Run:  uvicorn server:app --port 8765
"""
import asyncio
import json
import numpy as np
import cv2
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

app = FastAPI()

# Allow the browser to connect from any origin (file:// or localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# YOLOv8 nano — auto-downloads ~6 MB on first run
# COCO classes: fork=42, knife=43, spoon=44
model = YOLO("yolov8n.pt")
UTENSIL_CLASSES = [42, 43, 44]
CONFIDENCE_THRESHOLD = 0.10

print("✅  YOLOv8 model loaded — ready on ws://localhost:8765/detect")


@app.websocket("/detect")
async def detect(ws: WebSocket):
    await ws.accept()
    print("📷  Client connected")
    try:
        while True:
            # Receive raw JPEG bytes from the browser
            data = await ws.receive_bytes()

            # Decode JPEG → BGR numpy array
            arr   = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)

            if frame is None:
                await ws.send_text(json.dumps({"detected": False, "confidence": 0.0}))
                continue

            # Run YOLOv8 inference (CPU-only is fine for 320px frames)
            results = model.predict(
                frame,
                classes=UTENSIL_CLASSES,
                conf=CONFIDENCE_THRESHOLD,
                imgsz=320,      # small input = fast inference
                verbose=False,
            )

            boxes = results[0].boxes
            if len(boxes):
                # Pick the box with highest confidence
                confs = boxes.conf.tolist()
                best_idx = int(np.argmax(confs))
                best_box = boxes[best_idx]

                xywh       = best_box.xywh[0].tolist()   # [cx, cy, w, h]
                class_id   = int(best_box.cls[0])
                class_name = model.names[class_id]
                confidence = float(best_box.conf[0])

                await ws.send_text(json.dumps({
                    "detected":    True,
                    "confidence":  round(confidence, 3),
                    "class":       class_name,
                    "bbox":        [round(v, 1) for v in xywh],
                }))
            else:
                await ws.send_text(json.dumps({"detected": False, "confidence": 0.0}))

    except WebSocketDisconnect:
        print("📷  Client disconnected")
    except Exception as e:
        print(f"⚠️  Error: {e}")
        try:
            await ws.send_text(json.dumps({"detected": False, "confidence": 0.0, "error": str(e)}))
        except Exception:
            pass
