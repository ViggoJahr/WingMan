"use client"

import { Button } from "@/components/ui/button"

export function ConfirmDeleteButton({
  action,
  confirmText,
  label = "Delete",
}: {
  action: () => Promise<void>
  confirmText: string
  label?: string
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault()
      }}
    >
      <Button type="submit" variant="destructive" size="sm">
        {label}
      </Button>
    </form>
  )
}
