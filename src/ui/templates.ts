/**
 * Mustache templates for session management
 */

export const SESSION_LIST_TEMPLATE = `{{^sessions}}
No sessions found.
{{/sessions}}
{{#sessions.length}}
| Last Activity | Messages | Thread ID |
|---------------|----------|-----------|
{{#sessions}}
| {{formattedLastActivity}} | {{messageCount}} | {{threadId}} |
{{/sessions}}

**Total:** {{totalSessions}} sessions, {{totalMessages}} messages
**Database**: \`{{database}}\`
{{/sessions.length}}`;

export const SESSION_DETAIL_TEMPLATE = `
**Database:** \`{{database}}\`
**Thread ID:** \`{{{threadId}}}\`
**Messages:** {{messageCount}}  
**Created:** {{formattedCreated}}  
**Last Activity:** {{formattedLastActivity}}  

---

{{#messages}}
| {{type}} |
|----------|

{{{content}}}
{{/messages}}

---
**Duration:** {{duration}}`;

export const CHECKPOINT_LIST_TEMPLATE = `{{^checkpoints}}
No checkpoints found for session '{{sessionName}}'.
{{/checkpoints}}
**Database**: \`{{database}}\`
{{#checkpoints.length}}
| Timestamp | Messages | Checkpoint ID |
|-----------|----------|---------------|
{{#checkpoints}}
| {{formattedTimestamp}} | {{messageCount}} | {{id}} |
{{/checkpoints}}
{{/checkpoints.length}}`;