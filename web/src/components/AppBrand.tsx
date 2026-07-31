import { useEffect, useState } from "react";
import { APP_BRAND_NAME } from "@/lib/brand";
import { peekRacedHomeImageUrl, raceHomeImageUrl } from "@/lib/race-cdn-image";
import { cn } from "@/lib/utils";

const LOGO_FILE = "favicon.png";
const LOGO_LOCAL = `/images/${LOGO_FILE}`;

const sizeClass = {
  sm: "h-6 w-6",
  md: "h-7 w-7",
  lg: "h-9 w-9",
} as const;

type AppBrandProps = {
  /** 图标尺寸；默认 md（与站点 Logo 一致）。 */
  size?: keyof typeof sizeClass;
  /** 是否展示品牌文案；默认 true。 */
  showName?: boolean;
  className?: string;
  nameClassName?: string;
};

/** 品牌标：favicon 经 JSDMirror / jsDelivr 竞速加速，失败回退本地图。 */
export function AppBrand({ size = "md", showName = true, className, nameClassName }: AppBrandProps) {
  const [logoSrc, setLogoSrc] = useState(() => peekRacedHomeImageUrl(LOGO_FILE) ?? LOGO_LOCAL);

  useEffect(() => {
    let active = true;
    void raceHomeImageUrl(LOGO_FILE)
      .then((url) => {
        if (active) setLogoSrc(url);
      })
      .catch(() => {
        if (active) setLogoSrc(LOGO_LOCAL);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <img
        src={logoSrc}
        alt=""
        width={36}
        height={36}
        className={cn("shrink-0 bg-transparent object-contain", sizeClass[size])}
        onError={() => {
          if (logoSrc !== LOGO_LOCAL) setLogoSrc(LOGO_LOCAL);
        }}
      />
      {showName ? (
        <span className={cn("truncate font-medium tracking-tight text-foreground", nameClassName)}>
          {APP_BRAND_NAME}
        </span>
      ) : null}
    </span>
  );
}
