import { useEffect, useRef, useState } from "react";

function ImageAnnotatorModal({ image, onClose, onSave }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [description, setDescription] = useState(image?.description || "");

  useEffect(() => {
    if (!image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      const maxWidth = 900;
      const scale = Math.min(maxWidth / img.width, 1);

      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };

    img.src = image.annotatedSrc || image.originalSrc || image.src;
  }, [image]);

  const getPos = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (event) => {
    event.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(event);

    drawingRef.current = true;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#f15a24";
  };

  const draw = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(event);

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = (event) => {
    if (event) event.preventDefault();
    drawingRef.current = false;
  };

  const guardar = () => {
    const canvas = canvasRef.current;

    onSave({
      ...image,
      annotatedSrc: canvas.toDataURL("image/jpeg", 0.85),
      description,
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="image-editor-modal">
        <div className="modal-header">
          <div>
            <h2>Anotar fotografía</h2>
            <p>Dibuja sobre la imagen y agrega una nota.</p>
          </div>

          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="canvas-wrap">
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              maxHeight: "70vh",
              touchAction: "none",
              background: "#f3f4f6",
              borderRadius: "12px",
            }}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            onPointerLeave={stopDrawing}
          />
        </div>

        <label className="full-label">
          Nota de la imagen
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ej. Golpe en cuadro, rayón, fuga, daño visible..."
          />
        </label>

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancelar
          </button>

          <button className="primary-button" onClick={guardar}>
            Guardar foto
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImageAnnotatorModal;