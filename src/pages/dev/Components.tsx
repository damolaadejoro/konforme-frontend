import React from 'react'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { MetricCard } from '../../components/ui/MetricCard'
import { EmptyState } from '../../components/ui/EmptyState'
import {
  DataTable,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  type Column,
} from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { PageContainer, PageContent } from '../../components/ui/PageContainer'
import {
  Plus,
  Download,
  Trash2,
  Settings,
  Search,
  Shield,
  AlertTriangle,
  CheckCircle,
  FileText,
  Activity,
  BarChart3,
  Inbox,
} from 'lucide-react'

/* ─── Sample data ─── */

interface SampleRow {
  id: number
  control: string
  status: string
  severity: string
  score: number
  lastChecked: string
}

const sampleData: SampleRow[] = [
  { id: 1, control: 'MFA enforced on all admin accounts', status: 'Pass', severity: 'Critical', score: 100, lastChecked: '2026-04-27' },
  { id: 2, control: 'Encryption at rest enabled (RDS)', status: 'Pass', severity: 'High', score: 100, lastChecked: '2026-04-27' },
  { id: 3, control: 'VPC flow logs enabled', status: 'Fail', severity: 'Medium', score: 0, lastChecked: '2026-04-27' },
  { id: 4, control: 'S3 bucket public access blocked', status: 'Pass', severity: 'Critical', score: 100, lastChecked: '2026-04-26' },
  { id: 5, control: 'CloudTrail multi-region enabled', status: 'Fail', severity: 'High', score: 0, lastChecked: '2026-04-26' },
]

const columns: Column<SampleRow>[] = [
  { key: 'control', header: 'Control' },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <Badge variant={row.status === 'Pass' ? 'success' : 'danger'} size="sm">
        {row.status}
      </Badge>
    ),
  },
  {
    key: 'severity',
    header: 'Severity',
    render: (row) => (
      <Badge
        variant={
          row.severity === 'Critical'
            ? 'danger'
            : row.severity === 'High'
              ? 'warning'
              : 'muted'
        }
        size="sm"
      >
        {row.severity}
      </Badge>
    ),
  },
  { key: 'score', header: 'Score', numeric: true, align: 'right' },
  { key: 'lastChecked', header: 'Last Checked', align: 'right' },
]

/* ─── CSS variable tokens ─── */

const tokenGroups = [
  {
    label: 'Brand',
    tokens: ['--navy', '--cyan', '--green', '--off-white'],
  },
  {
    label: 'Surfaces',
    tokens: ['--background', '--foreground', '--card', '--card-foreground'],
  },
  {
    label: 'Text',
    tokens: ['--muted', '--muted-foreground'],
  },
  {
    label: 'Interactive',
    tokens: ['--primary', '--primary-foreground', '--secondary', '--secondary-foreground', '--accent', '--accent-foreground'],
  },
  {
    label: 'Borders',
    tokens: ['--border', '--input', '--ring'],
  },
  {
    label: 'Semantic',
    tokens: ['--destructive', '--destructive-foreground', '--warning', '--success'],
  },
]

function ColorSwatch({ token }: { token: string }) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  const rgb = raw.replace(/\s+/g, ', ')
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div
        className="w-8 h-8 rounded border border-border shrink-0"
        style={{ backgroundColor: `rgb(${raw})` }}
      />
      <div className="min-w-0">
        <p className="text-sm font-mono text-foreground">{token}</p>
        <p className="text-xs text-muted-foreground">rgb({rgb})</p>
      </div>
    </div>
  )
}

/* ─── Section helper ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">
        {title}
      </h2>
      {children}
    </section>
  )
}

function SubSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  )
}

/* ─── Main page ─── */

