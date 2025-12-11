"use client"

import React from "react";
import { ChevronLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SidebarToggleProps {
    isOpen: boolean | undefined;
    setIsOpen?: () => void;
}

export function SidebarToggle({ isOpen, setIsOpen }: SidebarToggleProps) {
    return (
        <div className="sidebar-toggle-wrapper">
            <Button
                onClick={setIsOpen}
                className="sidebar-toggle-button"
                variant="outline"
                size="icon"
            >
                <ChevronLeftIcon className={`sidebar-toggle-icon ${isOpen === false ? 'closed' : 'open'}`} />
            </Button>
        </div>
    );
}