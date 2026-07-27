import { errorMessage } from './utils'

const CONSTRAINT_MESSAGES: [string, string][] = [
  ['tasks_title_check', 'A card title must be between 1 and 500 characters.'],
  ['tasks_description_check', 'A card description must be 20,000 characters or fewer.'],
  ['comments_body_check', 'A comment must be between 1 and 5,000 characters.'],
  ['team_members_name_check', 'A member name must be between 1 and 80 characters.'],
  ['team_members_user_name_key', 'A member with that name already exists.'],
  ['labels_name_check', 'A label name must be between 1 and 40 characters.'],
  ['labels_user_name_key', 'A label with that name already exists.'],
  ['task_assignees_pkey', 'That member is already assigned to this card.'],
  ['task_labels_pkey', 'That label is already on this card.'],
  ['color_check', 'Pick a color from the palette.'],
]

export function friendlyError(error: unknown, fallback: string): string {
  const raw = errorMessage(error, fallback)
  for (const [needle, message] of CONSTRAINT_MESSAGES) {
    if (raw.includes(needle)) return message
  }
  if (/violates foreign key constraint/i.test(raw)) {
    return 'Something it referred to was deleted. Refresh and try again.'
  }
  if (/failed to fetch|networkerror|network request failed/i.test(raw)) {
    return 'You appear to be offline. Check your connection and try again.'
  }
  if (/violates .*constraint|relation "|column "/i.test(raw)) return fallback
  return raw
}
