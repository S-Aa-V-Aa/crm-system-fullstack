interface PaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize?: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
}

export const Pagination = ({
  currentPage,
  totalCount,
  pageSize = 10,
  isLoading = false,
  onPageChange,
}: PaginationProps) => {
  const totalPages = Math.ceil(totalCount / pageSize);

  // Якщо всі записи вміщуються на одній сторінці — панель пагінації не потрібна
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="text-xs text-slate-500">
        Показано{' '}
        <span className="font-medium text-slate-800">
          {startItem}–{endItem}
        </span>{' '}
        із <span className="font-medium text-slate-800">{totalCount}</span> записів
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1 || isLoading}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          Попередня
        </button>

        <span className="px-2 text-xs text-slate-600 font-medium">
          Сторінка {currentPage} з {totalPages}
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages || isLoading}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          Наступна
        </button>
      </div>
    </div>
  );
};