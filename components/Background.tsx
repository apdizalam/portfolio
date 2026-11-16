export default function Background() {
  return (
    <div className="bg" aria-hidden="true">
      <span className="bg__glow bg__glow--left" />
      <span className="bg__glow bg__glow--right" />
      <span className="bg__dots bg__dots--left" />
      <span className="bg__dots bg__dots--right" />
    </div>
  );
}
