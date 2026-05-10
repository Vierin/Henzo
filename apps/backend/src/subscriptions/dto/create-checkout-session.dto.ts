import { IsIn, IsString } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  @IsIn(['monthly', 'annual'])
  interval: 'monthly' | 'annual';
}
