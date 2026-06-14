/**
 * CTAButton — single action trigger with variant and size support.
 */

interface CTAButtonProps {
  label: string;
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variantClasses: Record<string, string> = {
  primary: "bg-gray-900 text-white hover:bg-gray-700 border border-gray-900",
  secondary: "border border-gray-900 text-gray-900 bg-white hover:bg-gray-50",
  ghost: "text-gray-600 hover:text-gray-900 underline underline-offset-2",
};

const sizeClasses: Record<string, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3 text-base",
};

export function CTAButton({ label, href = "#", variant = "primary", size = "md" }: CTAButtonProps) {
  return (
    <a
      href={href}
      className={`inline-block rounded-md font-medium transition-colors ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {label}
    </a>
  );
}
