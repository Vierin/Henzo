import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ServiceUnavailableException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';

const contactValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  exceptionFactory: (errors) => {
    const result = errors.map((error) => ({
      property: error.property,
      value: error.value,
      constraints: error.constraints,
    }));
    return new BadRequestException({
      message: 'Validation failed',
      errors: result,
    });
  },
});

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post('send-message')
  @HttpCode(HttpStatus.OK)
  @UsePipes(contactValidationPipe)
  async sendMessage(@Body() contactDto: ContactDto) {
    try {
      return await this.contactService.sendMessage(contactDto);
    } catch (error) {
      console.error('Contact form error:', error);
      throw new BadRequestException(
        error.message || 'Failed to send message. Please try again.',
      );
    }
  }

  @Post('feedback')
  @HttpCode(HttpStatus.OK)
  @UsePipes(contactValidationPipe)
  async sendAppFeedback(@Body() contactDto: ContactDto) {
    try {
      return await this.contactService.sendAppFeedback(contactDto);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      console.error('App feedback error:', error);
      throw new BadRequestException(
        error.message || 'Failed to send feedback. Please try again.',
      );
    }
  }
}
