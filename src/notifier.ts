import { Config } from './config';
import Pusher from 'pushbullet';

export class Notifier {
  constructor(config: Config) {
    if (!config.pushbulletAuthKey) {
      throw new Error(
        'Pushbullet auth key not provided, Notifier cannot be used'
      );
    }
    this.pusher = new Pusher(config.pushbulletAuthKey);
  }

  private pusher: Pusher;

  private async getDevices() {
    return this.pusher
      .devices()
      .then((res) => res.json())
      .then((res) => res.devices);
  }

  async sendMessage(title: string, message: string) {
    (await this.getDevices())
      .filter((device) => device.iden !== undefined)
      .forEach((device) => {
        this.pusher.note(device.iden, title, message);
      });
  }
}
