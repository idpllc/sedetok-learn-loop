import * as React from "react";
import { toast as sonnerToast } from "sonner";

// Compatibility shim: preserve shadcn's useToast API but delegate rendering to Sonner

type ToastOptions = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  action?: React.ReactNode;
  // accept any extra props to avoid TS errors from callers
  [key: string]: any;
};

function mappedToast(opts: ToastOptions) {
  const { title, description, variant, action, ...rest } = opts || {};
  const message = (title ?? description ?? "") as string;
  const sonnerOpts: any = { ...rest };
  if (title && description) sonnerOpts.description = description as any;
  if (action) sonnerOpts.action = action as any;

  if (variant === "destructive") {
    return (sonnerToast as any).error?.(message, sonnerOpts) ?? (sonnerToast as any)(message, sonnerOpts);
  }
  return (sonnerToast as any).success?.(message, sonnerOpts) ?? (sonnerToast as any)(message, sonnerOpts);
}

export function useToast() {
  return {
    toasts: [] as any[],
    toast: mappedToast,
    dismiss: (toastId?: string) => {
      if (toastId) (sonnerToast as any).dismiss?.(toastId);
      else (sonnerToast as any).dismiss?.();
    },
  };
}

export const toast = mappedToast;
