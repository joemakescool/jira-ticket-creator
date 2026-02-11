/**
 * Constants for JiraTicketCreator
 * Centralized configuration for reusability
 */

import { CheckSquare, FileText, Bug, Zap, Upload, TrendingUp, AlertCircle, AlertTriangle, Flame, Layout, LayoutGrid, AlignLeft, AlignJustify, Code2, Briefcase, User, ListChecks } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RefinementStyle } from '../../types/ticket';

export const COMMON_LABELS = [
  'frontend', 'backend', 'api', 'database', 'security', 'performance',
  'ui', 'ux', 'testing', 'documentation', 'refactor', 'hotfix',
  'feature', 'improvement', 'tech-debt', 'integration', 'mobile',
  'web', 'authentication', 'authorization', 'deployment', 'monitoring'
] as const;

export interface TicketTypeConfig {
  value: 'Task' | 'Story' | 'Bug' | 'Spike' | 'Epic';
  icon: LucideIcon;
  color: string;
}

export const TICKET_TYPES: TicketTypeConfig[] = [
  { value: 'Task', icon: CheckSquare, color: 'blue' },
  { value: 'Story', icon: FileText, color: 'green' },
  { value: 'Bug', icon: Bug, color: 'red' },
  { value: 'Spike', icon: Zap, color: 'purple' },
  { value: 'Epic', icon: Upload, color: 'orange' }
];

export interface PriorityConfig {
  name: 'Low' | 'Medium' | 'High' | 'Critical';
  icon: LucideIcon;
  color: string;
}

export const PRIORITIES: PriorityConfig[] = [
  { name: 'Low', icon: TrendingUp, color: 'green' },
  { name: 'Medium', icon: AlertCircle, color: 'yellow' },
  { name: 'High', icon: AlertTriangle, color: 'orange' },
  { name: 'Critical', icon: Flame, color: 'red' }
];

export interface TemplateConfig {
  name: 'Basic' | 'Detailed';
  icon: LucideIcon;
  description: string;
}

export const TEMPLATES: TemplateConfig[] = [
  { name: 'Basic', icon: Layout, description: 'Simple & concise' },
  { name: 'Detailed', icon: LayoutGrid, description: 'Comprehensive details' }
];

export interface WritingStyleConfig {
  value: RefinementStyle;
  label: string;
  icon: LucideIcon;
  description: string;
  example: string;
}

export const PRIMARY_WRITING_STYLES: WritingStyleConfig[] = [
  {
    value: 'concise',
    label: 'Concise',
    icon: AlignLeft,
    description: 'Brief and to the point',
    example: 'Fix password reset link expiration.\nLinks expire immediately after being sent.\nExpected: links valid for 24 hours.',
  },
  {
    value: 'technical',
    label: 'Technical',
    icon: Code2,
    description: 'Implementation-focused with technical details',
    example: 'Issue: PasswordResetToken.expiry set to\nDateTime.now() instead of\nDateTime.now().addHours(24) in\nAuthService.generateResetToken().',
  },
  {
    value: 'user-story',
    label: 'User Story',
    icon: User,
    description: 'As a [role], I want [feature], so that [benefit]',
    example: 'As a user, I want password reset links to\nremain valid for 24 hours, so that I can\nreset my password without rushing.',
  },
];

export const SECONDARY_WRITING_STYLES: WritingStyleConfig[] = [
  {
    value: 'detailed',
    label: 'Detailed',
    icon: AlignJustify,
    description: 'Thorough with edge cases',
    example: 'Context: Password reset is critical flow.\nProblem: No self-service recovery path.\nProposed: Email-based reset with\ntime-limited tokens and rate limiting.',
  },
  {
    value: 'business',
    label: 'Business',
    icon: Briefcase,
    description: 'Customer impact & ROI focus',
    example: 'Impact: Password reset failures account for\n23% of support tickets ($4.2K/month).\nSuccess: Reduce support tickets by 40%.',
  },
  {
    value: 'acceptance',
    label: 'Criteria',
    icon: ListChecks,
    description: 'Heavy on acceptance criteria',
    example: '- [ ] Valid email receives reset link in 30s\n- [ ] Invalid email shows generic message\n- [ ] Link expires after 24h\n- [ ] Used link cannot be reused',
  },
];

export const WRITING_STYLES: WritingStyleConfig[] = [...PRIMARY_WRITING_STYLES, ...SECONDARY_WRITING_STYLES];

// Adaptive form field hints per ticket type
export interface TicketTypeHint {
  placeholder: string;
  hint: string;
  structuredPrompts?: { label: string; placeholder: string }[];
}

export const TICKET_TYPE_HINTS: Record<string, TicketTypeHint> = {
  Task: {
    placeholder: 'Describe the task to be completed...',
    hint: '',
  },
  Bug: {
    placeholder: 'Describe the bug you encountered...',
    hint: 'Consider including steps to reproduce, expected behavior, and actual behavior.',
    structuredPrompts: [
      { label: 'Steps to Reproduce', placeholder: '1. Go to...\n2. Click on...\n3. Observe...' },
      { label: 'Expected Behavior', placeholder: 'What should happen?' },
      { label: 'Actual Behavior', placeholder: 'What actually happens?' },
    ],
  },
  Story: {
    placeholder: "Describe the feature from the user's perspective...",
    hint: '',
    structuredPrompts: [
      { label: 'As a', placeholder: 'type of user' },
      { label: 'I want', placeholder: 'some feature or capability' },
      { label: 'So that', placeholder: 'some benefit or value' },
    ],
  },
  Epic: {
    placeholder: 'Describe the high-level initiative...',
    hint: 'Consider describing the high-level goal, scope, and key deliverables.',
  },
  Spike: {
    placeholder: 'Describe what you need to investigate...',
    hint: 'What question or uncertainty are you investigating? What\'s the timebox?',
  },
};

export const DRAFT_SAVE_DELAY = 2000;
export const TITLE_GENERATION_DELAY = 1000;
export const MIN_DESCRIPTION_FOR_TITLE = 20;
