import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import "./Masonry.css";

const useMedia = (queries, values, defaultValue) => {
  const get = () => values[queries.findIndex((query) => matchMedia(query).matches)] ?? defaultValue;
  const [value, setValue] = useState(get);

  useEffect(() => {
    const handler = () => setValue(get());
    const media = queries.map((query) => matchMedia(query));
    media.forEach((query) => query.addEventListener("change", handler));
    return () => media.forEach((query) => query.removeEventListener("change", handler));
  }, [queries]);

  return value;
};

const useMeasure = () => {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return [ref, size];
};

function Masonry({
  items,
  renderItem,
  ease = "power3.out",
  duration = 0.55,
  stagger = 0.025,
  animateFrom = "bottom",
  scaleOnHover = false,
  hoverScale = 0.98,
  blurToFocus = true
}) {
  const columns = useMedia(
    ["(min-width:1500px)", "(min-width:1120px)", "(min-width:760px)", "(min-width:480px)"],
    [4, 3, 2, 2],
    1
  );
  const [containerRef, { width }] = useMeasure();
  const [imagesReady, setImagesReady] = useState(false);
  const [naturalRatios, setNaturalRatios] = useState({});
  const hasMounted = useRef(false);

  useEffect(() => {
    setImagesReady(false);
    let cancelled = false;
    const urls = items.slice(0, 12).map((item) => item.img);
    Promise.all(
      urls.map((src, index) =>
          new Promise((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve({ id: items[index]?.id, ratio: img.naturalHeight / img.naturalWidth });
            img.onerror = () => resolve({ id: items[index]?.id, ratio: undefined });
          })
      )
    ).then((results) => {
      if (cancelled) return;
      setNaturalRatios((current) => {
        const next = { ...current };
        results.forEach((result) => {
          if (result?.id && Number.isFinite(result.ratio)) next[result.id] = result.ratio;
        });
        return next;
      });
      setImagesReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  const { grid, height } = useMemo(() => {
    if (!width) return { grid: [], height: 0 };
    const gap = 24;
    const colHeights = new Array(columns).fill(0);
    const columnWidth = (width - gap * (columns - 1)) / columns;
    const nextGrid = items.map((item) => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = (columnWidth + gap) * col;
      const ratio = item.ratio || naturalRatios[item.id] || 0.75;
      const h = Math.max(160, columnWidth * ratio);
      const y = colHeights[col];
      colHeights[col] += h + gap;
      return { ...item, x, y, w: columnWidth, h };
    });
    return { grid: nextGrid, height: Math.max(...colHeights, 260) };
  }, [columns, items, naturalRatios, width]);

  const getInitialPosition = (item) => {
    if (animateFrom === "top") return { x: item.x, y: -180 };
    if (animateFrom === "left") return { x: -220, y: item.y };
    if (animateFrom === "right") return { x: window.innerWidth + 220, y: item.y };
    if (animateFrom === "center") return { x: width / 2 - item.w / 2, y: height / 2 - item.h / 2 };
    return { x: item.x, y: item.y + 120 };
  };

  useLayoutEffect(() => {
    if (!imagesReady || !grid.length) return;

    grid.forEach((item, index) => {
      const selector = `[data-key="${CSS.escape(String(item.id))}"]`;
      const animationProps = { x: item.x, y: item.y, width: item.w, height: item.h };
      if (!hasMounted.current) {
        const initialPos = getInitialPosition(item);
        gsap.fromTo(
          selector,
          {
            opacity: 0,
            x: initialPos.x,
            y: initialPos.y,
            width: item.w,
            height: item.h,
            ...(blurToFocus && { filter: "blur(10px)" })
          },
          {
            opacity: 1,
            ...animationProps,
            ...(blurToFocus && { filter: "blur(0px)" }),
            duration: 0.78,
            ease,
            delay: index * stagger
          }
        );
      } else {
        gsap.to(selector, { ...animationProps, duration, ease, overwrite: "auto" });
      }
    });
    hasMounted.current = true;
  }, [blurToFocus, duration, ease, grid, height, imagesReady, stagger, width]);

  const handleMouseEnter = (item) => {
    if (!scaleOnHover) return;
    gsap.to(`[data-key="${CSS.escape(String(item.id))}"]`, { scale: hoverScale, duration: 0.25, ease: "power2.out" });
  };

  const handleMouseLeave = (item) => {
    if (!scaleOnHover) return;
    gsap.to(`[data-key="${CSS.escape(String(item.id))}"]`, { scale: 1, duration: 0.25, ease: "power2.out" });
  };

  return (
    <div ref={containerRef} className="rb-masonry-list" style={{ height }}>
      {grid.map((item) => (
        <div
          key={item.id}
          data-key={item.id}
          className="rb-masonry-item"
          onMouseEnter={() => handleMouseEnter(item)}
          onMouseLeave={() => handleMouseLeave(item)}
        >
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}

export default Masonry;
