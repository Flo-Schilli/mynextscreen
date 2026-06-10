export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  sendMail(options: MailOptions): Promise<void>;
}
