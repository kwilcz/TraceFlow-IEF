import { Navbar } from "@/components/layout/navbar";

interface ContentLayoutProps {
    children?: React.ReactNode;
    title: string;
}

export function ContentLayout({ children, title }: ContentLayoutProps) {
    return (
        <div className="h-screen">
            <div className="flex-none">
                <Navbar title={title} />
            </div>
            <div className="flex-grow lg:p-4 overflow-hidden">{children}</div>
        </div>
    );
}
