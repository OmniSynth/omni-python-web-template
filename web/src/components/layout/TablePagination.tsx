import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { TablePaginationDesktop, TablePaginationMobile } from "@/components/layout/table-pagination-views";
import {
  buildPageTokens,
  clampPage,
  PAGE_SIZE_OPTIONS,
  parsePageJumpInput,
  sanitizePageJumpInput,
} from "@/lib/pagination";
import { guardTenantListPage } from "@/lib/tenant-expiry";
import { cn } from "@/lib/utils";

export interface TablePaginationProps {
  total: number;
  page: number;
  pageSize: number;
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
}

export function TablePagination({
  total,
  page,
  pageSize,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
  className,
}: TablePaginationProps) {
  const [jumpValue, setJumpValue] = useState(String(page));
  const totalPageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = clampPage(page, total, pageSize);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(safePage * pageSize, total);
  const pageTokens = useMemo(() => buildPageTokens(safePage, totalPageCount), [safePage, totalPageCount]);

  useEffect(() => {
    setJumpValue(String(safePage));
  }, [safePage]);

  function syncJump(nextPage: number) {
    setJumpValue(String(nextPage));
  }

  function commitJump() {
    const n = parsePageJumpInput(jumpValue);
    if (n === null) {
      syncJump(safePage);
      return;
    }
    const target = clampPage(n, total, pageSize);
    if (!guardTenantListPage(target)) {
      syncJump(safePage);
      return;
    }
    onPageChange(target);
    syncJump(target);
  }

  function handleJumpChange(raw: string) {
    setJumpValue(sanitizePageJumpInput(raw));
  }

  function handleJumpKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitJump();
    }
  }

  function goToPage(target: number) {
    if (!guardTenantListPage(target)) return;
    onPageChange(target);
    syncJump(target);
  }

  return (
    <div
      className={cn(
        "shrink-0 border-t border-border px-4 py-2 text-sm text-muted-foreground lg:px-6 lg:py-3",
        className,
      )}
    >
      <TablePaginationMobile
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        total={total}
        safePage={safePage}
        totalPageCount={totalPageCount}
        jumpValue={jumpValue}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        onGoToPage={goToPage}
        onJumpChange={handleJumpChange}
        onJumpCommit={commitJump}
        onJumpKeyDown={handleJumpKeyDown}
        onPageSizeChange={onPageSizeChange}
      />
      <TablePaginationDesktop
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        total={total}
        safePage={safePage}
        totalPageCount={totalPageCount}
        jumpValue={jumpValue}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        pageTokens={pageTokens}
        onGoToPage={goToPage}
        onJumpChange={handleJumpChange}
        onJumpCommit={commitJump}
        onJumpKeyDown={handleJumpKeyDown}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
