import { usePathname } from "next/navigation";
import { getMenuList } from "@/lib/menu-list";

/**
 * useMenuList Hook
 *
 * This custom hook retrieves the menu list based on the current pathname.
 * It uses the Next.js usePathname hook to get the current path and passes it to getMenuList.
 *
 * @returns {Array} The menu list based on the current pathname
 */
export function useMenuList() {
    const pathname = usePathname();
    return getMenuList(pathname);
}