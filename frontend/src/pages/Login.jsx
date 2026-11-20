import { GraduationCap, Eye, EyeOff } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAuth } from '../context/AuthContext.jsx';

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
    <div className="min-h-screen bg-gradient-to-br from-accent-50 to-accent-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card className="rounded-2xl shadow-sm border border-pink-200 bg-pink-50">
          <CardContent className="p-6 sm:p-8">
            <div className="text-center">
              <div className="mx-auto h-32 w-32 mb-2 flex items-center justify-center">
                <img src="/logo.png" alt="CSMS Logo" className="h-full w-full object-contain" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Sign in</h2>
              <p className="mt-1 text-sm text-muted-foreground">Use your school account to continue</p>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
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
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
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
                    className="w-full h-11 text-base font-medium"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <button type="button" className="font-medium text-primary hover:underline" onClick={() => setShowContact(true)}>
                      Contact your administrator
                    </button>
                  </p>
                </div>
            </form>
          </CardContent>
        </Card>

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

        <div className="mt-8 text-center text-xs text-secondary-500">
          <p>College of Computer Science</p>
          <p>Community Service Monitoring System</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
