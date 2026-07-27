import * as React from "react"

import { cn } from "@/lib/utils/cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-input bg-surface-sunken/70 px-3 py-1 text-base text-foreground shadow-[0_1px_0_rgb(255_255_255/0.025)_inset] outline-none transition-[color,border-color,box-shadow,background-color] duration-150 selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/75 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 md:text-sm",
        "hover:border-muted-foreground/45 focus-visible:border-ring focus-visible:bg-surface focus-visible:shadow-field-focus",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
