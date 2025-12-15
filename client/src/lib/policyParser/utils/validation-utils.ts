export const isNonEmptyString = (value: unknown): value is string => 
    typeof value === 'string' && value.trim().length > 0;

export const isNonEmptyArray = <T>(value: unknown): value is T[] => 
    Array.isArray(value) && value.length > 0;
