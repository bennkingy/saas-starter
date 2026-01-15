import Link from "next/link";
import { BellRing, Cat } from "lucide-react";
import { SITE_NAME } from "@/lib/config/site";

type SiteLogoVariant = "header" | "footer";

type SiteLogoProps = {
  variant: SiteLogoVariant;
  href?: string;
  showText?: boolean;
};

export function SiteLogo({ variant, href, showText = true }: SiteLogoProps) {
  const isHeader = variant === "header";

  const containerClassName = isHeader
    ? "flex items-center"
    : "flex items-center gap-2";

  const iconWrapperClassName = isHeader
    ? "relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"
    : "relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/10 ring-1 ring-slate-900/10";

  const catClassName = isHeader ? "h-5 w-5" : "h-5 w-5 text-slate-900";

  const bellClassName = isHeader
    ? "absolute -right-0 -top-0 h-3.5 w-3.5 text-primary-foreground"
    : "absolute -right-0.5 -top-0.5 h-3.5 w-3.5 text-slate-900";

  const textClassName = isHeader
    ? "ml-2 text-xl text-gray-900 font-bold"
    : "text-base text-slate-900 text-900 font-bold";

  const content = (
    <span className={containerClassName}>
      <span className={iconWrapperClassName}>
        <Cat className={catClassName} />
        <BellRing className={bellClassName} fill="currentColor" />
      </span>
      {showText ? <span className={textClassName}>{SITE_NAME}</span> : null}
    </span>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className={isHeader ? "flex items-center" : undefined}>
      {content}
    </Link>
  );
}
