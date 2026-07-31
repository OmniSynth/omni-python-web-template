import { useEffect, useState } from "react";
import { homeImageLocalFallback, peekRacedHomeImageUrl, raceHomeImageUrl } from "@/lib/race-cdn-image";
import { cn } from "@/lib/utils";

type RacedCdnImageProps = {
  file: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
};

/** 使用会话内已选定的最快 CDN 展示图片（仅探测一次延迟）。 */
export function RacedCdnImage({ file, alt, className, loading = "lazy" }: RacedCdnImageProps) {
  const [src, setSrc] = useState<string | null>(() => peekRacedHomeImageUrl(file) ?? null);

  useEffect(() => {
    if (src) return;

    let active = true;
    void raceHomeImageUrl(file)
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setSrc(homeImageLocalFallback(file));
      });

    return () => {
      active = false;
    };
  }, [file, src]);

  if (!src) {
    return <div className={cn("min-h-40 animate-pulse bg-muted/60", className)} aria-hidden aria-busy="true" />;
  }

  return <img src={src} alt={alt} loading={loading} className={className} />;
}
