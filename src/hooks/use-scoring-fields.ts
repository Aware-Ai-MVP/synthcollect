/**
 * Hook to load configurable AI scoring fields with proper type export
 * @filepath src/hooks/use-scoring-fields.ts
 */

import { useState, useEffect } from 'react';
import scoringFieldsConfig from '@/lib/config/scoring-fields.json';

export interface ScoringField {
  name: string;
  type: string;
  min: number;
  max: number;
  description: string;
  required: boolean;
}

export function useScoringFields(): ScoringField[] {
  const [fields, setFields] = useState<ScoringField[]>([]);
  
  useEffect(() => {
    // Load fields from config
    setFields(scoringFieldsConfig.fields);
  }, []);
  
  return fields;
}