export default function Components() {
  return (
    <PageContainer>
      <PageHeader
        title="UI Primitives"
        description="Phase 02 — shared components for the consistency pass"
        breadcrumbs={[
          { label: 'Dev', href: '/dev/components' },
          { label: 'Components' },
        ]}
        actions={
          <Button icon={<Settings size={16} />} variant="secondary" size="sm">
            Settings
          </Button>
        }
      />

      <PageContent className="space-y-12">
        {/* ── Buttons ── */}
        <Section title="Button">
          <SubSection label="Variants × Sizes">
            <div className="space-y-4">
              {(['primary', 'secondary', 'ghost', 'destructive'] as const).map((variant) => (
                <div key={variant} className="flex items-center gap-3 flex-wrap">
                  <span className="w-24 text-xs text-muted-foreground font-mono">{variant}</span>
                  <Button variant={variant} size="sm">Small</Button>
                  <Button variant={variant} size="md">Medium</Button>
                  <Button variant={variant} size="lg">Large</Button>
                </div>
              ))}
            </div>
          </SubSection>

          <SubSection label="With icons">
            <div className="flex items-center gap-3 flex-wrap">
              <Button icon={<Plus size={16} />}>Create</Button>
              <Button variant="secondary" icon={<Download size={16} />}>Export</Button>
              <Button variant="ghost" icon={<Search size={16} />}>Search</Button>
              <Button variant="destructive" icon={<Trash2 size={16} />}>Delete</Button>
            </div>
          </SubSection>

          <SubSection label="Loading state">
            <div className="flex items-center gap-3 flex-wrap">
              <Button loading>Saving...</Button>
              <Button variant="secondary" loading>Loading...</Button>
              <Button variant="destructive" loading size="sm">Deleting...</Button>
            </div>
          </SubSection>

          <SubSection label="Disabled">
            <div className="flex items-center gap-3 flex-wrap">
              <Button disabled>Disabled Primary</Button>
              <Button variant="secondary" disabled>Disabled Secondary</Button>
            </div>
          </SubSection>
        </Section>

        {/* ── PageHeader ── */}
        <Section title="PageHeader">
          <SubSection label="With breadcrumbs, description, and actions">
            <div className="border border-border rounded-lg overflow-hidden">
              <PageHeader
                title="People Tasks"
                description="Track employee training and policy acknowledgment campaigns"
                breadcrumbs={[
                  { label: 'Compliance', href: '/' },
                  { label: 'People Tasks' },
                ]}
                actions={
                  <>
                    <Button variant="secondary" icon={<Download size={16} />}>Export</Button>
                    <Button icon={<Plus size={16} />}>New Campaign</Button>
                  </>
                }
              />
            </div>
          </SubSection>

          <SubSection label="Minimal (title only)">
            <div className="border border-border rounded-lg overflow-hidden">
              <PageHeader title="Settings" />
            </div>
          </SubSection>

          <SubSection label="With description, no breadcrumbs">
            <div className="border border-border rounded-lg overflow-hidden">
              <PageHeader
                title="Technical Scan"
                description="Automated infrastructure compliance checks"
                actions={<Button>Run Scan</Button>}
              />
            </div>
          </SubSection>
        </Section>

        {/* ── MetricCard ── */}
        <Section title="MetricCard">
          <SubSection label="Zero values (should render in navy, not semantic color)">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Critical Findings" value={0} semantic="danger" icon={<AlertTriangle size={18} />} helperText="No critical issues" />
              <MetricCard label="Warnings" value={0} semantic="warning" icon={<Shield size={18} />} helperText="No warnings" />
              <MetricCard label="Completion" value="0%" semantic="success" icon={<CheckCircle size={18} />} />
              <MetricCard label="Tasks Due" value={0} semantic="info" icon={<FileText size={18} />} />
            </div>
          </SubSection>

          <SubSection label="Non-zero values (should render in semantic color)">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Critical Findings" value={3} semantic="danger" icon={<AlertTriangle size={18} />} helperText="3 require immediate action" />
              <MetricCard label="Warnings" value={12} semantic="warning" icon={<Shield size={18} />} trend={{ direction: 'down', value: '-2' }} />
              <MetricCard label="Compliance Score" value="82.4" unit="%" semantic="success" icon={<Activity size={18} />} trend={{ direction: 'up', value: '+6.2' }} />
              <MetricCard label="Tasks Due" value={7} semantic="info" icon={<FileText size={18} />} helperText="5 due this week" />
            </div>
          </SubSection>

          <SubSection label="Plain (no semantic)">
            <div className="grid grid-cols-3 gap-4">
              <MetricCard label="Total Controls" value={25} icon={<BarChart3 size={18} />} />
              <MetricCard label="Team Members" value={8} helperText="3 pending invites" />
              <MetricCard label="Scan Duration" value="4.2" unit="min" />
            </div>
          </SubSection>
        </Section>

        {/* ── EmptyState ── */}
        <Section title="EmptyState">
          <SubSection label="Inside a card">
            <div className="bg-card border border-border rounded-lg">
              <EmptyState
                icon={<Inbox />}
                title="No campaigns yet"
                description="Create your first employee training campaign to start tracking policy acknowledgment and task completion."
                action={<Button icon={<Plus size={16} />}>New Campaign</Button>}
              />
            </div>
          </SubSection>

          <SubSection label="Minimal (no icon, no action)">
            <div className="bg-card border border-border rounded-lg">
              <EmptyState title="No results found" description="Try adjusting your search filters." />
            </div>
          </SubSection>
        </Section>

        {/* ── DataTable ── */}
        <Section title="DataTable">
          <SubSection label="With data and badges">
            <DataTable
              columns={columns}
              data={sampleData}
              keyField="id"
            />
          </SubSection>

          <SubSection label="Empty state">
            <DataTable
              columns={columns}
              data={[]}
              keyField="id"
              emptyState={
                <EmptyState
                  icon={<Search />}
                  title="No controls found"
                  description="Run a technical scan to populate your control results."
                  action={<Button size="sm">Run Scan</Button>}
                />
              }
            />
          </SubSection>

          <SubSection label="Composable sub-components">
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell align="right">Last Active</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Alice Johnson</TableCell>
                  <TableCell><Badge variant="info" size="sm">Owner</Badge></TableCell>
                  <TableCell align="right">2 hours ago</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Bob Smith</TableCell>
                  <TableCell><Badge variant="muted" size="sm">Member</Badge></TableCell>
                  <TableCell align="right">1 day ago</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </SubSection>
        </Section>

        {/* ── Badge ── */}
        <Section title="Badge">
          <SubSection label="All variants">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="default">Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="muted">Muted</Badge>
            </div>
          </SubSection>

          <SubSection label="Small size">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="default" size="sm">Default</Badge>
              <Badge variant="success" size="sm">Active</Badge>
              <Badge variant="warning" size="sm">P1</Badge>
              <Badge variant="danger" size="sm">Critical</Badge>
              <Badge variant="info" size="sm">New</Badge>
              <Badge variant="muted" size="sm">Archived</Badge>
            </div>
          </SubSection>

          <SubSection label="Use cases">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="danger">High Severity</Badge>
              <Badge variant="success">Pass</Badge>
              <Badge variant="warning">Needs Review</Badge>
              <Badge variant="info">In Progress</Badge>
              <Badge variant="muted">Draft</Badge>
            </div>
          </SubSection>
        </Section>

        {/* ── Color Tokens ── */}
        <Section title="Color Tokens">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tokenGroups.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.tokens.map((token) => (
                    <ColorSwatch key={token} token={token} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </PageContent>
    </PageContainer>
  )
}
