import { useEffect, useRef, useState } from "react";
import { A4_WIDTH_PX } from "../utils/signatureUtils";

export function useA4Scale() {
  const scrollAreaRef = useRef(null);
  const [a4Scale, setA4Scale] = useState(1);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth - 40;
      setA4Scale(Math.min(1, available / (A4_WIDTH_PX + 40)));
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { a4Scale, scrollAreaRef };
}
