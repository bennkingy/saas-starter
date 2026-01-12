type LogoPatternBgProps = {
  className?: string;
};

export function LogoPatternBg({ className = '' }: LogoPatternBgProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <svg className="absolute h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="logo-pattern"
            x="0"
            y="0"
            width="100"
            height="100"
            patternUnits="userSpaceOnUse"
          >
            <g opacity="0.12" transform="translate(17, 15) scale(0.65)">
              {/* Cat ears */}
              <path
                d="M23.5 27.5L21 20.5C20.6 19.4 21.8 18.4 22.9 19L29 22.3C29.6 22.6 30.3 22.6 31 22.3L32 21.7L33 22.3C33.7 22.6 34.4 22.6 35 22.3L41.1 19C42.2 18.4 43.4 19.4 43 20.5L40.5 27.5"
                fill="none"
                stroke="#33CEE5"
                strokeWidth="2.5"
              />
              {/* Cat head */}
              <circle cx="32" cy="33" r="12.5" fill="none" stroke="#33CEE5" strokeWidth="2.5" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#logo-pattern)" />
      </svg>
    </div>
  );
}
