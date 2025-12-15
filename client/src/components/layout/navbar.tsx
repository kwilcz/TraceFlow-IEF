import {ThemeToggle} from "@/components/theme-toggle";

interface NavbarProps {
    title: string;
}

export function Navbar({title}: NavbarProps) {

    return (
        <header
            className="sticky top-0 z-10 w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary">
            <div className="mx-4 sm:mx-8 flex flex-row h-14 items-center">

                {/* items on the left of navbar*/}
                <div className="flex space-x-4 md:space-x-0">
                    <h1 className="font-bold">{title}</h1>
                </div>
                {/* items on the right of navbar*/}
                <div className="flex flex-1 justify-end">
                    <ThemeToggle/>
                </div>
            </div>
        </header>
    );
}