declare module 'pushbullet' {
  import { EventEmitter } from 'events';
  import { Response } from 'node-fetch';

  interface MakeRequestOptions<T> {
    qs?: Record<string, string>;
    json?: T;
  }

  export interface MeResponse {
    created: number;
    email: string;
    email_normalized: string;
    iden: string;
    image_url: string;
    max_upload_size: number;
    modified: number;
    name: string;
  }

  export interface Device {
    /* false if the item has been deleted */
    active: boolean;
    /* 	Version of the Pushbullet application installed on the device */
    app_version: number;
    /* Creation time in floating point seconds (unix timestamp) */
    created: number;
    /* Unique identifier for this object */
    iden: string;
    /* 	Manufacturer of the device */
    manufacturer: string;
    /* 	Model of the device */
    model: string;
    /* 	Last modified time in floating point seconds (unix timestamp) */
    modified: number;
    /* 	Name to use when displaying the device */
    nickname: string;
    /* Platform-specific push token. If you are making your own device, leave this blank and you can listen for events on the [Realtime Event Stream](https://docs.pushbullet.com/#realtime-event-stream). */
    push_token: string;
  }

  export interface FeedFilter {
    field: string;
    operatior: string;
    value: string;
    not: boolean;
    ignore_case: boolean;
  }

  export interface CreateChannelOptions {
    tag: string;
    name: string;
    description: string;
    image_url: string;
    website_url: string;
    feed_url: string;
    feed_filters: [FeedFilter];
    subscribe: boolean;
  }

  export interface Channel {
    active: boolean;
    created: number;
    description: string;
    iden: string;
    image_url: string;
    modified: number;
    name: string;
    tag: string;
  }

  export interface Push {
    iden: string;
    active: boolean;
    created: number;
    modified: number;
    type: string;
    dismissed: boolean;
    guid: string;
    direction: string;
    sender_iden: string;
    sender_email: string;
    sender_email_normalized: string;
    sender_name: string;
    receiver_iden: string;
    receiver_email: string;
    receiver_email_normalized: string;
    target_device_iden: string;
    source_device_iden: string;
    client_iden: string;
    channel_iden: string;
    awake_app_guids: [string];
    title: string;
    body: string;
    url: string;
    file_name: string;
    file_type: string;
    file_url: string;
    image_url: string;
    image_width: number;
    image_height: number;
  }

  export interface ChannelInfo {
    iden: string;
    name: string;
    description: string;
    image_url: string;
    subscriber_count: string;
    tag: string;
    recent_pushes: [Push];
  }

  interface ChatsOptions {}

  interface ChatsReponse {}

  interface CreateChatResponse {}

  interface MuteChatResponse {}

  interface UnmuteChatReponse {}

  interface UpdateChatOptions {}

  interface UpdateChatResponse {}

  interface DeleteChatResponse {}

  interface UpdateDeviceOptions {}

  interface UpdateDeviceResponse {}

  interface EphemeralOptions<T> {}

  interface SendSMS {}

  interface SendEphemeral<T> {}

  interface SMS {}

  interface SendClipboard {}

  interface DismissEphemeral {}

  interface Dismissal {}

  interface PushResponse<T> {}

  interface Note {}

  interface Link {}

  interface GetPushHistoryOptions {
    modified_after?: string;
    active?: string;
    cursor?: string;
    limit?: number;
  }

  interface DismissPushResponse {}

  interface UpdatePushOptions {}

  interface UpdateResponse {}

  interface DeletePushResponse {}

  interface DeleteAllPushesResponse {}

  interface GetSubscriptionsOptions {}

  interface GetSubscriptionsResponse {}

  interface SubscribeResponse {}

  interface UnsubscribeResponse {}

  interface MuteSubscriptionResponse {}

  interface UnmuteSubscriptionResponse {}

  interface UpdateSubscriptionResponse {}

  interface CreateTextResponse {}

  interface SubscriptionUpdates {}

  interface TextOptions {}

  interface UpdateTextResponse {}

  interface DeleteTextResponse {}

  export interface MakeRequestResponse<T> extends Response {
    json(): Promise<T>;
  }

  export interface DeviceResponse extends MakeRequestResponse<Device> {}

  export interface ListRequestResponse
    extends MakeRequestResponse<ListResponse> {}

  export interface CreateChannelResponse extends MakeRequestResponse<Channel> {}

  export interface ChannelInfoResponse
    extends MakeRequestResponse<ChannelInfo> {}

  export interface EncryptedPush {
    encrypted?: boolean;
    ciphertext?: boolean;
  }

  export interface PushBulletEvent<T> {
    type: PushType;
    subtype?: SubType;
    push?: EncryptedPush | T;
  }

  export type DeviceParams = string | number | object;

  export interface DevicesOptions {
    active?: boolean;
    limit?: number;
    cursor?: number;
  }

  export interface CreateDeviceOptions {
    /* 	Name to use when displaying the device */
    nickname: string;
    /* 	Model of the device */
    model?: string;
    /* 	Manufacturer of the device */
    manufacturer?: string;
    /* Platform-specific push token. If you are making your own device, leave this blank and you can listen for events on the [Realtime Event Stream](https://docs.pushbullet.com/#realtime-event-stream). */
    push_token?: string;
    /* 	Version of the Pushbullet application installed on the device */
    app_version?: number;
    /* 	Icon to use for this device, can be an arbitrary string. Commonly used values are: "desktop", "browser", "website", "laptop", "tablet", "phone", "watch", "system" */
    icon?: string;
    /* true if the devices has SMS capability, currently only true for type="android" devices*/
    has_sms?: boolean;
  }

