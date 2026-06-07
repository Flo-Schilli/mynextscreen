import * as nodemailer from 'nodemailer';
import { EmailProvider, MailOptions } from './email-provider.interface';

export interface SmtpConfig {
  host: string;
  port: number;
  user: string | null;
  password: string | null;
  secure: boolean;
  from: string;
}

export class SmtpEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth:
        config.user && config.password ? { user: config.user, pass: config.password } : undefined,
    });
  }

  async sendMail(options: MailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }
}
