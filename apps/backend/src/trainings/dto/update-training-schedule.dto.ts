export class UpdateTrainingScheduleSlotDto {
  day: number;
  startTime: string;
}

export class UpdateTrainingScheduleDto {
  effectiveFrom?: string;
  slots?: UpdateTrainingScheduleSlotDto[];
}
