export function Avatar({ children }: { children?: React.ReactNode }) {
  return <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">{children}</div>;
}

export function AvatarImage({ src, alt }: { src?: string; alt?: string }) {
  return src ? <img src={src} alt={alt || ''} className="w-full h-full rounded-full object-cover" /> : null;
}

export function AvatarFallback({ children }: { children?: React.ReactNode }) {
  return <span>{children}</span>;
}
