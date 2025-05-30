"use client"

import {
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type OnChangeFn,
  type Row
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { SortDropdown } from "@/components/ui/sort-dropdown"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  defaultSort?: SortingState
  defaultColumnVisibility?: VisibilityState
  sortOptions?: { label: string; value: string }[]
  onSortingChange?: OnChangeFn<SortingState>
  onRowHover?: (row: Row<TData>) => void
  onRowLeave?: () => void
  onRowClick?: (row: Row<TData>) => void
  enableRowSelection?: boolean
  enableMultiRowSelection?: boolean
  enableRowHover?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  defaultSort = [],
  defaultColumnVisibility = {},
  sortOptions,
  onSortingChange,
  onRowHover,
  onRowLeave,
  onRowClick,
  enableRowSelection,
  enableMultiRowSelection,
  enableRowHover
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(defaultSort)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultColumnVisibility)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const handleSortingChange: OnChangeFn<SortingState> = (updaterOrValue) => {
    const newSorting = typeof updaterOrValue === "function" 
      ? updaterOrValue(sorting)
      : updaterOrValue
    setSorting(newSorting)
    onSortingChange?.(updaterOrValue)
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: handleSortingChange,
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection,
    enableMultiRowSelection,
    state: {
      sorting,
      columnVisibility,
      rowSelection
    }
  })

  const handleRowClick = (row: Row<TData>) => {
    if (enableRowSelection) {
      row.toggleSelected()
    }
    onRowClick?.(row)
  }

  return (
    <div>
      {sortOptions && (
        <SortDropdown
          sortOptions={sortOptions}
          sorting={sorting}
          onSortingChange={handleSortingChange}
        />
      )}
      <div>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-accent/20">
                {headerGroup.headers.map((header, index) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "py-1",
                        index === 0 && "rounded-tl-md",
                        index === headerGroup.headers.length - 1 && "rounded-tr-md"
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onMouseEnter={() => enableRowHover && onRowHover?.(row)}
                  onMouseLeave={() => enableRowHover && onRowLeave?.()}
                  onClick={() => handleRowClick(row)}
                  className={cn(
                    enableRowHover && "cursor-pointer",
                    enableRowSelection && "cursor-pointer"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
