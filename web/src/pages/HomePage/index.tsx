import { useEffect } from "react";
import { HomeAboutCta } from "./components/home-about-cta";
import { HomeFeatures } from "./components/home-features";
import { HomeFooter } from "./components/home-footer";
import { HomeHero } from "./components/home-hero";
import { HomeNav } from "./components/home-nav";
import { HomeShowcase } from "./components/home-showcase";

/** 公开产品宣传首页。 */
export function HomePage() {
  useEffect(() => {
    document.documentElement.classList.add("document-scroll");
    return () => {
      document.documentElement.classList.remove("document-scroll");
    };
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <HomeNav />
      <main>
        <HomeHero />
        <HomeFeatures />
        <HomeShowcase />
        <HomeAboutCta />
      </main>
      <HomeFooter />
    </div>
  );
}
