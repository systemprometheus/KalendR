'use client';
import { useState, useEffect } from 'react';
import { Users, Plus, Mail, Shield, Crown, UserMinus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [teamName, setTeamName] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/team/members').then(r => r.json()),
      fetch('/api/team').then(r => r.json()),
    ]).then(([me, m, t]) => {
      setUser(me.user);
      setMembers(m.members || []);
      setTeams(t.teams || []);
      setLoading(false);
    });
  }, []);

  const handleInvite = () => {
    // Stubbed - would send invitation email
    alert(`Invitation would be sent to ${inviteEmail}`);
    setShowInvite(false);
    setInviteEmail('');
  };

  const handleCreateTeam = async () => {
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teamName }),
    });
    if (res.ok) {
      setShowCreateTeam(false);
      setTeamName('');
      const t = await fetch('/api/team').then(r => r.json());
      setTeams(t.teams || []);
    }
  };

  const roleIcon = (role: string) => {
    if (role === 'owner') return <Crown className="w-4 h-4 text-amber-500" />;
    if (role === 'admin') return <Shield className="w-4 h-4 text-[#0069ff]" />;
    return null;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin-slow w-8 h-8 border-2 border-[#0069ff] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500 mt-1">Manage team members and scheduling groups</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCreateTeam(true)}>
            <Plus className="w-4 h-4" /> New Team
          </Button>
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus className="w-4 h-4" /> Invite Member
          </Button>
        </div>
      </div>

      {/* Organization Members */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Members ({members.length})</h2>
        <div className="space-y-2">
          {members.map(m => (
            <Card key={m.id}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#0069ff] flex items-center justify-center text-white font-medium">
                  {m.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{m.name}</p>
                    {roleIcon(m.orgRole)}
                  </div>
                  <p className="text-sm text-gray-500">{m.email}</p>
                </div>
                <Badge variant={m.orgRole === 'owner' ? 'warning' : m.orgRole === 'admin' ? 'info' : 'default'}>
                  {m.orgRole}
                </Badge>
                <span className="text-sm text-gray-400">{m.timezone}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Teams */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Teams ({teams.length})</h2>
        {teams.length === 0 ? (
          <EmptyState
            icon={<Users className="w-12 h-12" />}
            title="No teams yet"
            description="Create teams to set up round-robin and collective scheduling for your sales reps."
            action={{ label: 'Create Team', onClick: () => setShowCreateTeam(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map(team => (
              <Card key={team.id}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#0069ff]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                    <p className="text-sm text-gray-500">{team.members?.length || 0} members</p>
                  </div>
                </div>
                <div className="flex -space-x-2">
                  {(team.members || []).slice(0, 5).map((m: any) => (
                    <div key={m.id} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600" title={m.user?.name}>
                      {m.user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite Team Member">
        <div className="space-y-4">
          <Input label="Email Address" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" />
          <p className="text-sm text-gray-500">They'll receive an email invitation to join your organization.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite}><Mail className="w-4 h-4" /> Send Invite</Button>
          </div>
        </div>
      </Modal>

      {/* Create Team Modal */}
      <Modal isOpen={showCreateTeam} onClose={() => setShowCreateTeam(false)} title="Create Team">
        <div className="space-y-4">
          <Input label="Team Name" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g., Sales Team, SDR Team" />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateTeam(false)}>Cancel</Button>
            <Button onClick={handleCreateTeam}>Create Team</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
