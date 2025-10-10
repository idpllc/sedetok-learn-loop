import * as React from "react";

// Lightweight stubs to avoid pulling in @radix-ui/react-toast
// We use Sonner for toasts; these exports keep existing imports/types working

export type ToastProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: "default" | "destructive";
  [key: string]: any;
};

export type ToastActionElement = React.ReactElement<any>;

export const ToastProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;

export const ToastViewport: React.FC<any> = () => null;

export const Toast: React.FC<ToastProps> = ({ children }) => <>{children}</>;

export const ToastTitle: React.FC<any> = ({ children }) => <>{children}</>;

export const ToastDescription: React.FC<any> = ({ children }) => <>{children}</>;

export const ToastClose: React.FC<any> = () => null;

export const ToastAction: React.FC<any> = ({ children }) => <>{children}</>;
