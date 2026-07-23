import { APP_BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/favicon.png";

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

/** 品牌标：复用站点 favicon 图作为 logo，可选附带品牌名。 */
export function AppBrand({ size = "md", showName = true, className, nameClassName }: AppBrandProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <img
        src={LOGO_SRC}
        alt=""
        width={36}
        height={36}
        className={cn("shrink-0 bg-transparent object-contain", sizeClass[size])}
      />
      {showName ? (
        <span className={cn("truncate font-medium tracking-tight text-foreground", nameClassName)}>
          {APP_BRAND_NAME}
        </span>
      ) : null}
    </span>
  );
}
