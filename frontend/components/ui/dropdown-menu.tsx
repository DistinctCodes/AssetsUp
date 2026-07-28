import { useState, createContext, useContext, ReactNode } from 'react';

const DropdownMenuContext = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({ children, asChild }: { children: ReactNode; asChild?: boolean }) {
  const { open, setOpen } = useContext(DropdownMenuContext);
  if (asChild && children) {
    return (
      <div onClick={() => setOpen(!open)} className="inline-block">
        {children}
      </div>
    );
  }
  return (
    <button type="button" onClick={() => setOpen(!open)}>
      {children}
    </button>
  );
}

export function DropdownMenuContent({ children }: { children: ReactNode }) {
  const { open } = useContext(DropdownMenuContext);
  if (!open) return null;
  return <div className="absolute z-50 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-md py-1">{children}</div>;
}

export function DropdownMenuItem({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  const { setOpen } = useContext(DropdownMenuContext);
  return (
    <button
      type="button"
      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
}