  interface ListResponse {
    accounts: [];
    blocks: [];
    channels: [];
    chats: [];
    clients: [];
    devices: [Device];
    grants: [];
    pushes: [Push];
    subscriptions: [];
    texts: [];
  }

  interface PushBulletEvents {
    connect: () => void;
    close: () => void;
    error: (error: Error) => void;
    message: <T>(message: PushBulletEvent<T>) => void;
    nop: () => void;
    tickle: (subtype: SubType) => void;
    push: <T>(data: T) => void;
  }

  type PushType = 'push' | 'nop' | 'tickle';

  type SubType = 'push' | 'device';

  namespace Pushbullet {
    /* Event emitter for the Pushbullet streaming API. */
    export class Stream extends EventEmitter {
      constructor(apiKey: string, encryption: Encryption);

      /* Connect to the stream. */
      connect(): void;

      /* Disconnect from the stream. */
      close(): void;

      /* Reconnect to stream if a 'nop' message hasn't been seen for 30 seconds. */
      heartbeat(): void;

      on<U extends keyof PushBulletEvents>(
        event: U,
        listener: PushBulletEvents[U]
      ): this;

      emit<U extends keyof PushBulletEvents>(
        event: U,
        ...args: Parameters<PushBulletEvents[U]>
      ): boolean;
    }

    export class Encryption {
      constructor(encryptionPassword: string, userIden: string);

      atob(input: string): Buffer;

      btoa(input: string): Buffer;

      encrypt(message: string): string;

      decrypt(message: string): string;
    }

    class PushBullet {
      // pushbullet.js
      constructor(apiKey: string);

      enableEncryption(encryptionPassword: string, userIden: string): void;

      stream(): Pushbullet.Stream;

      getList<T>(endPoint: string, options: Record<string, string>): Promise<T>;

      makeRequest<T, U>(
        verb: string,
        endPoint: string,
        options: MakeRequestOptions<T>
      ): Promise<MakeRequestResponse<U>>;

      // channels.js
      createChannel(
        channelOptions: CreateChannelOptions
      ): Promise<CreateChannelResponse>;

      channelInfo(channelTag: string): Promise<ChannelInfoResponse>;

      // chats.js

      chats(options: ChatsOptions): Promise<ListRequestResponse>;

      createChat(email: string): Promise<CreateChatResponse>;

      muteChat(chatIden: string): Promise<MuteChatResponse>;

      unmuteChat(chatIden: string): Promise<UnmuteChatReponse>;

      updateChat(
        chatIden: string,
        updates: UpdateChatOptions
      ): Promise<UpdateChatResponse>;

      deleteChat(chatIden: string): Promise<DeleteChatResponse>;

      // devices.js

      devices(options?: DevicesOptions): Promise<ListRequestResponse>;

      createDevice(options: CreateDeviceOptions): Promise<DeviceResponse>;

      updateDevice(
        deviceIden: string,
        options: UpdateDeviceOptions
      ): Promise<UpdateDeviceResponse>;

      deleteDevice(deviceIden: string): Promise<Record<string, never>>;

      // ephemerals.js

      sendSMS(
        smsOptions: EphemeralOptions<SendSMS>
      ): Promise<SendEphemeral<SMS>>;

      sendClipboard(
        clipOptions: EphemeralOptions<SendClipboard>
      ): Promise<SendEphemeral<Clipboard>>;

      dismissEphemeral(
        ephemeralOptions: EphemeralOptions<DismissEphemeral>
      ): Promise<SendEphemeral<Dismissal>>;

      sendEphemeral<T>(ephemeralOptions: T): Promise<SendEphemeral<T>>;

      // pushes.js

      note(
        deviceParams: string,
        title: string,
        body: string
      ): Promise<PushResponse<Note>>;

      link(
        deviceParams: string,
        title: string,
        url: string,
        body: string
      ): Promise<PushResponse<Link>>;

      file(
        deviceParams: string,
        filePath: string,
        body: string
      ): Promise<PushResponse<File>>;

      push<T>(deviceParams: string, bullet: T): Promise<PushResponse<T>>;

      history(options?: GetPushHistoryOptions): Promise<ListRequestResponse>;

      dismissPush(pushIden: string): Promise<DismissPushResponse>;

      updatePush(
        pushIden: string,
        updates: UpdatePushOptions
      ): Promise<UpdateResponse>;

      deletePush(pushIden: string): Promise<DeletePushResponse>;

      deleteAllPushes(): Promise<DeleteAllPushesResponse>;

      // subscriptions.js

      subscriptions(
        options: GetSubscriptionsOptions
      ): Promise<ListRequestResponse>;

      subscribe(channelTag: string): Promise<SubscribeResponse>;

      unsubscribe(subscriptionIden: string): Promise<UnsubscribeResponse>;

      muteSubscription(
        subscriptionIden: string
      ): Promise<MuteSubscriptionResponse>;

      unmuteSubscription(
        subscriptionIden: string
      ): Promise<UnmuteSubscriptionResponse>;

      updateSubscription(
        subscriptionIden: string,
        updates: SubscriptionUpdates
      ): Promise<UpdateSubscriptionResponse>;

      // texts.js

      createText(
        deviceIden: string,
        addresses: string | [string],
        message: string,
        textOptions: TextOptions
      ): Promise<CreateTextResponse>;

      updateText(
        textIden: string,
        textOptions: TextOptions
      ): Promise<UpdateTextResponse>;

      deleteText(textIden: string): Promise<DeleteTextResponse>;

      // users.js

      me(): Promise<MeResponse>;
    }
  }

  export default Pushbullet.PushBullet;
}
