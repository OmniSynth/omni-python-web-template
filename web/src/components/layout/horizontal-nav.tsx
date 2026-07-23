import { CatalogNav } from "@/components/layout/catalog-nav";

type HorizontalNavProps = {
  variant: "header" | "footer";
  onNavigate?: () => void;
  className?: string;
};

export function HorizontalNav({ variant, onNavigate, className }: HorizontalNavProps) {
  return (
    <CatalogNav dropdownSide={variant === "header" ? "bottom" : "top"} onNavigate={onNavigate} className={className} />
  );
}
