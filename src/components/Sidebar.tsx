import ProfileCard from "./ProfileCard";

interface SidebarProps {
  children: React.ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="hidden lg:flex lg:flex-col w-60 shrink-0 border-r border-gray-200 dark:border-gray-800">
      <div className="sticky top-16 flex flex-col h-[calc(100vh-4rem)]">
        <ProfileCard />
        <div className="border-t border-gray-200 dark:border-gray-800" />
        <div className="flex-1 overflow-y-auto sidebar-scroll p-4">
          {children}
        </div>
      </div>
    </aside>
  );
}
