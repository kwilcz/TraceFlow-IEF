"use client"

import * as React from "react"
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  asChild,
  children,
  ...props
}: CollapsiblePrimitive.Trigger.Props & { asChild?: boolean }) {
  const render = asChild
    ? (React.Children.only(children) as React.ReactElement)
    : undefined

  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      render={render}
      {...props}
    >
      {asChild ? null : children}
    </CollapsiblePrimitive.Trigger>
  )
}

function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
  )
}

interface CustomCollapsibleProps extends CollapsiblePrimitive.Root.Props {
  title: string
  children: React.ReactNode
}

function CustomCollapsible({ title, children, ...props }: CustomCollapsibleProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <CollapsiblePrimitive.Root
      data-slot="custom-collapsible"
      open={open}
      onOpenChange={setOpen}
      {...props}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2"
        >
          {title}
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 transition-transform",
              open ? "rotate-180" : ""
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 data-open:animate-in data-closed:animate-out">
        <div className="pb-2">{children}</div>
      </CollapsibleContent>
    </CollapsiblePrimitive.Root>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent, CustomCollapsible }
