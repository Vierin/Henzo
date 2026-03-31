type ClassValue =
	| string
	| number
	| boolean
	| undefined
	| null
	| { [key: string]: boolean | undefined | null }
	| ClassValue[];

export function cn(...inputs: ClassValue[]): string {
	const classes: string[] = [];

	inputs.forEach((input) => {
		if (!input) return;

		if (typeof input === 'string' || typeof input === 'number') {
			classes.push(String(input));
		} else if (Array.isArray(input)) {
			const result = cn(...input);
			if (result) classes.push(result);
		} else if (typeof input === 'object') {
			Object.entries(input).forEach(([key, value]) => {
				if (value) classes.push(key);
			});
		}
	});

	return classes.join(' ').trim();
}

// Simple cva replacement
type VariantConfig = {
	variants: Record<string, Record<string, string>>;
	defaultVariants?: Record<string, string>;
};

export function cva(baseClass: string, config?: VariantConfig) {
	return (
		props?: Record<string, string | undefined> & { className?: string }
	) => {
		if (!config || !props) return cn(baseClass, props?.className);

		const variantClasses: string[] = [];

		Object.entries(config.variants).forEach(([variantKey, variantValues]) => {
			const selectedVariant =
				props[variantKey] || config.defaultVariants?.[variantKey];
			if (selectedVariant && variantValues[selectedVariant]) {
				variantClasses.push(variantValues[selectedVariant]);
			}
		});

		return cn(baseClass, ...variantClasses, props.className);
	};
}

export type VariantProps<T extends (...args: any) => any> = Partial<
	Parameters<T>[0]
>;
