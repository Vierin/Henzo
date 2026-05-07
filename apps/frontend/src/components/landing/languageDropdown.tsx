'use client';

import { ChevronDown } from 'lucide-react';

export type LanguageOption = {
	code: 'en' | 'ru' | 'vi';
	name: string;
	flag: string;
};

type LanguageDropdownProps = {
	dropdownRef: React.RefObject<HTMLDivElement | null>;
	isOpen: boolean;
	selectedLanguage: string;
	languages: readonly LanguageOption[];
	onToggle: () => void;
	onSelect: (language: LanguageOption) => void;
	buttonClassName: string;
};

export function LanguageDropdown({
	dropdownRef,
	isOpen,
	selectedLanguage,
	languages,
	onToggle,
	onSelect,
	buttonClassName,
}: LanguageDropdownProps) {
	return (
		<div className="relative" ref={dropdownRef}>
			<button
				type="button"
				onClick={onToggle}
				className={buttonClassName}
				aria-expanded={isOpen}
				aria-haspopup="listbox"
			>
				<span>{selectedLanguage}</span>
				<ChevronDown
					className={`h-3.5 w-3.5 shrink-0 transition-transform sm:h-4 sm:w-4 ${
						isOpen ? 'rotate-180' : ''
					}`}
				/>
			</button>

			{isOpen && (
				<div
					className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-[#eadfd7] bg-white sm:w-48"
					role="listbox"
				>
					{languages.map((language) => (
						<button
							key={language.code}
							type="button"
							role="option"
							aria-selected={selectedLanguage === language.code.toUpperCase()}
							onClick={() => onSelect(language)}
							className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition sm:gap-3 sm:px-4 sm:py-3 ${
								selectedLanguage === language.code.toUpperCase()
									? 'bg-[#E86D4F] text-white hover:bg-[#d85e42]'
									: 'text-[#3F3F3F] hover:bg-[#F9F4F0]'
							}`}
						>
							<span className="text-base sm:text-lg">{language.flag}</span>
							<span className="font-medium">{language.name}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
