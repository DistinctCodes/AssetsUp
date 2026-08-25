import { create } from 'zustand';

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  network: string | null;
  isConnecting: boolean;
  error: string | null;

  connect: () => Promise<void>;
  disconnect: () => void;
  getAddress: () => Promise<string | null>;
  signTransaction: (xdr: string) => Promise<string | null>;
}

async function isFreighterAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const freighter = await import('@stellar/freighter-api');
    return !!freighter;
  } catch {
    return false;
  }
}

export const useWalletStore = create<WalletState>((set, get) => ({
  isConnected: false,
  address: null,
  network: null,
  isConnecting: false,
  error: null,

  connect: async () => {
    set({ isConnecting: true, error: null });

    try {
      const available = await isFreighterAvailable();
      if (!available) {
        throw new Error(
          'Freighter wallet not detected. Please install the Freighter browser extension.',
        );
      }

      const freighter = await import('@stellar/freighter-api');

      const address = await freighter.getAddress();
      const network = await freighter.getNetwork();

      const appNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
      if (network !== appNetwork) {
        set({
          error: `Wrong network. Expected ${appNetwork}, got ${network}. Please switch your Freighter wallet to ${appNetwork}.`,
          isConnecting: false,
        });
        return;
      }

      localStorage.setItem('walletAddress', address);
      localStorage.setItem('walletNetwork', network);

      set({
        isConnected: true,
        address,
        network,
        isConnecting: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to connect wallet';
      set({ error: message, isConnecting: false });
    }
  },

  disconnect: () => {
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('walletNetwork');
    set({
      isConnected: false,
      address: null,
      network: null,
      error: null,
    });
  },

  getAddress: async () => {
    const state = get();
    if (state.isConnected && state.address) {
      return state.address;
    }

    try {
      const freighter = await import('@stellar/freighter-api');
      const address = await freighter.getAddress();
      return address;
    } catch {
      return null;
    }
  },

  signTransaction: async (xdr: string) => {
    try {
      const freighter = await import('@stellar/freighter-api');
      const signedXdr = await freighter.signTransaction(xdr);
      return signedXdr;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to sign transaction';
      set({ error: message });
      return null;
    }
  },
}));
