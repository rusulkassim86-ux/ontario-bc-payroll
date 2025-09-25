import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePortalAuth } from '../../auth/PortalAuthProvider';
import { 
  Home, 
  Clock, 
  DollarSign, 
  Calendar, 
  User, 
  FileText, 
  CheckSquare, 
  Users, 
  Menu,
  X,
  LogOut,
  Settings,
  Bell,
  Download,
  Moon,
  Sun,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface PortalLayoutProps {
  children: ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const { user, signOut, isManager } = usePortalAuth();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPWAPrompt, setShowPWAPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPWAPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handlePWAInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPWAPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'My Time', href: '/time', icon: Clock },
    { name: 'My Pay', href: '/pay', icon: DollarSign },
    { name: 'Time Off', href: '/timeoff', icon: Calendar },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Documents', href: '/documents', icon: FileText },
  ];

  const managerNavigation = [
    { name: 'Approvals', href: '/approvals', icon: CheckSquare },
    { name: 'Team', href: '/team', icon: Users },
  ];

  const allNavigation = isManager ? [...navigation, ...managerNavigation] : navigation;

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const NavLinks = ({ mobile = false, onLinkClick = () => {} }) => (
    <nav className={`${mobile ? 'space-y-1' : 'space-y-2'}`}>
      {allNavigation.map((item) => {
        const isActive = location.pathname === item.href;
        const Icon = item.icon;
        
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={onLinkClick}
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${isActive 
                ? 'portal-nav-active' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }
            `}
          >
            <Icon className="h-4 w-4" />
            {item.name}
            {item.href === '/approvals' && isManager && (
              <Badge variant="secondary" className="ml-auto">3</Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center gap-4 px-4">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 px-2 py-4">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">BT</span>
                  </div>
                  <span className="portal-brand text-lg">Best Theratronics</span>
                </div>
                <NavLinks mobile onLinkClick={() => {}} />
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">BT</span>
            </div>
            <span className="portal-brand text-lg hidden sm:block">Best Theratronics Portal</span>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search employees, pay stubs..." 
                className="pl-9"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">2</Badge>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                  <span className="hidden sm:block">{user?.firstName} {user?.lastName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <div className="font-medium">{user?.firstName} {user?.lastName}</div>
                  <div className="text-muted-foreground">{user?.email}</div>
                  <Badge variant="outline" className="mt-1 text-xs">{user?.role}</Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-muted/10">
          <div className="p-6">
            <NavLinks />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* PWA Install Prompt */}
      {showPWAPrompt && (
        <div className="pwa-install-prompt">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium">Install Best Theratronics Portal</p>
              <p className="text-sm text-muted-foreground">Access your portal offline</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handlePWAInstall}>Install</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowPWAPrompt(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}