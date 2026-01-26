declare global {
  interface Window {
    storage: {
      get: (key: string) => Promise<{ key: string; value: string } | null>;
      set: (key: string, value: string) => Promise<{ key: string; value: string } | null>;
      delete: (key: string) => Promise<{ key: string; deleted: boolean } | null>;
      list: (prefix?: string) => Promise<{ keys: string[] } | null>;
    };
  }
}

export {};