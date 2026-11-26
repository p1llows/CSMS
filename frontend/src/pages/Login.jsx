import { Eye, EyeOff, ArrowRight, Mail, Lock, CalendarCheck, CalendarDays, Briefcase } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import ThemeToggle from '../components/Layout/ThemeToggle.jsx';
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
      try {
        localStorage.setItem('activeTab', 'dashboard');
        localStorage.setItem('justLoggedIn', '1');
      } catch { }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground grid grid-cols-1 lg:grid-cols-12">
      {/* Left Editorial Panel (Desktop) */}
      <aside className="hidden lg:flex lg:col-span-7 relative flex-col justify-between p-12 xl:p-16 bg-gradient-to-br from-[#AD1457] via-[#E91E63] to-[#F06292] text-white overflow-hidden">
        {/* CCS Building Backdrop (right-anchored & edge-masked like reference) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 bottom-0 w-[72%] h-[78%] overflow-hidden"
          style={{
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.85) 45%, black 100%), linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.9) 35%, black 100%)',
            WebkitMaskComposite: 'source-in',
            maskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.85) 45%, black 100%), linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.9) 35%, black 100%)',
            maskComposite: 'intersect',
          }}
        >
          <img
            src="/ccs-building.jpg"
            alt=""
            className="w-full h-full object-cover object-center opacity-50 mix-blend-luminosity contrast-125 brightness-95"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#880E4F]/80 via-transparent to-transparent" />
        </div>
        {/* Subtle architectural grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Sweeping architectural ribbon / 3-curve wave (confined to upper sky above building) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 800 420"
          preserveAspectRatio="xMaxYMin slice"
          className="pointer-events-none absolute top-0 right-0 w-full h-[46%]"
          fill="none"
        >
          <path
            d="M 360 -20 C 390 95, 510 55, 535 140 C 560 225, 675 155, 705 235 C 735 315, 785 265, 820 295 L 820 -20 Z"
            fill="url(#leftRibbonFill1)"
          />
          <path
            d="M 475 -20 C 505 70, 595 35, 618 108 C 640 180, 725 120, 752 188 C 775 245, 802 215, 820 232 L 820 -20 Z"
            fill="url(#leftRibbonFill2)"
          />
          <path
            d="M 332 -20 C 365 110, 490 70, 518 158 C 546 245, 662 172, 694 252 C 722 325, 780 282, 820 312"
            stroke="url(#leftRibbonStroke)"
            strokeWidth="1.5"
          />
          <defs>
            <linearGradient id="leftRibbonFill1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.24" />
              <stop offset="65%" stopColor="#F48FB1" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#AD1457" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="leftRibbonFill2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F48FB1" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#E91E63" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="leftRibbonStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.42" />
              <stop offset="70%" stopColor="#F48FB1" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        <div className="relative z-10 flex items-center gap-4">
          <img src="/logo.png" alt="CSMS Logo" className="h-20 w-20 object-contain shrink-0" />
          <div>
            <span className="text-2xl font-bold tracking-tight text-white block leading-tight">
              CSMS
            </span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-pink-100/85">
              College of Computer Science
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-xl space-y-5 my-auto py-12">
          <div className="flex items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-pink-100/95">
              Community Service Monitoring System
            </p>
            <span className="h-px w-12 bg-white/40" />
          </div>
          <h1 className="text-4xl xl:text-[52px] font-semibold tracking-[-0.03em] leading-[1.06] text-white">
            Track service hours,{' '}
            <span className="text-pink-100/90 font-medium">events, and attendance in one place.</span>
          </h1>
          <p className="text-base text-pink-100/85 leading-relaxed max-w-md">
            Manage FRC and campus events, verify four-session attendance, and monitor community service progress across students and faculty.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 divide-x divide-white/20 pt-4">
          <div className="pr-5 flex items-start gap-3">
            <CalendarCheck className="w-5 h-5 text-pink-100/90 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-pink-100/80">01 · Attendance</p>
              <p className="mt-1 text-sm font-medium text-white">4-Session Tracking</p>
            </div>
          </div>
          <div className="px-5 flex items-start gap-3">
            <CalendarDays className="w-5 h-5 text-pink-100/90 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-pink-100/80">02 · Schedule</p>
              <p className="mt-1 text-sm font-medium text-white">Events &amp; FRC Calendar</p>
            </div>
          </div>
          <div className="pl-5 flex items-start gap-3">
            <Briefcase className="w-5 h-5 text-pink-100/90 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-pink-100/80">03 · Service</p>
              <p className="mt-1 text-sm font-medium text-white">Hours &amp; Task Portal</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Sign-In Column */}
      <main className="lg:col-span-5 relative flex flex-col justify-center items-center px-6 py-12 sm:px-10 bg-white dark:bg-background overflow-hidden">
        {/* Full-height sweeping soft-pink curves on sign-in canvas */}
        <svg
          aria-hidden="true"
          viewBox="0 0 600 900"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 w-full h-full opacity-55 dark:opacity-[0.08]"
          fill="none"
        >
          <path
            d="M 380 -40 C 520 140, 220 340, 420 540 C 580 700, 480 840, 320 940 L 640 940 L 640 -40 Z"
            fill="url(#rightSoftRose)"
          />
          <path
            d="M 460 -40 C 590 180, 310 380, 490 580 C 610 710, 540 840, 420 940"
            stroke="#F48FB1"
            strokeWidth="56"
            strokeOpacity="0.32"
          />
          <defs>
            <linearGradient id="rightSoftRose" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F48FB1" stopOpacity="0.34" />
              <stop offset="50%" stopColor="#F48FB1" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#F48FB1" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute top-5 right-5 z-10">
          <ThemeToggle className="h-9 w-9 rounded-full hover:bg-muted" />
        </div>

        <div className="relative z-10 w-full max-w-[380px] space-y-8">
          {/* Mobile Brand Header */}
          <div className="lg:hidden text-center space-y-2.5">
            <img src="/logo.png" alt="CSMS Logo" className="mx-auto h-24 w-24 object-contain" />
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              College of Computer Science
            </p>
          </div>

          <div className="space-y-1.5 text-center lg:text-left">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Sign in to your account
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter your school email and password to continue.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="h-11 pl-10 rounded-xl bg-card"
                    placeholder="name@ccs.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                    Password
                  </Label>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => setShowContact(true)}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="h-11 pl-10 pr-10 rounded-xl bg-card"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 select-none cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary" />
                <span className="text-muted-foreground">Keep me signed in</span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-full text-sm font-medium gap-2 bg-[#E91E63] hover:bg-[#D81B60] text-white shadow-sm"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-1">
              Need an account?{' '}
              <button
                type="button"
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                onClick={() => setShowContact(true)}
              >
                Contact administrator
              </button>
            </p>
          </form>
        </div>

        <Dialog open={showContact} onOpenChange={setShowContact}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Contact Administrator</DialogTitle>
              <DialogDescription>Reach out to your administrator for account assistance.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Administrator Email</Label>
                <div>
                  <a href="mailto:govsbo@student.dmmmsu.edu.ph" className="text-sm font-medium text-primary hover:underline break-all">
                    govsbo@student.dmmmsu.edu.ph
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Your Email</Label>
                  <Input type="email" className="rounded-xl" placeholder="you@example.com" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Message</Label>
                  <textarea className="w-full border border-input bg-background text-foreground rounded-xl px-3 py-2 text-sm" rows="3" placeholder="Briefly describe your issue" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" type="button" className="rounded-full" onClick={() => setShowContact(false)}>Close</Button>
                <a href="mailto:govsbo@student.dmmmsu.edu.ph?subject=Account%20Assistance&body=Please%20describe%20your%20issue." className="inline-flex items-center">
                  <Button type="button" className="rounded-full px-5">Open Email</Button>
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Login;
