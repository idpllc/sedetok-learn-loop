import { useState, useMemo } from "react";

export function usePagination<T>(items: T[] | undefined, pageSize = 20) {
  const [page, setPage] = useState(1);

  const totalItems = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to page 1 when items change (e.g. search filter)
  const safePage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items?.slice(start, start + pageSize) ?? [];
  }, [items, safePage, pageSize]);

  return {
    page: safePage,
    setPage,
    totalPages,
    totalItems,
    paged,
    pageSize,
  };
}
