"use client";

import { useState } from "react";
import { Plus, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Vendor {
  id: string;
  name: string;
  category: string;
  contact: string;
  email: string;
  phone: string;
  activeContracts: number;
}

const MOCK: Vendor[] = [
  {
    id: "1",
    name: "Dell Technologies",
    category: "IT Hardware",
    contact: "John Smith",
    email: "jsmith@dell.com",
    phone: "+1-800-999-3355",
    activeContracts: 3,
  },
  {
    id: "2",
    name: "Office Depot",
    category: "Office Supplies",
    contact: "Sarah Lee",
    email: "slee@officedepot.com",
    phone: "+1-800-463-3768",
    activeContracts: 1,
  },
  {
    id: "3",
    name: "TechServe Inc.",
    category: "Maintenance",
    contact: "Mike Chen",
    email: "mchen@techserve.com",
    phone: "+1-555-123-4567",
    activeContracts: 2,
  },
];

export default function VendorsPage() {
  const [vendors] = useState<Vendor[]>(MOCK);
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Vendors &amp; Suppliers
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your vendor and supplier directory
          </p>
        </div>
        <Button>
          <Plus size={16} className="mr-1.5" />
          Add Vendor
        </Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {[
                "Name",
                "Category",
                "Contact",
                "Email",
                "Phone",
                "Contracts",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 font-medium text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr
                key={v.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {v.name}
                </td>
                <td className="px-4 py-3 text-gray-600">{v.category}</td>
                <td className="px-4 py-3 text-gray-600">{v.contact}</td>
                <td className="px-4 py-3">
                  <a
                    href={`mailto:${v.email}`}
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <Mail size={13} />
                    {v.email}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-gray-600">
                    <Phone size={13} />
                    {v.phone}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{v.activeContracts}</td>
                <td className="px-4 py-3">
                  <button className="text-xs text-blue-600 hover:underline mr-3">
                    Edit
                  </button>
                  <button className="text-xs text-red-500 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
