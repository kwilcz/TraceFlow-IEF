import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectIcon, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
    BellIcon, 
    CaretDownIcon,
    CheckIcon, 
    CopyIcon, 
    EnvelopeIcon, 
    GearIcon, 
    MagnifyingGlassIcon,
    PencilIcon,
    PlusIcon, 
    TrashIcon, 
    UserIcon,
    XIcon 
} from "@phosphor-icons/react";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/ui-test")({
    component: UITestPage,
});

const STATE_ITEMS = [
    { value: "FL", label: "Florida" },
    { value: "DE", label: "Delaware" },
    { value: "CA", label: "California" },
    { value: "TX", label: "Texas" },
    { value: "NY", label: "New York" },
];

function UITestPage() {
    const [checkboxChecked, setCheckboxChecked] = useState(true);
    const [switchChecked, setSwitchChecked] = useState(true);
    const [sliderValue, setSliderValue] = useState(50);
    const [inputValue, setInputValue] = useState("");

    return (
        <div className="min-h-screen bg-background px-4 py-8 xl:px-5 xl:py-7">
            <div className="mx-auto grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl">
                
                {/* Column 1: Form Inputs */}
                <div className="flex flex-col items-center gap-10 max-w-[360px] mx-auto">
                    
                    {/* Text Input with Label */}
                    <div className="w-full">
                        <Field>
                            <FieldLabel>Your email</FieldLabel>
                            <Input 
                                placeholder="john@email.com" 
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                            />
                            <FieldDescription>We won't share your email</FieldDescription>
                        </Field>
                    </div>

                    {/* Select/Dropdown */}
                    <div className="w-64">
                        <Field>
                            <FieldLabel>State</FieldLabel>
                            <Select items={STATE_ITEMS}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select one" />
                                    <SelectIcon />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATE_ITEMS.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>

                    {/* Controls Row: Checkbox, Switch, Radio */}
                    <div className="flex w-full items-center justify-center gap-8">
                        <Checkbox 
                            checked={checkboxChecked} 
                            onCheckedChange={(checked) => setCheckboxChecked(checked === true)}
                        />
                        
                        {/* Switch */}
                        <Switch 
                            checked={switchChecked} 
                            onCheckedChange={setSwitchChecked}
                        />
                    </div>

                    {/* Slider/Progress */}
                    <div className="w-64 px-1">
                        <Field>
                            <div className="flex justify-between items-center mb-2">
                                <FieldLabel>Price</FieldLabel>
                                <span className="text-sm font-medium tabular-nums">${sliderValue * 5}.00</span>
                            </div>
                            <Progress value={sliderValue} />
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={sliderValue}
                                onChange={(e) => setSliderValue(Number(e.target.value))}
                                className="w-full mt-2 accent-primary"
                            />
                        </Field>
                    </div>

                    {/* Tabs - Segment Style */}
                    <Tabs defaultValue="1d">
                        <TabsList>
                            <TabsTrigger value="1d">1D</TabsTrigger>
                            <TabsTrigger value="7d">7D</TabsTrigger>
                            <TabsTrigger value="1m">1M</TabsTrigger>
                            <TabsTrigger value="1y">1Y</TabsTrigger>
                            <TabsTrigger value="all">All</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Tabs with Icons */}
                    <Tabs defaultValue="chats" className={"w-full"}>
                        <TabsList>
                            <TabsTrigger value="chats">
                                <EnvelopeIcon />
                                <span>Chats</span>
                            </TabsTrigger>
                            <TabsTrigger value="emails">
                                <BellIcon />
                                <span>Emails</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Listbox/Menu - using DropdownMenu */}
                    <div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    Actions
                                    <CaretDownIcon />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem>
                                    <PlusIcon />
                                    <span>New file</span>
                                    <Kbd keys="cmd+N" variant="light" size="sm" />
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <PencilIcon />
                                    <span>Edit file</span>
                                    <Kbd keys="cmd+E" variant="light" size="sm" />
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Danger zone</DropdownMenuLabel>
                                <DropdownMenuItem variant="destructive">
                                    <TrashIcon />
                                    <span>Delete file</span>
                                    <Kbd keys={["cmd", "shift", "D"]} variant="light" size="sm" />
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Column 2: Interactive Elements */}
                <div className="flex flex-col items-center gap-10 max-w-[360px] mx-auto">
                    
                    {/* Avatar Stack */}
                    <div className="flex justify-center w-full">
                        <div className="flex -space-x-2">
                            {['🔵', '🟢', '🟣', '🟠', '🔴'].map((emoji, i) => (
                                <div key={i} className="size-10 rounded-full bg-muted ring-2 ring-background flex items-center justify-center text-lg">
                                    {emoji}
                                </div>
                            ))}
                            <div className="size-10 rounded-full bg-surface ring-2 ring-background flex items-center justify-center text-xs font-medium text-muted-foreground">
                                +5
                            </div>
                        </div>
                    </div>

                    {/* OTP Input Simulation */}
                    <div className="w-[280px]">
                        <Field>
                            <FieldLabel>Verify account</FieldLabel>
                            <FieldDescription>We've sent a code to a****@gmail.com</FieldDescription>
                            <div className="flex gap-2 mt-2">
                                <div className="flex gap-2">
                                    {['4', '3', '2'].map((digit, i) => (
                                        <div key={i} className="size-10 rounded-lg border bg-card flex items-center justify-center text-lg font-semibold">
                                            {digit}
                                        </div>
                                    ))}
                                </div>
                                <div className="w-1.5 h-0.5 bg-border self-center rounded-full" />
                                <div className="flex gap-2">
                                    <div className="size-10 rounded-lg border bg-card flex items-center justify-center text-lg font-semibold">0</div>
                                    <div className="size-10 rounded-lg border bg-muted/30 flex items-center justify-center" />
                                    <div className="size-10 rounded-lg border bg-muted/30 flex items-center justify-center" />
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground px-1 pt-1">
                                Didn't receive a code? <button className="text-foreground hover:underline">Resend</button>
                            </p>
                        </Field>
                    </div>

                    {/* Button Grid */}
                    <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                        <Button size="sm" variant="default">Click me</Button>
                        <Button size="sm" variant="secondary">Click me</Button>
                        <Button size="sm" variant="ghost">Click me</Button>
                        <Button size="sm" variant="destructive">Click me</Button>
                        <Button size="sm" variant="outline">Click me</Button>
                        <Button size="sm" variant="link">Click me</Button>
                    </div>

                    {/* Social Card */}
                    <Card className="w-full">
                        <CardHeader className="flex flex-row items-start gap-3 pb-2">
                            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-lg">🎨</span>
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                    <span className="font-semibold text-sm">HeroUI</span>
                                    <CheckIcon className="size-4 text-primary" weight="bold" />
                                </div>
                                <span className="text-sm text-muted-foreground">@hero_ui</span>
                            </div>
                        </CardHeader>
                        <CardContent className="pb-3">
                            <p className="text-sm">
                                Building the future of UI for web & mobile. 🚀 (YC S24)
                            </p>
                        </CardContent>
                        <CardFooter className="gap-4 text-sm">
                            <div className="flex gap-1">
                                <span className="font-semibold">4</span>
                                <span className="text-muted-foreground">Following</span>
                            </div>
                            <div className="flex gap-1">
                                <span className="font-semibold">97.1K</span>
                                <span className="text-muted-foreground">Followers</span>
                            </div>
                        </CardFooter>
                    </Card>

                    {/* Alert Banner */}
                    <Card className="w-full flex-row items-center gap-4 p-4">
                        <div className="size-6 rounded-full flex items-center justify-center text-primary">
                            <BellIcon className="size-5" weight="fill" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium">You have 2 credits left</p>
                            <p className="text-xs text-muted-foreground">Get a paid plan for more credits</p>
                        </div>
                        <Button size="sm" variant="ghost">Upgrade</Button>
                    </Card>

                    {/* Switch with Description */}
                    <Card className="w-full p-4">
                        <div className="flex gap-4">
                            <div className="flex flex-col gap-1 flex-1">
                                <Label>Allow notifications</Label>
                                <span className="text-sm text-muted-foreground">Receive push notifications from HeroUI</span>
                            </div>
                            <Switch 
                                checked={switchChecked} 
                                onCheckedChange={setSwitchChecked}
                            />
                        </div>
                    </Card>
                </div>

                {/* Column 3: Cards & Dialogs */}
                <div className="flex flex-col items-center gap-6 max-w-[360px] mx-auto">
                    
                    {/* Signup Card */}
                    <Card className="w-full max-w-[320px] relative">
                        <button aria-label="Close" className="absolute top-3 right-3 size-6 rounded-full bg-default hover:bg-default-hover flex items-center justify-center transition-colors">
                            <XIcon className="size-3.5" />
                        </button>
                        <CardHeader className="items-center gap-2 text-center pb-2">
                            <div className="size-10 rounded-full bg-default flex items-center justify-center">
                                <UserIcon className="size-5" />
                            </div>
                            <CardTitle className="text-base">Create an account</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2 pt-0">
                            <p className="text-center text-sm text-muted-foreground">
                                Start your free 7-day trial. No credit card required.
                            </p>
                            <Button className="w-full">Get Started</Button>
                            <div className="flex items-center gap-2 py-2">
                                <Separator className="flex-1" />
                                <span className="text-xs text-muted-foreground uppercase">Or</span>
                                <Separator className="flex-1" />
                            </div>
                            <Button variant="outline" className="w-full gap-2">
                                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                Continue with Google
                            </Button>
                            <Button variant="outline" className="w-full gap-2">
                                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                                </svg>
                                Continue with Apple
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Small Cards Row */}
                    <div className="flex gap-4 w-full">
                        <Card className="flex-1">
                            <CardHeader className="pb-2">
                                <div className="size-14 rounded-xl bg-linear-to-br from-purple-500 to-pink-500 mb-1" />
                            </CardHeader>
                            <CardContent className="pb-2">
                                <p className="text-sm font-medium">Indie Hackers</p>
                                <p className="text-sm text-muted-foreground">148 members</p>
                            </CardContent>
                            <CardFooter className="gap-2 text-xs text-muted-foreground">
                                <div className="size-4 rounded-full bg-red-400" />
                                By John
                            </CardFooter>
                        </Card>
                        <Card className="flex-1">
                            <CardHeader className="pb-2">
                                <div className="size-14 rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 mb-1" />
                            </CardHeader>
                            <CardContent className="pb-2">
                                <p className="text-sm font-medium">AI Builders</p>
                                <p className="text-sm text-muted-foreground">362 members</p>
                            </CardContent>
                            <CardFooter className="gap-2 text-xs text-muted-foreground">
                                <div className="size-4 rounded-full bg-blue-400" />
                                By Martha
                            </CardFooter>
                        </Card>
                    </div>

                    {/* Unsaved Changes Card (Dialog Preview) */}
                    <Card className="w-full relative">
                        <button aria-label="Close" className="absolute top-3 right-3 size-6 rounded-full bg-default hover:bg-default-hover flex items-center justify-center transition-colors">
                            <XIcon className="size-3.5" />
                        </button>
                        <CardHeader className="items-start gap-2 pb-2">
                            <div className="size-10 rounded-full bg-warning/10 flex items-center justify-center">
                                <GearIcon className="size-5 text-warning" />
                            </div>
                            <CardTitle className="text-base">Unsaved changes</CardTitle>
                            <CardDescription>Do you want to save or discard changes?</CardDescription>
                        </CardHeader>
                        <CardFooter className="gap-2 pt-3">
                            <Button variant="ghost" className="flex-1">Discard</Button>
                            <Button className="flex-1">Save changes</Button>
                        </CardFooter>
                    </Card>

                    {/* Badges Section */}
                    <div className="w-full">
                        <Label className="mb-3 block">Badges / Chips</Label>
                        <div className="flex flex-wrap gap-2">
                            <Badge>Default</Badge>
                            <Badge variant="secondary">Secondary</Badge>
                            <Badge variant="outline">Outline</Badge>
                            <Badge variant="destructive">Destructive</Badge>
                        </div>
                    </div>

                    {/* Tooltips Section */}
                    <div className="w-full">
                        <Label className="mb-3 block">Tooltips</Label>
                        <div className="flex gap-4">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="icon" variant="outline">
                                        <CopyIcon />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy to clipboard</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="icon" variant="outline">
                                        <MagnifyingGlassIcon />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Search</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="icon" variant="outline">
                                        <GearIcon />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Settings</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Popover Section */}
                    <div className="w-full">
                        <Label className="mb-3 block">Popover</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline">Open popover</Button>
                            </PopoverTrigger>
                            <PopoverContent>
                                <div className="flex flex-col gap-2">
                                    <h4 className="font-medium">Dimensions</h4>
                                    <p className="text-sm text-muted-foreground">Set the dimensions for the layer.</p>
                                </div>
                                <div className="grid gap-2 mt-4">
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <Label htmlFor="width">Width</Label>
                                        <Input id="width" defaultValue="100%" className="col-span-2 h-8" />
                                    </div>
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <Label htmlFor="height">Height</Label>
                                        <Input id="height" defaultValue="25px" className="col-span-2 h-8" />
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Dialog Section */}
                    <div className="w-full">
                        <Label className="mb-3 block">Dialog</Label>
                        <Dialog>
                            <DialogTrigger render={<Button variant="outline">Open dialog</Button>} />
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Edit profile</DialogTitle>
                                    <DialogDescription>
                                        Make changes to your profile here. Click save when you're done.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">Name</Label>
                                        <Input id="name" defaultValue="Pedro Duarte" className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="username" className="text-right">Username</Label>
                                        <Input id="username" defaultValue="@peduarte" className="col-span-3" />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit">Save changes</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Table Section */}
                    <div className="w-full">
                        <Label className="mb-3 block">Table</Label>
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Invoice</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">INV001</TableCell>
                                        <TableCell>Paid</TableCell>
                                        <TableCell className="text-right">$250.00</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">INV002</TableCell>
                                        <TableCell>Pending</TableCell>
                                        <TableCell className="text-right">$150.00</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
