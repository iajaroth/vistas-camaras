import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";

export default function GroupsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
    </AuthGuard>
  );
}
