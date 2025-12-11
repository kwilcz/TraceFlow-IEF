"use client";

import React from "react";
import {Link} from "@tanstack/react-router";
import { House } from "@phosphor-icons/react";

import { useStore } from "@/hooks/use-store";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/menu/menu";
import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
import { SidebarToggle } from "@/components/ui/sidebar-toggle";


export function Sidebar() {
  const sidebar = useStore(useSidebarToggle, (state) => state);

  if (!sidebar) return null;

  return (
      <aside className={`sidebar ${sidebar.isOpen ? 'open' : 'closed'}`}>
        <SidebarToggle isOpen={sidebar.isOpen} setIsOpen={sidebar.setIsOpen} />
        <div className="sidebar-content">
          <Button variant="link" asChild className={`sidebar-brand ${sidebar.isOpen ? 'open' : 'closed'}`}>
            <Link to="/" className="sidebar-brand-link">
              <House className="sidebar-brand-icon" />
              <h1 className={`sidebar-brand-text ${sidebar.isOpen ? 'open' : 'closed'}`}>
                MIP B2C UI
              </h1>
            </Link>
          </Button>
          <Menu isOpen={sidebar.isOpen} />
        </div>
      </aside>
  );
}