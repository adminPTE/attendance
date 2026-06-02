import { PrivateNav } from "@/components/private/private-nav";
import { PrivateDataProvider } from "@/components/private/private-data-provider";

export default function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PrivateDataProvider>
      <div className="min-h-screen bg-background">
        <PrivateNav />
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">{children}</main>
      </div>
    </PrivateDataProvider>
  );
}
