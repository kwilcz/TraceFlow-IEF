
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import {ChevronDownIcon} from 'lucide-react';
import {useState} from 'react';

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

interface CustomCollapsibleProps
    extends CollapsiblePrimitive.CollapsibleProps {
    title: string; // The title to display in the trigger
    children: React.ReactNode;
}

const CustomCollapsible: React.FC<CustomCollapsibleProps> = ({title, children, ...props}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <CollapsiblePrimitive.Root
            open={isOpen} onOpenChange={setIsOpen}
            {...props}
        >
            <CollapsiblePrimitive.Trigger asChild>
                <button className="flex items-center gap-2">
                    {title}
                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
                </button>
            </CollapsiblePrimitive.Trigger>
            <CollapsiblePrimitive.Content
                className="mt-2 data-[state=open]:animate-slide-down data-[state=closed]:animate-slide-up">
                <div className="pb-2">{children}</div>
            </CollapsiblePrimitive.Content>
        </CollapsiblePrimitive.Root>
    );
};


export {CustomCollapsible, Collapsible, CollapsibleTrigger, CollapsibleContent}
