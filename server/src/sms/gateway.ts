export interface SendResult {
  accepted: boolean;
  providerMessageId?: string;
  failureReason?: string;
}

export interface SmsGateway {
  readonly name: string;
  send(to: string, body: string): Promise<SendResult>;
}
