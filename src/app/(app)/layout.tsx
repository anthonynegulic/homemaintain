import { AppProvider } from "@/lib/store";
import { TabBar } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <main className="shell">{children}</main>
      <TabBar />
    </AppProvider>
  );
}
