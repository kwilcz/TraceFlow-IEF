"use client";

import React, {useState} from "react";
import {Link} from "@tanstack/react-router";
import {ChevronDown, Dot} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible";
import {Tooltip, TooltipTrigger, TooltipContent, TooltipProvider} from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuArrow
} from "@/components/ui/dropdown-menu";
import {Submenu} from "@/types/menu";

interface CollapseMenuButtonProps {
    icon?: React.ElementType;
    label: string;
    active: boolean;
    submenus: Submenu[];
    isOpen: boolean | undefined;
}

export function CollapseMenuButton({icon: Icon, label, active, submenus, isOpen}: CollapseMenuButtonProps) {
    const isSubmenuActive = submenus.some((submenu) => submenu.active);
    const [isCollapsed, setIsCollapsed] = useState<boolean>(isSubmenuActive);

    if (isOpen) {
        return <OpenSidebarMenu Icon={Icon} label={label} active={active} submenus={submenus} isCollapsed={isCollapsed}
                                setIsCollapsed={setIsCollapsed}/>;
    }

    return <ClosedSidebarMenu Icon={Icon} label={label} active={active} submenus={submenus}/>;
}

interface OpenSidebarMenuProps {
    Icon?: React.ElementType;
    label: string;
    active: boolean;
    submenus: Submenu[];
    isCollapsed: boolean;
    setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

function OpenSidebarMenu({Icon, label, active, submenus, isCollapsed, setIsCollapsed}: OpenSidebarMenuProps) {
    return (
        <Collapsible open={isCollapsed} onOpenChange={setIsCollapsed} className="w-full">
            <CollapsibleTrigger className="collapse-trigger" asChild>
                <Button variant={active ? "secondary" : "ghost"} className="menu-item">
                    <div className="menu-item-content">
                        <div className="menu-item-icon-wrapper">
                            {Icon &&
                                <span className="menu-item-icon">
                                    <Icon size={18}/>
                                </span>
                            }
                            <p className="menu-item-label open">{label}</p>
                        </div>
                        <ChevronDown size={18} className={`menu-item-chevron ${isCollapsed ? 'open' : ''}`}/>
                    </div>
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="menu-collapse-content">
                {submenus.map(({href, label, active}, index) => (
                    <Button key={index} variant={active ? "secondary" : "ghost"} className="submenu-item" asChild>
                        <Link to={href}>
                            <span className="submenu-icon"><Dot size={18}/></span>
                            <p className="menu-item-label open">{label}</p>
                        </Link>
                    </Button>
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}

interface ClosedSidebarMenuProps {
    Icon?: React.ElementType;
    label: string;
    active: boolean;
    submenus: Submenu[];
}

function ClosedSidebarMenu({Icon, label, active, submenus}: ClosedSidebarMenuProps) {
    return (
        <DropdownMenu>
            <TooltipProvider disableHoverableContent>
                <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <Button variant={active ? "secondary" : "ghost"} className="menu-item">
                                {Icon &&
                                    <Icon size={18}/>
                                }
                            </Button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="start" alignOffset={2}>
                        {label}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent side="right" sideOffset={25} align="start">
                <DropdownMenuLabel className="dropdown-label">{label}</DropdownMenuLabel>
                <DropdownMenuSeparator/>
                {submenus.map(({href, label}, index) => (
                    <DropdownMenuItem key={index} asChild>
                        <Link className="cursor-pointer" to={href}>
                            <p className="dropdown-item-label">{label}</p>
                        </Link>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuArrow className="fill-border"/>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}