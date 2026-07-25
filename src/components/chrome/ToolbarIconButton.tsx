import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

export type ToolbarIconButtonProps = {
  label: string;
  shortcut?: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  pressed?: boolean;
  className?: string;
  "data-testid"?: string;
} & Omit<ComponentProps<"button">, "children" | "onClick" | "disabled">;

export function ToolbarIconButton({
  label,
  shortcut,
  children,
  onClick,
  disabled,
  pressed,
  className,
  "data-testid": testId,
  type = "button",
  ...rest
}: ToolbarIconButtonProps) {
  const tip = shortcut ? `${label} (${shortcut})` : label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type={type}
          variant="ghost"
          size="icon-sm"
          className={cn(
            "text-muted-foreground aria-pressed:bg-accent aria-pressed:text-foreground hover:text-foreground",
            className,
          )}
          aria-label={tip}
          aria-pressed={pressed}
          disabled={disabled}
          onClick={onClick}
          data-testid={testId}
          {...rest}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}
