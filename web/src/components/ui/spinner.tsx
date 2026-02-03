import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"

function Spinner({ className, size, ...props }: Omit<React.ComponentProps<"svg">, "size" | "width" | "height"> & { size?: number }) {
  const { width, height, ...restProps } = props as any;
  return (
    <HugeiconsIcon 
      icon={Loading03Icon} 
      strokeWidth={2} 
      role="status" 
      aria-label="Loading" 
      className={cn("size-4 animate-spin", className)} 
      {...(size ? { width: size, height: size } : {})}
      {...restProps} 
    />
  )
}

export { Spinner }
