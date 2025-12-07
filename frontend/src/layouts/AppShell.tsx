import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
    Bars3Icon,
    XMarkIcon,
    MapIcon,
    ClipboardDocumentCheckIcon,
    ChartBarIcon,
    UserGroupIcon,
    CameraIcon,
    CloudArrowUpIcon,
} from '@heroicons/react/24/outline'
import { Cloud, CloudOff } from 'lucide-react'
import { cn } from '../lib/utils'

const navigation = [
    { name: 'Dashboard', href: '#', icon: ChartBarIcon, current: true, view: 'dashboard' },
    { name: 'Capture', href: '#', icon: CameraIcon, current: false, view: 'capture' },
    { name: 'Upload Queue', href: '#', icon: CloudArrowUpIcon, current: false, view: 'queue' },
    { name: 'Map View', href: '#', icon: MapIcon, current: false, view: 'map' },
    { name: 'Review Queue', href: '#', icon: ClipboardDocumentCheckIcon, current: false, view: 'review' },
    { name: 'Registry', href: '#', icon: UserGroupIcon, current: false, view: 'registry' },
]

interface AppShellProps {
    children: React.ReactNode;
    currentView: string;
    onViewChange: (view: string) => void;
}

export default function AppShell({ children, currentView, onViewChange }: AppShellProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isOnline, setIsOnline] = useState(navigator.onLine)

    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    return (
        <>
            <div>
                <Transition.Root show={sidebarOpen} as={Fragment}>
                    <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
                        <Transition.Child
                            as={Fragment}
                            enter="transition-opacity ease-linear duration-300"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="transition-opacity ease-linear duration-300"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <div className="fixed inset-0 bg-secondary-900/80" />
                        </Transition.Child>

                        <div className="fixed inset-0 flex">
                            <Transition.Child
                                as={Fragment}
                                enter="transition ease-in-out duration-300 transform"
                                enterFrom="-translate-x-full"
                                enterTo="translate-x-0"
                                leave="transition ease-in-out duration-300 transform"
                                leaveFrom="translate-x-0"
                                leaveTo="-translate-x-full"
                            >
                                <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                                    <Transition.Child
                                        as={Fragment}
                                        enter="ease-in-out duration-300"
                                        enterFrom="opacity-0"
                                        enterTo="opacity-100"
                                        leave="ease-in-out duration-300"
                                        leaveFrom="opacity-100"
                                        leaveTo="opacity-0"
                                    >
                                        <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                                            <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                                                <span className="sr-only">Close sidebar</span>
                                                <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                                            </button>
                                        </div>
                                    </Transition.Child>
                                    {/* Sidebar component for mobile */}
                                    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-secondary-900 px-6 pb-4 ring-1 ring-white/10">
                                        <div className="flex h-16 shrink-0 items-center">
                                            <span className="text-xl font-bold text-white">Land Records</span>
                                        </div>
                                        <nav className="flex flex-1 flex-col">
                                            <ul role="list" className="flex flex-1 flex-col gap-y-7">
                                                <li>
                                                    <ul role="list" className="-mx-2 space-y-1">
                                                        {navigation.map((item) => (
                                                            <li key={item.name}>
                                                                <a
                                                                    href={item.href}
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        onViewChange(item.view);
                                                                        setSidebarOpen(false);
                                                                    }}
                                                                    className={cn(
                                                                        item.view === currentView
                                                                            ? 'bg-secondary-800 text-white'
                                                                            : 'text-secondary-400 hover:text-white hover:bg-secondary-800',
                                                                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                                                    )}
                                                                >
                                                                    <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                                                    {item.name}
                                                                </a>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </li>
                                            </ul>
                                        </nav>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </Dialog>
                </Transition.Root>

                {/* Static sidebar for desktop */}
                <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
                    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-secondary-900 px-6 pb-4">
                        <div className="flex h-16 shrink-0 items-center">
                            <span className="text-xl font-bold text-white">Land Records</span>
                        </div>
                        <nav className="flex flex-1 flex-col">
                            <ul role="list" className="flex flex-1 flex-col gap-y-7">
                                <li>
                                    <ul role="list" className="-mx-2 space-y-1">
                                        {navigation.map((item) => (
                                            <li key={item.name}>
                                                <a
                                                    href={item.href}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        onViewChange(item.view);
                                                    }}
                                                    className={cn(
                                                        item.view === currentView
                                                            ? 'bg-secondary-800 text-white'
                                                            : 'text-secondary-400 hover:text-white hover:bg-secondary-800',
                                                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                                    )}
                                                >
                                                    <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                                    {item.name}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </div>

                <div className="lg:pl-72">
                    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-secondary-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
                        <button
                            type="button"
                            className="-m-2.5 p-2.5 text-secondary-700 lg:hidden"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <span className="sr-only">Open sidebar</span>
                            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                        </button>

                        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                            <div className="flex flex-1 items-center">
                                <h1 className="text-2xl font-semibold text-secondary-900">
                                    {navigation.find(n => n.view === currentView)?.name || 'Dashboard'}
                                </h1>
                            </div>
                            <div className="flex items-center gap-x-4 lg:gap-x-6">
                                {/* Online/Offline status */}
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isOnline
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                    {isOnline ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
                                    {isOnline ? 'Online' : 'Offline'}
                                </div>

                                {/* Profile dropdown or other header items */}
                                <div className="flex items-center gap-x-2">
                                    <span className="text-sm font-semibold text-secondary-900">Admin User</span>
                                    <div className="h-8 w-8 rounded-full bg-secondary-200" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <main className="py-10">
                        <div className="px-4 sm:px-6 lg:px-8">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </>
    )
}
