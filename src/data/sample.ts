import { addDays, format } from 'date-fns'
import { supabase } from '@/lib/supabase'

function dateFromToday(days: number): string {
  return format(addDays(new Date(), days), 'yyyy-MM-dd')
}

interface SampleTask {
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'in_review' | 'done'
  priority: 'low' | 'normal' | 'high'
  due: number | null
  position: number
  labels: string[]
  assignees: string[]
}

const SAMPLE_TASKS: SampleTask[] = [
  {
    title: 'Fix broken avatar upload on Safari',
    description:
      'Uploads over 2 MB silently fail on Safari 17. Repro: settings → profile → upload photo. Likely the missing `content-length` header on the presigned PUT.',
    status: 'todo',
    priority: 'high',
    due: -2,
    position: 1024,
    labels: ['Bug'],
    assignees: ['Marcus Reid'],
  },
  {
    title: 'Design empty-state illustrations',
    description: 'Boards, search results, and the notifications drawer all need a friendly empty state.',
    status: 'todo',
    priority: 'normal',
    due: 4,
    position: 2048,
    labels: ['Design'],
    assignees: ['Ava Chen'],
  },
  {
    title: 'Write onboarding checklist copy',
    description: '',
    status: 'todo',
    priority: 'low',
    due: 8,
    position: 3072,
    labels: [],
    assignees: [],
  },
  {
    title: 'Interview five churned customers',
    description: 'Focus on teams that left in the first 30 days. What did they expect that we never showed them?',
    status: 'todo',
    priority: 'normal',
    due: null,
    position: 4096,
    labels: ['Research'],
    assignees: ['Priya Patel'],
  },
  {
    title: 'Build billing settings page',
    description:
      'Plan picker, payment method management, and invoice history. Stripe customer portal covers the rest for v1.',
    status: 'in_progress',
    priority: 'high',
    due: 2,
    position: 1024,
    labels: ['Feature'],
    assignees: ['Marcus Reid', 'Ava Chen'],
  },
  {
    title: 'Refresh marketing site hero',
    description: 'New product screenshots plus the revised tagline from the brand workshop.',
    status: 'in_progress',
    priority: 'normal',
    due: 0,
    position: 2048,
    labels: ['Design'],
    assignees: ['Priya Patel'],
  },
  {
    title: 'Migrate image pipeline to WebP',
    description: 'Cuts median page weight by ~38% in the prototype. Needs a fallback for legacy Safari.',
    status: 'in_review',
    priority: 'normal',
    due: 1,
    position: 1024,
    labels: ['Feature'],
    assignees: ['Marcus Reid'],
  },
  {
    title: 'Set up error monitoring',
    description: 'Sentry wired into the frontend and edge functions with release tagging.',
    status: 'done',
    priority: 'normal',
    due: null,
    position: 1024,
    labels: ['Feature'],
    assignees: ['Ava Chen'],
  },
  {
    title: 'Ship dark mode',
    description: 'Token-driven theming with a persisted toggle. Went out in 1.42.',
    status: 'done',
    priority: 'high',
    due: -6,
    position: 2048,
    labels: ['Design', 'Feature'],
    assignees: ['Priya Patel', 'Ava Chen'],
  },
]

export async function seedSampleBoard(): Promise<void> {
  const { data: members, error: membersError } = await supabase
    .from('team_members')
    .insert([
      { name: 'Ava Chen', color: '#4338ca' },
      { name: 'Marcus Reid', color: '#0f766e' },
      { name: 'Priya Patel', color: '#be185d' },
    ])
    .select('id, name')
  if (membersError) throw new Error(membersError.message)

  const { data: labels, error: labelsError } = await supabase
    .from('labels')
    .insert([
      { name: 'Feature', color: '#1d4ed8' },
      { name: 'Bug', color: '#b91c1c' },
      { name: 'Design', color: '#6d28d9' },
      { name: 'Research', color: '#15803d' },
    ])
    .select('id, name')
  if (labelsError) throw new Error(labelsError.message)

  const memberIdByName = new Map(members.map((m) => [m.name, m.id]))
  const labelIdByName = new Map(labels.map((l) => [l.name, l.id]))

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .insert(
      SAMPLE_TASKS.map((task) => ({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.due === null ? null : dateFromToday(task.due),
        position: task.position,
      })),
    )
    .select('id, title')
  if (tasksError) throw new Error(tasksError.message)

  const taskIdByTitle = new Map(tasks.map((t) => [t.title, t.id]))

  const labelRows: { task_id: string; label_id: string }[] = []
  const assigneeRows: { task_id: string; member_id: string }[] = []
  for (const task of SAMPLE_TASKS) {
    const taskId = taskIdByTitle.get(task.title)
    if (!taskId) continue
    for (const labelName of task.labels) {
      const labelId = labelIdByName.get(labelName)
      if (labelId) labelRows.push({ task_id: taskId, label_id: labelId })
    }
    for (const memberName of task.assignees) {
      const memberId = memberIdByName.get(memberName)
      if (memberId) assigneeRows.push({ task_id: taskId, member_id: memberId })
    }
  }

  if (labelRows.length > 0) {
    const { error } = await supabase.from('task_labels').insert(labelRows)
    if (error) throw new Error(error.message)
  }
  if (assigneeRows.length > 0) {
    const { error } = await supabase.from('task_assignees').insert(assigneeRows)
    if (error) throw new Error(error.message)
  }

  const billingTaskId = taskIdByTitle.get('Build billing settings page')
  if (billingTaskId) {
    const { error } = await supabase.from('comments').insert([
      { task_id: billingTaskId, body: 'Stripe test keys are in the shared vault — ping me if you need access.' },
      { task_id: billingTaskId, body: 'Tax rows land tomorrow; the UI can stub them until then.' },
    ])
    if (error) throw new Error(error.message)
  }
}
