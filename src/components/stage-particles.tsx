const particles = Array.from({ length: 30 }, (_, index) => ({
  id: index,
  left: `${(index * 37 + 11) % 100}%`,
  top: `${(index * 53 + 17) % 100}%`,
  size: `${1 + ((index * 19) % 40) / 10}px`,
  delay: `${((index * 13) % 50) / 10}s`,
  duration: `${5 + ((index * 47) % 100) / 10}s`,
}));

export function StageParticles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map(({ id, left, top, size, delay, duration }) => (
        <span key={id} className="particle" style={{ left, top, width: size, height: size, animationDelay: delay, animationDuration: duration }} />
      ))}
    </div>
  );
}
