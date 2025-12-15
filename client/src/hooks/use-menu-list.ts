import { useLocation } from "@tanstack/react-router";
import { getMenuList } from "@/lib/menu-list";

/**
 * useMenuList Hook
 *
 * This custom hook retrieves the menu list based on the current pathname.
 * It uses TanStack Router's useLocation hook to get the current path.
 */
export function useMenuList() {
    const location = useLocation();
    return getMenuList(location.pathname);
}