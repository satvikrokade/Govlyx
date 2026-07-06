type GovlyxLogoProps = {
  className?: string;
  size?: number;
  showText?: boolean;
  iconClassName?: string;
  textClassName?: string;
};

const GovlyxLogo = ({
  className = "",
  size = 36,
  showText = false,
  iconClassName = "",
  textClassName = "",
}: GovlyxLogoProps) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-[22%] shadow-lg shadow-[#1D4ED8]/25 ${iconClassName}`}
        style={{ width: size, height: size }}
      >
        <img
          src="/govlyx.png"
          alt="Govlyx Logo"
          className="transition-transform duration-300 hover:scale-105 object-contain rounded-[22%]"
          style={{ width: '100%', height: '100%' }}
        />
      </span>
      {showText && (
        <span
          className={`font-bold text-xl sm:text-2xl tracking-tight text-slate-900 dark:text-white transition-colors duration-300 notranslate ${textClassName}`}
        >
          Govlyx
        </span>
      )}
    </div>
  );
};

export default GovlyxLogo;
