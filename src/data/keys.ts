export const queryKeys = {
  tasks: ['tasks'] as const,
  members: ['members'] as const,
  labels: ['labels'] as const,
  allComments: ['comments'] as const,
  comments: (taskId: string) => ['comments', taskId] as const,
  allActivity: ['activity'] as const,
  activity: (taskId: string) => ['activity', taskId] as const,
}
