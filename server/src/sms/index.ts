import { config } from '../config.js';
import { AfricasTalkingGateway } from './africastalking.js';
import { FakeSmsGateway } from './fake.js';
import type { SmsGateway } from './gateway.js';

let gateway: SmsGateway =
  config.sms.gateway === 'africastalking' ? new AfricasTalkingGateway() : new FakeSmsGateway();

export function smsGateway(): SmsGateway {
  return gateway;
}

/** Tests and the demo swap the gateway in. */
export function setSmsGateway(next: SmsGateway) {
  gateway = next;
}

export { FakeSmsGateway };
export type { SmsGateway };
