export function SolarSystem({ scale = 1 }: { scale?: number }) {
  return (
    <div
      className="solar"
      style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}
      aria-hidden
    >
      <i className="mercury" />
      <i className="venus" />
      <i className="earth" />
      <i className="mars" />
      <i className="belt" />
      <i className="jupiter" />
      <i className="saturn" />
      <i className="uranus" />
      <i className="neptune" />
    </div>
  );
}
