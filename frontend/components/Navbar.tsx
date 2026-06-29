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
    <header className="sticky top-0 z-40 bg-[#0F1115] border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <h1
          className="text-lg font-semibold text-zinc-100 cursor-pointer"
          onClick={() => router.push("/groups")}
        >
          Camera Views Registry
        </h1>
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
