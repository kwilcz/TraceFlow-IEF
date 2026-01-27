interface ContentLayoutProps {
    children?: React.ReactNode;
}

export function ContentLayout({ children }: ContentLayoutProps) {
    return <div className="grow lg:px-4 overflow-hidden">{children}</div>;
}
