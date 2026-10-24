export function Icon({ children, size = 18 }) {
  return (
    <span className="icon" style={{ width: size, height: size }}>
      {children}
    </span>
  );
}
