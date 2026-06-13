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
          toast: "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg border rounded-xl px-4 py-3 flex items-center gap-3",
          success: "group-[.toaster]:bg-emerald-50/90! dark:group-[.toaster]:bg-emerald-950/30! group-[.toaster]:text-emerald-900! dark:group-[.toaster]:text-emerald-300!",
          error: "group-[.toaster]:bg-red-50/90! dark:group-[.toaster]:bg-red-950/30! group-[.toaster]:text-red-900! dark:group-[.toaster]:text-red-300!",
          warning: "group-[.toaster]:bg-amber-50/90! dark:group-[.toaster]:bg-amber-950/30! group-[.toaster]:text-amber-900! dark:group-[.toaster]:text-amber-300!",
          info: "group-[.toaster]:bg-blue-50/90! dark:group-[.toaster]:bg-blue-950/30! group-[.toaster]:text-blue-900! dark:group-[.toaster]:text-blue-300!",
          description: "group-[.toaster]:text-muted-foreground! group-[.success]:text-emerald-700/80! dark:group-[.success]:text-emerald-400/80! group-[.error]:text-red-700/80! dark:group-[.error]:text-red-400/80! group-[.warning]:text-amber-700/80! dark:group-[.warning]:text-amber-400/80! group-[.info]:text-blue-700/80! dark:group-[.info]:text-blue-400/80!",
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
