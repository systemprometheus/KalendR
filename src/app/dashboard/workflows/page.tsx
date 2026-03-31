'use client';
import { Zap, Mail, MessageSquare, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

const DEFAULT_WORKFLOWS = [
  { name: 'Booking Confirmation', trigger: 'When a meeting is booked', action: 'Send confirmation email to invitee', channel: 'email', active: true, system: true },
  { name: 'Host Notification', trigger: 'When a meeting is booked', action: 'Notify the host via email', channel: 'email', active: true, system: true },
  { name: '24h Reminder', trigger: '24 hours before meeting', action: 'Send reminder to invitee', channel: 'email', active: true, system: false },
  { name: '1h Reminder', trigger: '1 hour before meeting', action: 'Send reminder to invitee', channel: 'email', active: false, system: false },
  { name: 'Cancellation Notice', trigger: 'When a meeting is cancelled', action: 'Notify both parties', channel: 'email', active: true, system: true },
  { name: 'Follow-up Email', trigger: '1 hour after meeting ends', action: 'Send follow-up to invitee', channel: 'email', active: false, system: false },
];

export default function WorkflowsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-500 mt-1">Automate email reminders, follow-ups, and notifications</p>
        </div>
        <Button>
          <Plus className="w-4 h-4" /> New Workflow
        </Button>
      </div>

      <div className="space-y-3">
        {DEFAULT_WORKFLOWS.map((workflow, i) => (
          <Card key={i} className={`hover:border-gray-300 transition-colors ${!workflow.active ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${workflow.active ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {workflow.channel === 'email' ? (
                  <Mail className={`w-5 h-5 ${workflow.active ? 'text-[#0069ff]' : 'text-gray-400'}`} />
                ) : (
                  <MessageSquare className={`w-5 h-5 ${workflow.active ? 'text-[#0069ff]' : 'text-gray-400'}`} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{workflow.name}</h3>
                  {workflow.system && <Badge>System</Badge>}
                  <Badge variant={workflow.active ? 'success' : 'default'}>
                    {workflow.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  <span className="text-gray-400">Trigger:</span> {workflow.trigger} → <span className="text-gray-400">Action:</span> {workflow.action}
                </p>
              </div>
              <Button variant="ghost" size="sm">
                {workflow.active ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
