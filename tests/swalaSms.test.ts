import { sendSwalaSms, SwalaSmsError } from '../src/features/sms/swala';

const config = { apiKey: 'test-key', senderId: 'POST' };
const input = {
  recipient: '+255712345678',
  body: 'It is time for your check-in.',
  idempotencyKey: 'reminder:patient-1:2026-08-31',
};

describe('Swala SMS adapter', () => {
  it('sends the documented quick-message request', async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'message-1', status: 'queued' }),
    });

    await expect(sendSwalaSms(config, input, fetcher)).resolves.toEqual({
      id: 'message-1',
      status: 'queued',
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://swalasms.com/api/v1/sms/quick-message',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
          'Idempotency-Key': input.idempotencyKey,
        },
        body: JSON.stringify({
          recipient: input.recipient,
          sender_id: 'POST',
          body: input.body,
        }),
      }),
    );
  });

  it('rejects invalid phone numbers before making a request', async () => {
    const fetcher = jest.fn();
    await expect(
      sendSwalaSms(config, { ...input, recipient: '0712345678' }, fetcher),
    ).rejects.toThrow('E.164');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns a redacted provider error', async () => {
    const fetcher = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    await expect(sendSwalaSms(config, input, fetcher)).rejects.toEqual(new SwalaSmsError(401));
  });
});
