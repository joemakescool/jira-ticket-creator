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
}

export const PRIMARY_WRITING_STYLES: WritingStyleConfig[] = [
  { value: 'concise', label: 'Concise', icon: AlignLeft, description: 'Brief and to the point' },
  { value: 'technical', label: 'Technical', icon: Code2, description: 'Implementation-focused with technical details' },
  { value: 'user-story', label: 'User Story', icon: User, description: 'As a [role], I want [feature], so that [benefit]' },
];

export const SECONDARY_WRITING_STYLES: WritingStyleConfig[] = [
  { value: 'detailed', label: 'Detailed', icon: AlignJustify, description: 'Thorough with edge cases' },
  { value: 'business', label: 'Business', icon: Briefcase, description: 'Customer impact & ROI focus' },
  { value: 'acceptance', label: 'Criteria', icon: ListChecks, description: 'Heavy on acceptance criteria' },
];

export const WRITING_STYLES: WritingStyleConfig[] = [...PRIMARY_WRITING_STYLES, ...SECONDARY_WRITING_STYLES];

export const DRAFT_SAVE_DELAY = 2000;
export const TITLE_GENERATION_DELAY = 1000;
export const MIN_DESCRIPTION_FOR_TITLE = 20;
