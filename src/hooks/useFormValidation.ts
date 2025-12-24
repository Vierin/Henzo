import { useState, useCallback } from 'react';
import { validateForm, validationSchemas, ValidationResult } from '@/utils/validationSchemas';

export function useFormValidation<T extends Record<string, any>>(
	initialData: T,
	rules: Record<keyof T, Array<(value: any) => string | null>>
) {
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [data, setData] = useState<T>(initialData);

	const validate = useCallback((): ValidationResult => {
		const result = validateForm(data, rules);
		setErrors(result.errors);
		return result;
	}, [data, rules]);

	const validateField = useCallback(
		(field: keyof T): boolean => {
			const fieldRules = rules[field];
			if (!fieldRules) return true;

			for (const rule of fieldRules) {
				const error = rule(data[field]);
				if (error) {
					setErrors((prev) => ({ ...prev, [field as string]: error }));
					return false;
				}
			}

			// Clear error if validation passes
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors[field as string];
				return newErrors;
			});
			return true;
		},
		[data, rules]
	);

	const setFieldValue = useCallback((field: keyof T, value: any) => {
		setData((prev) => ({ ...prev, [field]: value }));
		// Clear error when field changes
		setErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors[field as string];
			return newErrors;
		});
	}, []);

	const setFieldError = useCallback((field: keyof T, error: string) => {
		setErrors((prev) => ({ ...prev, [field as string]: error }));
	}, []);

	const clearErrors = useCallback(() => {
		setErrors({});
	}, []);

	const reset = useCallback((newData?: T) => {
		setData(newData || initialData);
		setErrors({});
	}, [initialData]);

	return {
		data,
		errors,
		setData,
		validate,
		validateField,
		setFieldValue,
		setFieldError,
		clearErrors,
		reset,
	};
}

