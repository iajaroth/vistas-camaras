"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

export default function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <h1
          className="text-lg font-semibold text-gray-900 cursor-pointer"
          onClick={() => router.push("/groups")}
        >
          Camera Views Registry
        </h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
