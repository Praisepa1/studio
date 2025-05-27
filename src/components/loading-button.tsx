"use client";

import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LoadingButtonProps extends ButtonProps {
  isLoading: boolean;
  loadingText?: string;
}

export function LoadingButton({
  isLoading,
  loadingText = "Loading...",
  children,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button {...props} disabled={props.disabled || isLoading} className={cn(className)}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading ? loadingText : children}
    </Button>
  );
}
