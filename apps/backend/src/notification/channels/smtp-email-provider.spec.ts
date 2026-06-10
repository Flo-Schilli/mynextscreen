import * as nodemailer from 'nodemailer';
import { SmtpEmailProvider, SmtpConfig } from './smtp-email-provider';

jest.mock('nodemailer');

describe('SmtpEmailProvider', () => {
  const mockSendMail = jest.fn();
  const mockCreateTransport = nodemailer.createTransport as jest.Mock;

  const smtpConfig: SmtpConfig = {
    host: 'smtp.example.com',
    port: 587,
    user: 'user@example.com',
    password: 'secret',
    secure: false,
    from: 'noreply@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });
    mockSendMail.mockResolvedValue({ messageId: 'test-id' });
  });

  it('should create a transporter with the provided config', () => {
    new SmtpEmailProvider(smtpConfig);

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: { user: 'user@example.com', pass: 'secret' },
    });
  });

  it('should omit auth when user and password are null', () => {
    new SmtpEmailProvider({ ...smtpConfig, user: null, password: null });

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: undefined,
    });
  });

  it('should send an email with correct options', async () => {
    const provider = new SmtpEmailProvider(smtpConfig);

    await provider.sendMail({
      to: 'recipient@example.com',
      subject: 'Test Subject',
      text: 'Test body',
      html: '<p>Test body</p>',
    });

    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'noreply@example.com',
      to: 'recipient@example.com',
      subject: 'Test Subject',
      text: 'Test body',
      html: '<p>Test body</p>',
    });
  });

  it('should propagate errors from transporter', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));

    const provider = new SmtpEmailProvider(smtpConfig);

    await expect(
      provider.sendMail({
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Body',
      }),
    ).rejects.toThrow('SMTP connection failed');
  });
});
