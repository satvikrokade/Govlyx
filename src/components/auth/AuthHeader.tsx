type Props = {
  title: string;
  subtitle: string;
};

const AuthHeader = ({ title, subtitle }: Props) => {
  return (
    <div className="mb-6 text-center">
      {/* Logo */}
      <div className="mx-auto mb-3 flex h-15 w-15 items-center justify-center rounded-full bg-blue-700 text-white font-bold">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 540">
          <path
            fill="#1D4ED8"
            d="M256 32L96 112v120c0 112 64 208 160 248c96-40 160-136 160-248V112L256 32z"
          />

          <g fill="#FFFFFF" transform="translate(0, -6)">
            <path d="M256 150c-40 0-72 32-72 72v20h144v-20c0-40-32-72-72-72z" />
            <rect x="220" y="242" width="72" height="16" />
            <rect x="204" y="220" width="12" height="40" />
            <rect x="296" y="220" width="12" height="40" />
          </g>

          <g fill="#FFFFFF" transform="translate(0, -6)">
            <circle cx="170" cy="210" r="6" />
            <circle cx="196" cy="230" r="4" />
            <circle cx="342" cy="210" r="6" />
            <circle cx="318" cy="230" r="4" />
            <circle cx="256" cy="190" r="5" />
          </g>

          <path fill="#FFFFFF" d="M150 300h212l-8 16H158z" />

          <g fill="#FFFFFF">
            <rect x="248" y="300" width="16" height="120" />
            <rect x="198" y="300" width="16" height="80" />
            <rect x="298" y="300" width="16" height="80" />
          </g>

          <g fill="#FFFFFF">
            <circle cx="256" cy="440" r="18" />
            <circle cx="206" cy="380" r="20" />
            <circle cx="306" cy="380" r="20" />
          </g>

          <g>
            <rect x="252" y="118" width="8" height="32" fill="#FFFFFF" />
            <path d="M260 118h45v22l-45-8z" fill="#FFFFFF" />
            <path d="M260 118l35 16l-35-6z" fill="#FFFFFF" opacity="0.4" />
          </g>
        </svg>
      </div>

      {/* Title */}
      <h1 className="text-lg font-semibold">{title}</h1>

      {/* Subtitle */}
      <p className="mt-1 text-sm opacity-70">{subtitle}</p>
    </div>
  );
};

export default AuthHeader;
