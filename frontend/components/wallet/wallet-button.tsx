"use client";

import { useWalletStore } from "@/store/wallet.store";
import { Wallet, ExternalLink, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletButton() {
  const { isConnected, address, network, isConnecting, error, connect, disconnect } =
    useWalletStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!isConnected) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={connect}
          disabled={isConnecting}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <Wallet size={15} />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
        {error && (
          <div className="absolute right-0 mt-2 w-72 p-3 bg-red-50 border border-red-200 rounded-lg shadow-md text-sm text-red-700 z-50">
            {error}
            <div className="mt-2">
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-red-600 underline hover:text-red-800"
              >
                Install Freighter <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
      >
        <div className="w-2 h-2 rounded-full bg-green-500" />
        {truncateAddress(address!)}
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-md py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-500">Connected Wallet</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              {address}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Network: {network}</p>
          </div>
          <a
            href={`https://stellar.expert/explorer/${network}/account/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink size={14} />
            View on Stellar Expert
          </a>
          <button
            onClick={() => {
              disconnect();
              setDropdownOpen(false);
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
          >
            <LogOut size={14} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
