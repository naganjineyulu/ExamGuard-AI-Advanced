# AI Detection Layer

This project intentionally separates the UI/risk engine from the computer-vision implementation.

Recommended production pipeline:
1. MediaPipe Face Detector / Face Landmarker for face count and head pose.
2. ONNX Runtime Web for browser-side object detection.
3. A YOLO-compatible phone detector trained/validated for webcam frames.
4. An event fusion layer that combines observations over time.
5. A human-review workflow.

The current UI includes a clearly labeled DEMO MODE. It does not claim simulated events are real AI detections.

Suggested interfaces:

detectFaces(frame) -> {count, confidence}
estimateHeadPose(frame) -> {yaw, pitch, roll, confidence}
detectPhone(frame) -> {detected, confidence, bbox}
fuseObservations(observations) -> event[]
