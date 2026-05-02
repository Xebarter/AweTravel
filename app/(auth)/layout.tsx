export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary via-primary/90 to-primary-dark">
      {/* Logo/Header */}
      <div className="p-6 md:p-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white">AweTravel</h1>
        <p className="text-accent mt-1 text-sm md:text-base">Digital Transport Marketplace</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Footer */}
      <div className="p-6 md:p-8 text-center text-white/70 text-sm">
        <p>&copy; 2024 AweTravel. All rights reserved.</p>
      </div>
    </div>
  );
}
