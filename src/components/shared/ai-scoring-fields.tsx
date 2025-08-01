/**
 * Reusable AI scoring fields component for upload and edit modes
 * @filepath src/components/shared/ai-scoring-fields.tsx
 */

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Info } from 'lucide-react';
import { useScoringFields } from '@/hooks/use-scoring-fields';

interface AIScoreState {
  value: number;
  isManual: boolean;
}

interface AIScoringFieldsProps {
  initialScores?: Record<string, number>;
  onChange: (scores: Record<string, number>, manualFields: string[]) => void;
  mode: 'upload' | 'edit';
}

export function AIScoringFields({ initialScores = {}, onChange, mode }: AIScoringFieldsProps) {
  const scoringFields = useScoringFields();

  // Initialize state based on mode and initial scores
  const [fieldStates, setFieldStates] = useState<Record<string, AIScoreState>>(() => {
    const states: Record<string, AIScoreState> = {};
    scoringFields.forEach(field => {
      if (mode === 'edit' && field.name in initialScores) {
        states[field.name] = {
          value: initialScores[field.name],
          isManual: true,
        };
      } else {
        states[field.name] = {
          value: field.min,
          isManual: false,
        };
      }
    });
    return states;
  });

  // Helper to notify parent only on user action
  const notifyParent = (states: Record<string, AIScoreState>) => {
    const manualScores: Record<string, number> = {};
    const manualFields: string[] = [];
    Object.entries(states).forEach(([fieldName, state]) => {
      if (state.isManual) {
        manualScores[fieldName] = state.value;
        manualFields.push(fieldName);
      }
    });
    onChange(manualScores, manualFields);
  };

  const toggleFieldMode = (fieldName: string) => {
    setFieldStates(prev => {
      const field = scoringFields.find(f => f.name === fieldName);
      if (!field) return prev;
      const currentState = prev[fieldName] ?? { value: field.min, isManual: false };
      const newIsManual = !currentState.isManual;
      const newStates = {
        ...prev,
        [fieldName]: {
          value: newIsManual ? (initialScores[fieldName] ?? field.min) : field.min,
          isManual: newIsManual,
        },
      };
      notifyParent(newStates);
      return newStates;
    });
  };

  const updateFieldValue = (fieldName: string, value: number) => {
    setFieldStates(prev => {
      const field = scoringFields.find(f => f.name === fieldName);
      if (!field) return prev;
      const currentState = prev[fieldName] ?? { value: field.min, isManual: false };
      const newStates = {
        ...prev,
        [fieldName]: {
          ...currentState,
          value,
        },
      };
      notifyParent(newStates);
      return newStates;
    });
  };

  if (scoringFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Info className="h-4 w-4" />
        AI Scoring Fields
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {mode === 'upload'
          ? 'Toggle switches to manually set values or let AI determine them later'
          : 'Adjust values manually or switch to AI determination'
        }
      </p>

      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4 border border-gray-200 dark:border-gray-700">
        {scoringFields.map((field) => {
          const state = fieldStates[field.name] || { value: field.min, isManual: false };

          return (
            <div key={field.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm dark:text-gray-300">
                  {field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {state.isManual ? 'Manual' : 'AI decides'}
                  </span>
                  <Switch
                    checked={state.isManual}
                    onCheckedChange={() => toggleFieldMode(field.name)}
                    className="cursor-pointer"
                    aria-label={`Toggle ${field.name} mode`}
                  />
                </div>
              </div>

              {state.isManual ? (
                <div className="flex items-center gap-3">
                  <Slider
                    min={field.min}
                    max={field.max}
                    step={0.1}
                    value={[state.value]}
                    onValueChange={([v]) => updateFieldValue(field.name, v)}
                    className="flex-1 cursor-pointer"
                    disabled={false}
                  />
                  <span className="text-sm font-medium w-12 text-right dark:text-gray-300 tabular-nums">
                    {state.value.toFixed(1)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center py-3 px-4 bg-gray-100 dark:bg-gray-800 rounded-md">
                  <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                    AI will determine this value
                  </span>
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                {field.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}