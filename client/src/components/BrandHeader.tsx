const LOGO_SRC = "https://saffhire.com/images/saffhire-logo.png";

interface BrandHeaderProps {
  rightLabel?: string;
  rightHref?: string;
}

export default function BrandHeader({
  rightLabel = "Back to Website",
  rightHref = "https://www.saffhire.com",
}: BrandHeaderProps) {
  return (
    <header className="sticky top-0 z-40">
      <div className="bg-[#071427] text-white">
        <div className="max-w-6xl mx-auto px-4 h-10 flex items-center justify-between text-sm">
          <a href="tel:8885881733" className="hover:text-[#00c853] transition-colors">
            (888) 588-1733
          </a>
          <a
            href="https://www.saffhire.com/contact-us"
            className="bg-[#00c853] hover:bg-[#00b34a] text-white text-xs font-semibold px-3 py-1.5 rounded-sm"
          >
            Contact Us
          </a>
        </div>
      </div>
      <div className="bg-white border-b border-[#d7e0ea]">
        <div className="max-w-6xl mx-auto px-4 h-[76px] flex items-center justify-between gap-4">
          <a href="https://www.saffhire.com" target="_blank" rel="noopener noreferrer" className="shrink-0">
            <img src={LOGO_SRC} alt="SaffHire Background Screening" className="h-12 w-auto object-contain" />
          </a>
          <div className="hidden md:flex items-center gap-6 text-sm text-[#0b1c33]">
            <span className="font-medium">Create Account</span>
            <span className="text-[#5b6b7c]">Secure intake</span>
          </div>
          <a
            href={rightHref}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#00c853] hover:bg-[#00b34a] text-white text-sm font-semibold px-4 py-2 rounded-sm"
          >
            {rightLabel}
          </a>
        </div>
      </div>
    </header>
  );
}
