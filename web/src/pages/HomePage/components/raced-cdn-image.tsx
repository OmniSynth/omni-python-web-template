import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { homeImageLocalFallback, peekRacedHomeImageUrl, raceHomeImageUrl } from "../race-cdn-image";

type RacedCdnImageProps = {
  file: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
};

/** 并行竞速 JSDMirror / jsDelivr，先完成下载的 CDN 用于展示。 */
export function RacedCdnImage({ file, alt, className, loading = "lazy" }: RacedCdnImageProps) {
  const [src, setSrc] = useState<string | null>(() => peekRacedHomeImageUrl(file) ?? null);

  useEffect(() => {
    if (src) return;

    let active = true;
    const controller = new AbortController();
    void raceHomeImageUrl(file, controller.signal)
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSrc(homeImageLocalFallback(file));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [file, src]);

  if (!src) {
    return <div className={cn("min-h-40 animate-pulse bg-muted/60", className)} aria-hidden aria-busy="true" />;
  }

  return <img src={src} alt={alt} loading={loading} className={className} />;
}
