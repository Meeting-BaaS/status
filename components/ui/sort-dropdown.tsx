import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import type { SortingState, OnChangeFn } from "@tanstack/react-table"

interface SortDropdownProps {
  sortOptions: { label: string; value: string }[]
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
}

export function SortDropdown({ sortOptions, sorting, onSortingChange }: SortDropdownProps) {
  return (
    <div className="md:-mt-16 -mt-4 mb-4 flex items-center justify-end md:mb-8">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="md:ml-auto">
            Default Sort <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={
              sorting[0]?.id
                ? `${sorting[0].id}-${sorting[0].desc ? "desc" : "asc"}`
                : undefined
            }
            onValueChange={(value) => {
              onSortingChange([{ id: value.split("-")[0], desc: value.endsWith("-desc") }])
            }}
          >
            {sortOptions.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 