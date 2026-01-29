"use client";

import React from "react";
import { CaretLeft } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarToggleProps {
    isOpen: boolean | undefined;
    setIsOpen?: () => void;
}

export function SidebarToggle({ isOpen, setIsOpen }: SidebarToggleProps) {
    return (
        <div className="invisible lg:visible absolute top-1/2 -left-4 z-20 -translate-y-1/2">
            <Button
                onClick={setIsOpen}
                className="rounded-md size-8"
                variant="outline"
                size="icon"
            >
                <CaretLeft
                    className={cn(
                        "size-4 transition-transform duration-700 ease-in-out",
                        isOpen === false ? "rotate-180" : "rotate-0"
                    )}
                />
            </Button>
        </div>
    );
}