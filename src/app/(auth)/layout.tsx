export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 gradient-brand relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-5" />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <h1 className="font-display text-4xl xl:text-5xl font-bold text-brand-beige leading-tight">
            HOME STITCH
            <br />
            INTERIORS UG
          </h1>
          <p className="text-brand-gold text-lg mt-4 font-medium">
            Where Comfort Is Tailored
          </p>
          <p className="text-brand-beige/70 mt-6 max-w-md leading-relaxed">
            Your complete business management platform for bedsheets, curtains,
            duvets, and premium interior fabrics.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 max-w-sm">
            {["Inventory", "Sales & POS", "Accounting", "Reports"].map(
              (feature) => (
                <div
                  key={feature}
                  className="rounded-lg bg-white/5 backdrop-blur px-4 py-3 text-sm text-brand-beige/80"
                >
                  {feature}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        {children}
      </div>
    </div>
  );
}
