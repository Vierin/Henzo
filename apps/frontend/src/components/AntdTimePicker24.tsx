'use client';

import { useEffect, useRef, useState } from 'react';
import { TimePicker } from 'antd';
import type { TimePickerProps } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

type MinuteStep = NonNullable<TimePickerProps['minuteStep']>;

function parseTimeToDayjs(timeStr: string): Dayjs | null {
	if (!timeStr || !timeStr.includes(':')) return null;
	const [hours, minutes] = timeStr.split(':').map(Number);
	return dayjs().hour(hours).minute(minutes).second(0).millisecond(0);
}

function formatDayjsToTime(time: Dayjs | null): string {
	if (!time) return '';
	return time.format('HH:mm');
}

export type AntdTimePicker24Props = {
	value: string;
	onChange: (value: string) => void;
	className?: string;
	placeholder?: string;
	minuteStep?: MinuteStep;
	style?: React.CSSProperties;
};

/**
 * 24h TimePicker: закрывает дропдаун, когда изменилась минута (час можно сменить без закрытия).
 */
export default function AntdTimePicker24({
	value,
	onChange,
	className = '',
	placeholder = '09:00',
	minuteStep = 5 as MinuteStep,
	style = { width: '100%', minWidth: '80px', maxWidth: '120px' },
}: AntdTimePicker24Props) {
	const [open, setOpen] = useState(false);
	const prevValueRef = useRef<Dayjs | null>(null);

	useEffect(() => {
		prevValueRef.current = parseTimeToDayjs(value);
	}, [value]);

	const handleChange = (time: Dayjs | null) => {
		if (!time) {
			onChange('');
			setOpen(false);
			prevValueRef.current = null;
			return;
		}

		const prev = prevValueRef.current;
		onChange(formatDayjsToTime(time));

		if (prev && time.minute() !== prev.minute()) {
			setOpen(false);
		}
		prevValueRef.current = time;
	};

	return (
		<div className={className} style={{ width: '100%', minWidth: '80px' }}>
			<TimePicker
				value={parseTimeToDayjs(value)}
				onChange={handleChange}
				open={open}
				onOpenChange={setOpen}
				format="HH:mm"
				placeholder={placeholder}
				needConfirm={true}
				minuteStep={minuteStep}
				inputReadOnly
				className="custom-time-picker"
				style={style}
			/>
		</div>
	);
}
