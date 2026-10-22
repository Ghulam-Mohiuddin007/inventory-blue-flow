import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Store, ShieldCheck, Zap, Lock, Mail, ArrowRight, UserCheck, KeyRound, Database } from 'lucide-react';
import { UserRole } from '@/services/deviceStorage';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, quickDemoLogin, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Authentication Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Authenticated Successfully",
        description: "Welcome back! In-device session restored.",
      });
      navigate('/');
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const { error } = await signUp(
      email, 
      password, 
      name || storeName, 
      storeName || 'My Retail Pharmacy',
      selectedRole
    );
    
    if (error) {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account Created Locally",
        description: `Stored in IndexedDB with Web Crypto PBKDF2 hash (${selectedRole}).`,
      });
      navigate('/');
    }
    setLoading(false);
  };

  const handleQuickLogin = async (role: 'admin' | 'staff') => {
    setLoading(true);
    await quickDemoLogin(role);
    toast({
      title: role === 'admin' ? "Logged in as Admin" : "Logged in as Cashier",
      description: `In-device session authenticated with role [${role.toUpperCase()}].`,
    });
    navigate('/');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b1120] text-slate-100 p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md shadow-2xl border-slate-800 bg-slate-900/90 backdrop-blur-xl relative z-10 text-slate-100">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white mb-3 shadow-lg shadow-indigo-500/25">
            <Store className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            Inventory Blue Flow
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 mt-0.5">
            Enterprise In-Device POS & Khata Management
          </CardDescription>

          <div className="mt-3 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 py-1 px-3 rounded-full border border-emerald-800/80">
              <Database className="h-3.5 w-3.5 shrink-0" />
              <span>In-Device IndexedDB Storage Engine (Zero Cloud)</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <KeyRound className="h-3 w-3 text-indigo-400" />
              <span>Web Crypto PBKDF2 Salted Hashing (100k rounds)</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-800/80 p-1">
              <TabsTrigger value="signin" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs font-semibold py-2">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs font-semibold py-2">
                New User / Role
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-3.5">
              <form onSubmit={handleSignIn} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email" className="text-xs font-semibold text-slate-300">
                    Admin or Cashier Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="signin-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@inventory.local"
                      className="pl-9 h-11 text-xs sm:text-sm bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signin-password" className="text-xs font-semibold text-slate-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="signin-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 h-11 text-xs sm:text-sm bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 gap-1.5 mt-2" 
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In (In-Device Auth)
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-3.5">
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">
                    Role & Permissions
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('admin')}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium text-left flex items-center gap-2 transition ${
                        selectedRole === 'admin' 
                          ? 'border-indigo-500 bg-indigo-950/50 text-indigo-200' 
                          : 'border-slate-800 bg-slate-950/40 text-slate-400'
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4 text-indigo-400" />
                      <div>
                        <p className="font-bold">Shopkeeper</p>
                        <p className="text-[10px] text-slate-400">Full Admin</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('staff')}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium text-left flex items-center gap-2 transition ${
                        selectedRole === 'staff' 
                          ? 'border-indigo-500 bg-indigo-950/50 text-indigo-200' 
                          : 'border-slate-800 bg-slate-950/40 text-slate-400'
                      }`}
                    >
                      <UserCheck className="h-4 w-4 text-emerald-400" />
                      <div>
                        <p className="font-bold">POS Cashier</p>
                        <p className="text-[10px] text-slate-400">Sales & POS</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-store" className="text-xs font-semibold text-slate-300">
                    Store / Pharmacy Name
                  </Label>
                  <Input
                    id="signup-store"
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Al-Madina Medicos & Mart"
                    className="h-10 text-xs sm:text-sm bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-xs font-semibold text-slate-300">
                    Full Name
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tariq Mehmood"
                    className="h-10 text-xs sm:text-sm bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-xs font-semibold text-slate-300">
                    Local Email ID
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="manager@mystore.local"
                    className="h-10 text-xs sm:text-sm bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-xs font-semibold text-slate-300">
                    Password (Stored Hashed)
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 4 characters"
                    className="h-10 text-xs sm:text-sm bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500"
                    required
                    minLength={4}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 gap-1.5 mt-2" 
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Register Local User into IndexedDB
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
              <span className="bg-slate-900 px-2 text-slate-500">1-Click Quick Access</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleQuickLogin('admin')} 
              className="h-11 bg-slate-950/40 border-indigo-500/40 hover:bg-indigo-950/40 text-indigo-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
              disabled={loading}
            >
              <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
              <span>Admin Demo</span>
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleQuickLogin('staff')} 
              className="h-11 bg-slate-950/40 border-emerald-500/40 hover:bg-emerald-950/40 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
              disabled={loading}
            >
              <UserCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Cashier Demo</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <p className="text-[11px] text-slate-500 text-center mt-6">
        IndexedDB Native Engine • Offline Service Worker Ready • Zero External Cloud
      </p>
    </div>
  );
};

export default AuthPage;