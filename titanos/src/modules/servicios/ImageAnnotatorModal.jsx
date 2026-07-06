import { useEffect, useRef, useState } from "react";

function ImageAnnotatorModal({ image, onClose, onSave }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
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

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };

    img.src = image.annotatedSrc || image.src;
  }, [image]);

  const getPosition = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (event) => {
    event.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPosition(event);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#f15a24";

    setIsDrawing(true);
  };

  const draw = (event) => {
    if (!isDrawing) return;
    event.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPosition(event);

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const saveImage = () => {
    const canvas = canvasRef.current;

    onSave({
      ...image,
      annotatedSrc: canvas.toDataURL("image/jpeg", 0.75),
      description,
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="image-editor-modal">
        <div className="modal-header">
          <div>
            <h2>Anotar fotografía</h2>
            <p>Dibuja sobre la imagen y agrega descripción si aplica.</p>
          </div>

          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="canvas-wrap">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <label className="full-label">
          Descripción
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descripción opcional de la evidencia."
          />
        </label>

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancelar
          </button>

          <button className="primary-button" onClick={saveImage}>
            Guardar foto
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImageAnnotatorModal;