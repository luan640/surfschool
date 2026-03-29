'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  currentPage: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  itemLabel?: string
}

export function PaginationControls({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  itemLabel = 'itens',
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  if (totalItems <= pageSize) return null

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Mostrando {startItem}-{endItem} de {totalItems} {itemLabel}
      </p>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft size={14} /> Anterior
        </Button>
        <span className="min-w-24 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
          Pagina {currentPage} de {totalPages}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Proxima <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  )
}
