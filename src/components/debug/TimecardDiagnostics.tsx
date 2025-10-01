import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";

interface DiagnosticsProps {
  isAuthenticated: boolean;
  userRole: string | null;
  employeeId: string | undefined;
  queries: {
    employee: { status: string; error: any };
    timecard: { status: string; error: any };
    payCodes: { status: string; error: any };
  };
  dataState: { timecard: string; payCodes: string; payCodesSource?: string };
}

interface NavigationLog {
  from: string;
  to: string;
  timestamp: string;
}

interface GuardLog {
  guard: string;
  action: string;
  target: string;
  reason: string;
  timestamp: string;
}

interface ConsoleError {
  message: string;
  timestamp: string;
}

export function TimecardDiagnostics({
  isAuthenticated,
  userRole,
  employeeId,
  queries,
  dataState,
}: DiagnosticsProps) {
  const location = useLocation();
  const [navigationLog, setNavigationLog] = useState<NavigationLog[]>([]);
  const [guardLogs, setGuardLogs] = useState<GuardLog[]>([]);
  const [consoleErrors, setConsoleErrors] = useState<ConsoleError[]>([]);

  // Track navigation
  useEffect(() => {
    const from = navigationLog[navigationLog.length - 1]?.to || 'initial';
    const to = location.pathname + location.search;
    
    if (from !== to) {
      setNavigationLog(prev => [
        ...prev.slice(-4),
        { from, to, timestamp: new Date().toISOString().split('T')[1].slice(0, 8) }
      ]);
    }
  }, [location]);

  // Capture console errors
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      setConsoleErrors(prev => [
        ...prev.slice(-4),
        { message: message.slice(0, 100), timestamp: new Date().toISOString().split('T')[1].slice(0, 8) }
      ]);
      
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  // Expose guard logging globally
  useEffect(() => {
    (window as any).__logGuardRedirect = (guard: string, target: string, reason: string) => {
      setGuardLogs(prev => [
        ...prev.slice(-4),
        {
          guard,
          action: 'navigate',
          target,
          reason,
          timestamp: new Date().toISOString().split('T')[1].slice(0, 8)
        }
      ]);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    if (status === 'success' || status === 'loaded') return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === 'error' || status === 'failed' || status === 'timeout') return <XCircle className="h-4 w-4 text-red-600" />;
    if (status === 'loading') return <Clock className="h-4 w-4 text-yellow-600 animate-spin" />;
    return <AlertCircle className="h-4 w-4 text-gray-600" />;
  };

  const isFailOpenMode = dataState.timecard === 'timeout' || dataState.payCodes === 'failed';

  return (
    <Card className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Diagnostics Panel
          {isFailOpenMode && (
            <Badge variant="destructive" className="ml-2">
              FAIL-OPEN MODE
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* Auth State */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <strong>Auth:</strong> {isAuthenticated ? '✓ Authenticated' : '✗ Not authenticated'}
          </div>
          <div>
            <strong>Role:</strong> {userRole || 'None'}
          </div>
        </div>

        {/* Route Info */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <strong>Pathname:</strong> {location.pathname}
          </div>
          <div>
            <strong>EmployeeId:</strong> {employeeId || 'None'}
          </div>
        </div>

        {/* Query States */}
        <div className="space-y-1">
          <div className="font-semibold">Queries:</div>
          <div className="flex items-center gap-2">
            {getStatusIcon(queries.employee.status)}
            <span>Employee: {queries.employee.status}</span>
            {queries.employee.error && <span className="text-red-600">({queries.employee.error.message?.slice(0, 30)})</span>}
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(queries.timecard.status)}
            <span>Timecard: {queries.timecard.status}</span>
            {queries.timecard.error && <span className="text-red-600">({queries.timecard.error.message?.slice(0, 30)})</span>}
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(queries.payCodes.status)}
            <span>PayCodes: {queries.payCodes.status}</span>
            {dataState.payCodesSource && (
              <Badge variant="outline" className="ml-2">
                {dataState.payCodesSource}
              </Badge>
            )}
            {queries.payCodes.error && <span className="text-red-600">({queries.payCodes.error.message?.slice(0, 30)})</span>}
          </div>
        </div>

        {/* Data State */}
        <div>
          <strong>Data State:</strong> timecard={dataState.timecard}, payCodes={dataState.payCodes}
        </div>

        {/* Guard Logs */}
        {guardLogs.length > 0 && (
          <div className="space-y-1">
            <div className="font-semibold">Guard Redirects:</div>
            {guardLogs.map((log, i) => (
              <div key={i} className="text-xs pl-2 border-l-2 border-red-400">
                [{log.timestamp}] {log.guard}: navigate to "{log.target}" - {log.reason}
              </div>
            ))}
          </div>
        )}

        {/* Navigation Log */}
        {navigationLog.length > 0 && (
          <div className="space-y-1">
            <div className="font-semibold">Last Navigation:</div>
            {navigationLog.slice(-1).map((nav, i) => (
              <div key={i} className="text-xs pl-2">
                [{nav.timestamp}] {nav.from} → {nav.to}
              </div>
            ))}
          </div>
        )}

        {/* Console Errors */}
        {consoleErrors.length > 0 && (
          <div className="space-y-1">
            <div className="font-semibold text-red-600">Console Errors (last 5):</div>
            {consoleErrors.map((err, i) => (
              <div key={i} className="text-xs pl-2 border-l-2 border-red-600 text-red-700">
                [{err.timestamp}] {err.message}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
