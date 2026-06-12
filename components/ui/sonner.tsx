"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { IconCircleCheck, IconInfoCircle, IconAlertTriangle, IconAlertOctagon, IconLoader } from "@tabler/icons-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      position="top-center"
      className="toaster group"
      icons={{
        success: (
          <IconCircleCheck className="size-4 text-primary" />
        ),
        info: (
          <IconInfoCircle className="size-4 text-blue-500" />
        ),
        warning: (
          <IconAlertTriangle className="size-4 text-amber-500" />
        ),
        error: (
          <IconAlertOctagon className="size-4 text-destructive" />
        ),
        loading: (
          <IconLoader className="size-4 animate-spin text-muted-foreground" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg border-l-4 rounded-xl px-4 py-3 flex items-center gap-3",
          success: "group-[.toast]:border-l-primary! group-[.toast]:text-foreground!",
          error: "group-[.toast]:border-l-destructive! group-[.toast]:text-foreground!",
          warning: "group-[.toast]:border-l-amber-500! group-[.toast]:text-foreground!",
          info: "group-[.toast]:border-l-blue-500! group-[.toast]:text-foreground!",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
