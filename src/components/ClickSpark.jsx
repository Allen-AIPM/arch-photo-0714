import { useCallback, useEffect, useRef } from "react";

function ClickSpark({
  sparkColor = "#b76647",
  sparkSize = 10,
  sparkRadius = 18,
  sparkCount = 8,
  duration = 430,
  easing = "ease-out",
  extraScale = 1,
  children
}) {
  const canvasRef = useRef(null);
  const sparksRef = useRef([]);
  const animationIdRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let resizeTimeout;
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 80);
    };

    window.addEventListener("resize", handleResize);
    resizeCanvas();

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  const easeFunc = useCallback(
    (t) => {
      if (easing === "linear") return t;
      if (easing === "ease-in") return t * t;
      if (easing === "ease-in-out") return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      return t * (2 - t);
    },
    [easing]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      const ctx = canvas?.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, []);

  const draw = useCallback(
    (timestamp) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      animationIdRef.current = null;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = timestamp - spark.startTime;
        if (elapsed >= duration) return false;

        const progress = elapsed / duration;
        const eased = easeFunc(progress);
        const distance = eased * sparkRadius * extraScale;
        const lineLength = sparkSize * (1 - eased);

        const x1 = spark.x + distance * Math.cos(spark.angle);
        const y1 = spark.y + distance * Math.sin(spark.angle);
        const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
        const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

        ctx.strokeStyle = sparkColor;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        return true;
      });

      if (sparksRef.current.length) {
        animationIdRef.current = requestAnimationFrame(draw);
      }
    },
    [duration, easeFunc, extraScale, sparkColor, sparkRadius, sparkSize]
  );

  const handleClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const x = event.clientX;
    const y = event.clientY;
    const now = performance.now();
    const newSparks = Array.from({ length: sparkCount }, (_, index) => ({
      x,
      y,
      angle: (2 * Math.PI * index) / sparkCount,
      startTime: now
    }));
    sparksRef.current.push(...newSparks);
    if (!animationIdRef.current) {
      animationIdRef.current = requestAnimationFrame(draw);
    }
  };

  return (
    <div className="click-spark-layer" onClick={handleClick}>
      <canvas ref={canvasRef} className="click-spark-canvas" />
      {children}
    </div>
  );
}

export default ClickSpark;
