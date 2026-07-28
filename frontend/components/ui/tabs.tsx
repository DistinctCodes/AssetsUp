import { ReactNode, useState, createContext, useContext } from 'react';

const TabsContext = createContext<{ value: string; setValue: (v: string) => void }>({
  value: '',
  setValue: () => {},
});

export function Tabs({
  children,
  defaultValue,
  className,
}: {
  children: ReactNode;
  defaultValue?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue || '');
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`flex gap-2 border-b border-gray-200 mb-4 ${className || ''}`}>{children}</div>;
}

export function TabsTrigger({
  children,
  value,
  className,
}: {
  children: ReactNode;
  value: string;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  return (
    <button
      type="button"
      className={`px-3 py-2 text-sm font-medium ${ctx.value === value ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500'} ${className || ''}`}
      onClick={() => ctx.setValue(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  children,
  value,
  className,
}: {
  children: ReactNode;
  value: string;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}
