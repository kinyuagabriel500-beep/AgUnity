import { useEffect, useRef, useState } from "react";

export default function QrBatchScanner({ onDetected }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const [supported, setSupported] = useState(true);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("Camera scanner is off.");

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const stopScan = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setActive(false);
    setMessage("Scanner stopped.");
  };

  const startScan = async () => {
    if (!("BarcodeDetector" in window)) {
      setSupported(false);
      setMessage("Browser QR scanning is not supported. Use manual code input.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      intervalRef.current = setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (!barcodes.length) return;
          const raw = String(barcodes[0].rawValue || "").trim();
          if (!raw) return;
          onDetected(raw);
          setMessage(`Detected code: ${raw}`);
          stopScan();
        } catch (_error) {
          // Keep scanning silently while camera frames stabilize.
        }
      }, 600);

      setActive(true);
      setMessage("Point camera at QR code.");
    } catch (_error) {
      setMessage("Unable to access camera for scanning.");
    }
  };

  return (
    <div className="qr-scanner">
      <div className="row">
        <strong>QR Batch Scanner</strong>
        {!supported ? <small>Unsupported on this browser</small> : null}
      </div>
      <p>{message}</p>
      <div className="inline-actions">
        {!active ? <button type="button" onClick={startScan}>Start camera scan</button> : null}
        {active ? <button type="button" onClick={stopScan}>Stop scan</button> : null}
      </div>
      <video ref={videoRef} className="qr-video" muted playsInline />
    </div>
  );
}
