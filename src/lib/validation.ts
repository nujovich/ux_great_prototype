export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateBeforeSave(line: { spDate?: string }): ValidationResult {
  const errors: string[] = [];

  if (!line.spDate?.trim()) {
    errors.push('SP Date es obligatorio antes de guardar (BR-08).');
  }

  return { valid: errors.length === 0, errors };
}
