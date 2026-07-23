import { ChevronLeft, ChevronRight } from "lucide-react";
import type { KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TablePaginationMobileProps {
  rangeStart: number;
  rangeEnd: number;
  total: number;
  safePage: number;
  totalPageCount: number;
  jumpValue: string;
  pageSize: number;
  pageSizeOptions: readonly number[];
  onGoToPage: (page: number) => void;
  onJumpChange: (raw: string) => void;
  onJumpCommit: () => void;
  onJumpKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function TablePaginationMobile({
  rangeStart,
  rangeEnd,
  total,
  safePage,
  totalPageCount,
  jumpValue,
  pageSize,
  pageSizeOptions,
  onGoToPage,
  onJumpChange,
  onJumpCommit,
  onJumpKeyDown,
  onPageSizeChange,
}: TablePaginationMobileProps) {
  return (
    <div className="flex items-center gap-2 lg:hidden">
      <span className="shrink-0 text-xs tabular-nums">
        {rangeStart}–{rangeEnd}/{total}
      </span>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 shrink-0 p-0"
          aria-label="上一页"
          disabled={safePage <= 1}
          onClick={() => onGoToPage(safePage - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <Input
          className="h-8 w-11 shrink-0 px-1 text-center text-xs"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          aria-label="页码"
          value={jumpValue}
          onChange={(e) => onJumpChange(e.target.value)}
          onBlur={onJumpCommit}
          onKeyDown={onJumpKeyDown}
        />
        <span className="shrink-0 text-xs">/ {totalPageCount}</span>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 shrink-0 p-0"
          aria-label="下一页"
          disabled={safePage >= totalPageCount}
          onClick={() => onGoToPage(safePage + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
        <SelectTrigger className="h-8 w-16 shrink-0 px-2 text-xs" aria-label="每页条数">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pageSizeOptions.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface TablePaginationDesktopProps {
  rangeStart: number;
  rangeEnd: number;
  total: number;
  safePage: number;
  totalPageCount: number;
  jumpValue: string;
  pageSize: number;
  pageSizeOptions: readonly number[];
  pageTokens: (number | "ellipsis")[];
  onGoToPage: (page: number) => void;
  onJumpChange: (raw: string) => void;
  onJumpCommit: () => void;
  onJumpKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function TablePaginationDesktop({
  rangeStart,
  rangeEnd,
  total,
  safePage,
  totalPageCount,
  jumpValue,
  pageSize,
  pageSizeOptions,
  pageTokens,
  onGoToPage,
  onJumpChange,
  onJumpCommit,
  onJumpKeyDown,
  onPageSizeChange,
}: TablePaginationDesktopProps) {
  return (
    <div className="hidden lg:flex lg:items-center lg:justify-between lg:gap-3">
      <span>
        共 {total} 条，显示 {rangeStart}–{rangeEnd}
      </span>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5">
          <span className="shrink-0">每页</span>
          <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="h-8 w-18 px-2" aria-label="每页条数">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="shrink-0">条</span>
        </label>

        <div className="flex flex-wrap items-center gap-0.5">
          {pageTokens.map((token, index) =>
            token === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex h-8 min-w-8 items-center justify-center px-1 text-muted-foreground"
                aria-hidden
              >
                …
              </span>
            ) : (
              <Button
                key={token}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 min-w-8 px-2 text-sm font-normal text-muted-foreground",
                  token === safePage && "rounded-none border-b-2 border-primary font-medium text-foreground",
                )}
                aria-current={token === safePage ? "page" : undefined}
                onClick={() => onGoToPage(token)}
              >
                {token}
              </Button>
            ),
          )}

          <div className="ml-1 flex items-center gap-1">
            <Input
              className="h-8 w-14 px-2 text-center text-sm"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              aria-label="页码"
              value={jumpValue}
              onChange={(e) => onJumpChange(e.target.value)}
              onBlur={onJumpCommit}
              onKeyDown={onJumpKeyDown}
            />
            <span className="shrink-0">/ {totalPageCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
