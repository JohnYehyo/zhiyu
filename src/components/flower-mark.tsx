export function FlowerMark() {
  return (
    <svg className="flower-mark" viewBox="0 0 80 80" aria-hidden="true">
      <g fill="#F5B1AC">
        {[0, 60, 120, 180, 240, 300].map((rotation) => (
          <ellipse
            key={rotation}
            cx="40"
            cy="22"
            rx="12"
            ry="20"
            transform={`rotate(${rotation} 40 40)`}
          />
        ))}
      </g>
      <circle cx="40" cy="40" r="14" fill="#F6C66F" />
      <circle cx="40" cy="40" r="5" fill="#354c43" />
    </svg>
  );
}
