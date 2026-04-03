import Link from 'next/link';
import { Calendar, ArrowRight, CheckCircle, Users, GitBranch, Zap, Globe, Shield, BarChart3, Clock, Code, Mail } from 'lucide-react';
import Logo from '@/components/ui/logo';
import { GoogleIcon, MicrosoftIcon } from '@/components/ui/brand-icons';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo size="md" />
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">Features</a>
              <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900">How It Works</a>
              <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2">
                Sign In
              </Link>
              <Link href="/signup" className="text-sm font-medium text-white bg-[#03b2d1] hover:bg-[#0292ab] px-4 py-2 rounded-lg transition-colors">
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-[#03b2d1] text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Zap className="w-4 h-4" /> Built for inbound sales teams
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Book more qualified demos.
            <br />
            <span className="text-[#03b2d1]">Close deals faster.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            The scheduling platform that routes inbound leads to the right rep, eliminates back-and-forth, and helps your team book more qualified demos from every channel.
          </p>
          <div className="flex flex-col items-center gap-3 max-w-md mx-auto">
            <Link href="/signup?provider=google" className="w-full inline-flex items-center justify-center gap-3 bg-[#03b2d1] text-white px-8 py-3.5 rounded-lg font-medium text-lg hover:bg-[#0292ab] transition-colors shadow-lg shadow-blue-500/25">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                <GoogleIcon className="w-5 h-5" />
              </div>
              Sign up with Google
            </Link>
            <Link href="/signup?provider=microsoft" className="w-full inline-flex items-center justify-center gap-3 bg-[#1a1a2e] text-white px-8 py-3.5 rounded-lg font-medium text-lg hover:bg-[#16162a] transition-colors">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                <MicrosoftIcon className="w-5 h-5" />
              </div>
              Sign up with Microsoft
            </Link>
            <div className="flex items-center gap-3 w-full my-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-400">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Link href="/signup" className="text-[#03b2d1] font-medium hover:underline">Sign up free with email.</Link>
              <span className="text-gray-400">No credit card required.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-12 border-y border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 mb-6">Trusted by sales teams at fast-growing companies</p>
          <div className="flex items-center justify-center gap-12 opacity-40">
            {['TechCorp', 'ScaleUp', 'GrowthCo', 'SaaSify', 'Pipeline'].map(name => (
              <span key={name} className="text-lg font-bold text-gray-900">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything your sales team needs to book more demos</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">From lead qualification to demo booking to follow-up, kalendr.io handles the entire inbound scheduling workflow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: GitBranch, title: 'Smart Lead Routing', description: 'Qualify leads with custom forms and automatically route them to the right rep based on company size, territory, or any criteria.' },
              { icon: Users, title: 'Round-Robin Assignment', description: 'Distribute demo requests evenly across your team. Weighted assignment, priority rules, and automatic load balancing.' },
              { icon: Globe, title: 'Embed Anywhere', description: 'Add booking to your website, landing pages, or email campaigns. Inline embeds, popups, and floating widgets.' },
              { icon: Clock, title: 'Smart Availability', description: 'Set custom hours, buffer times, daily limits, and minimum notice. Sync with Google Calendar and Outlook to prevent conflicts.' },
              { icon: Mail, title: 'Automated Notifications', description: 'Confirmation emails, reminders, and follow-ups. Reduce no-shows and keep your pipeline moving.' },
              { icon: Shield, title: 'Team Management', description: 'Invite reps, create teams, manage permissions, and track bookings. Built for SDR and AE teams.' },
              { icon: Code, title: 'Booking Pages', description: 'Beautiful, branded scheduling pages that convert. Custom questions, company fields, and qualification logic.' },
              { icon: BarChart3, title: 'SDR-to-AE Handoff', description: 'Seamless meeting handoffs between SDRs and AEs. Route qualified leads to closers automatically.' },
              { icon: Zap, title: 'Workflow Automation', description: 'Trigger emails, reminders, and follow-ups automatically. Reduce manual work and focus on selling.' },
            ].map(feature => (
              <div key={feature.title} className="p-6 rounded-xl border border-gray-200 hover:border-[#03b2d1]/30 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-[#03b2d1]" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How it works</h2>
            <p className="text-lg text-gray-500">Get your sales team booking demos in under 5 minutes</p>
          </div>

          <div className="space-y-12">
            {[
              { step: '1', title: 'Set up your event types', description: 'Create booking pages for demos, discovery calls, and enterprise evaluations. Set duration, availability, and custom questions.' },
              { step: '2', title: 'Share your scheduling link', description: 'Embed on your website, add to email signatures, or share directly. Prospects book at their convenience—no back-and-forth.' },
              { step: '3', title: 'Route leads to the right rep', description: 'Use routing forms to qualify leads and assign them to the right team member via round-robin or rules-based routing.' },
              { step: '4', title: 'Book demos automatically', description: 'Calendar sync prevents conflicts. Confirmation emails and reminders go out automatically. Your team just shows up and sells.' },
            ].map(item => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="w-10 h-10 rounded-full bg-[#03b2d1] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-500">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-500">Start free, upgrade as your team grows</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                name: 'Free',
                price: '$0',
                period: 'forever',
                description: 'For individuals getting started',
                features: ['Unlimited event types', 'Unlimited bookings', 'Calendar integrations', 'Google Meet & Zoom', 'Email notifications', 'Website embeds'],
                cta: 'Get Started',
                highlighted: false,
              },
              {
                name: 'Standard',
                price: '$9',
                period: '/seat/month',
                description: 'For professionals',
                features: ['Unlimited event types', 'Custom branding', 'Routing forms', 'Reminders & follow-ups', 'Remove branding', '6 connected calendars'],
                cta: 'Start Free Trial',
                highlighted: true,
              },
              {
                name: 'Teams',
                price: '$15',
                period: '/seat/month',
                description: 'For growing sales teams',
                features: ['Everything in Standard', 'Round-robin scheduling', 'Workflow automation', 'Team management', 'Calendar integrations', 'Admin controls'],
                cta: 'Start Free Trial',
                highlighted: false,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: '',
                description: 'For large organizations',
                features: ['Everything in Teams', 'SSO/SAML', 'Advanced routing', 'Salesforce integration', 'Dedicated support', 'Custom SLA', 'API access'],
                cta: 'Contact Sales',
                highlighted: false,
              },
            ].map(plan => (
              <div key={plan.name} className={`rounded-2xl p-8 ${plan.highlighted ? 'bg-[#03b2d1] text-white ring-4 ring-[#03b2d1]/20 scale-105' : 'bg-white border border-gray-200'}`}>
                <h3 className={`text-lg font-semibold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className={`text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-blue-200' : 'text-gray-500'}`}>{plan.period}</span>
                </div>
                <p className={`text-sm mb-6 ${plan.highlighted ? 'text-blue-200' : 'text-gray-500'}`}>{plan.description}</p>
                <ul className="space-y-2 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${plan.highlighted ? 'text-blue-200' : 'text-green-500'}`} />
                      <span className={plan.highlighted ? 'text-blue-100' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`block text-center py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  plan.highlighted
                    ? 'bg-white text-[#03b2d1] hover:bg-blue-50'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-[#03b2d1]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to book more demos?</h2>
          <p className="text-lg text-blue-200 mb-8">Join sales teams that have eliminated scheduling friction and are closing deals faster.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-[#03b2d1] px-8 py-3.5 rounded-lg font-medium text-lg hover:bg-blue-50 transition-colors">
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="mb-4">
                <Logo size="sm" variant="light" />
              </div>
              <p className="text-sm text-gray-400">Scheduling software built for inbound sales teams.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Integrations</a></li>
                <li><a href="#" className="hover:text-white">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Use Cases</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Demo Booking</a></li>
                <li><a href="#" className="hover:text-white">Lead Routing</a></li>
                <li><a href="#" className="hover:text-white">SDR Scheduling</a></li>
                <li><a href="#" className="hover:text-white">Enterprise Sales</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>
	          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
	            <div className="flex flex-wrap items-center justify-center gap-4">
	              <span>&copy; 2026 kalendr.io. All rights reserved.</span>
	              <Link href="/privacy" className="hover:text-white">Privacy</Link>
	              <Link href="/terms" className="hover:text-white">Terms</Link>
	              <Link href="/data-deletion" className="hover:text-white">Data deletion</Link>
	            </div>
	          </div>
	        </div>
	      </footer>
    </div>
  );
}
