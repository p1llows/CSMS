import { GraduationCap, Eye, EyeOff } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from '../components/Layout/ThemeToggle.jsx';

const Login = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showContact, setShowContact] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.email, formData.password);
    
    if (!result.success) {
      setError(result.error);
    } else {
      // Persist desired tab; App.jsx will switch to dashboard when user is set
      try {
        localStorage.setItem('activeTab', 'dashboard');
        localStorage.setItem('justLoggedIn', '1');
      } catch {}
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle className="h-9 w-9 rounded-full border border-border bg-card hover:bg-accent" />
      </div>
      <div className="w-full max-w-[400px] relative z-10">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="CSMS Logo" className="mx-auto h-14 w-14 object-contain mb-4" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
            College of Computer Science
          </p>
          <h2 className="text-2xl font-medium tracking-tight text-foreground">
            Sign in to CSMS
          </h2>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="mt-1 bg-background"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        className="pr-10 bg-background"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <label className="inline-flex items-center gap-2 select-none">
                    <input type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                    <span className="text-muted-foreground">Remember me</span>
                  </label>
                  <button type="button" className="font-medium text-primary hover:underline" onClick={() => setShowContact(true)}>
                    Forgot password?
                  </button>
                </div>

                <div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-full text-sm font-medium"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Need an account?{' '}
                    <button type="button" className="font-medium text-foreground underline underline-offset-4 hover:text-primary" onClick={() => setShowContact(true)}>
                      Contact administrator
                    </button>
                  </p>
                </div>
          </form>
        </div>

        <Dialog open={showContact} onOpenChange={setShowContact}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Contact Administrator</DialogTitle>
              <DialogDescription>Reach out to your administrator for account assistance.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <a href="mailto:govsbo@student.dmmmsu.edu.ph" className="text-primary hover:underline break-all">govsbo@student.dmmmsu.edu.ph</a>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label>Your Email</Label>
                  <Input type="email" placeholder="you@example.com" />
                </div>
                <div>
                  <Label>Message</Label>
                  <textarea className="w-full border border-input bg-background text-foreground rounded-md px-3 py-2" rows="3" placeholder="Briefly describe your issue" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => setShowContact(false)}>Close</Button>
                <a href="mailto:admin@csms.local?subject=Account%20Assistance&body=Please%20describe%20your%20issue." className="inline-flex items-center">
                  <Button type="button">Open Email</Button>
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>College of Computer Science</p>
          <p>Community Service Monitoring System</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
