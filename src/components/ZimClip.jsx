import { useLayoutEffect, useRef, useState } from "react";
import { PATHS } from "../lib/zimPaths";
import { useNavigate } from "react-router-dom";

const NAMES = {
  matnorth: "Matabeleland North",
  matsouth: "Matabeleland South",
  midlands: "Midlands",
  masvingo: "Masvingo",
  mashwest: "Mashonaland West",
  mashcentral: "Mashonaland Central",
  masheast: "Mashonaland East",
  manicaland: "Manicaland",
};

export function ZimClip({ id = "zim-clip" }) {
  const measureRef = useRef(null);
  const [transform, setTransform] = useState("");

  useLayoutEffect(() => {
    const b = measureRef.current.getBBox();
    setTransform(
      `scale(${1 / b.width} ${1 / b.height}) translate(${-b.x} ${-b.y})`
    );
    document.documentElement.style.setProperty(
      "--zim-ratio",
      `${b.width} / ${b.height}`
    );
  }, []);

  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      {/* invisible copy, only used to measure the bounding box */}
      <g ref={measureRef} style={{ visibility: "hidden" }}>
        {Object.entries(PATHS).map(([k, d]) => <path key={k} d={d} />)}
      </g>

      <clipPath id={id} clipPathUnits="objectBoundingBox">
        {Object.entries(PATHS).map(([k, d]) => (
          <path key={k} d={d} transform={transform} />
        ))}
      </clipPath>
    </svg>
  );
}

export function ZimBorders() {
  const ref = useRef(null);
  const navigate = useNavigate();
  const [vb, setVb] = useState("0 0 1000 1000");

  useLayoutEffect(() => {
    const b = ref.current.getBBox();
    setVb(`${b.x} ${b.y} ${b.width} ${b.height}`);
  }, []);

  const go = (id) => navigate(`/marketplace?province=${id}`);

  return (
    <svg className="zim-borders" viewBox={vb} preserveAspectRatio="none">
      <g ref={ref}>
        {Object.entries(PATHS).map(([id, d]) => (
          <path
            key={id}
            d={d}
            className="zim-province"
            vectorEffect="non-scaling-stroke"
            role="link"
            tabIndex={0}
            aria-label={`Browse livestock in ${NAMES[id]}`}
            onClick={() => go(id)}
            onKeyDown={(e) => e.key === "Enter" && go(id)}
          >
            <title>{NAMES[id]}</title>
          </path>
        ))}
      </g>
    </svg>
  );
}
