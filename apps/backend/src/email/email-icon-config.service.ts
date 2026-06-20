import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  configureEmailIconBaseUrl,
  resolveEmailIconBaseUrl,
} from './templates/email-layout.helpers';

@Injectable()
export class EmailIconConfigService implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    configureEmailIconBaseUrl(
      resolveEmailIconBaseUrl({
        emailIconBaseUrl: this.config.get<string>('EMAIL_ICON_BASE_URL'),
        frontendUrl: this.config.get<string>('FRONTEND_URL'),
        backendUrl: this.config.get<string>('BACKEND_URL'),
      }),
    );
  }
}
