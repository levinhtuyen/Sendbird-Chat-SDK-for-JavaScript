import SendbirdChat, { SendbirdChatParams } from '@sendbird/chat'
import { GroupChannelModule,
  GroupChannelHandler,
  GroupChannel,
  GroupChannelCreateParams, } from '@sendbird/chat/groupChannel'
import { FileMessage, UserMessage, UserMessageCreateParams } from '@sendbird/chat/message'
import { ref, nextTick } from 'vue'

const bottomAnchor = ref<HTMLElement | null>(null)
export const isPendingChat = ref(false)
export const sendFileSuccess = ref(true)
export const checkNewMessage = ref(true)
interface InviteUsersToChannelParams {
  channel: GroupChannel;
  userIds: string[];
}

let sb = await SendbirdChat.init({
  appId: '024DFC28-9586-48DA-9590-AB01C3478D91',
  modules: [new GroupChannelModule()],
})
export async function initSendbird(userId: string, nickname: string ) {
let sb = await SendbirdChat.init({
  appId: '024DFC28-9586-48DA-9590-AB01C3478D91',
  modules: [new GroupChannelModule()],
})

  await sb.connect(userId);
  await sb.updateCurrentUserInfo({ nickname: nickname });
  
  return sb
}

const currentChannel = ref<GroupChannel | null>(null)
let messageCallback: (() => void) | null = null

// ✅ Kết nối người dùng
export async function connectSendbird(userId: string) {
  await sb.connect(userId)
  
}

// ✅ Tạo hoặc mở channel với người khác
export async function createOrOpenChannel(ConnectToUser: string[]) {
  const params: GroupChannelCreateParams = {
    name: `Chat with ${ConnectToUser.join(', ')}`,
    invitedUserIds: ConnectToUser,
    // coverUrl: COVER_URL, // Or .coverImage to upload a cover image file

    // data: DATA,
    // customType: CUSTOM_TYPE,
    isDistinct: true,
  }
  currentChannel.value = await sb.groupChannel.createChannel(params)

  return {
    channelUrl: currentChannel.value.url,
    name: currentChannel.value.name,
  }
}

// ✅ Gửi tin nhắn
export async function sendMessage(text: string) {
  if (!currentChannel.value) throw new Error('Channel chưa mở')
  const params: UserMessageCreateParams = {
      message: text,
  };

   return await currentChannel.value.sendUserMessage(params)
      .onPending((message: any) => {
        isPendingChat.value = true
      })
      .onFailed((err: Error, message: any) => {
      // Handle error.
        isPendingChat.value = false
        console.log('err :>> ', err);
      })
      .onSucceeded((message) => {
        isPendingChat.value = false
        if (messageCallback) {
          messageCallback() // ← Gọi hàm từ component
        }
        nextTick(() => {
          bottomAnchor.value?.scrollIntoView({ behavior: 'smooth' })
        })
      });
}

// ✅ Lấy tin nhắn cũ
export async function loadMessages(limit = 50) {
  if (!currentChannel.value) throw new Error('Channel chưa mở')
  const messages = await currentChannel.value.getMessagesByTimestamp(
    Date.now(),
    {
      prevResultSize: limit,
      nextResultSize: 0,
      isInclusive: true,
      reverse: true,
      includeMetaArray: true,
      includeReactions: true,
    }
  )

  return messages
}

// ✅ Nhận tin nhắn realtime
export function onMessage(callback: (text: string, sender: string) => void) {
  const handler = new GroupChannelHandler()
  handler.onMessageReceived = (_, msg) => {
    if (msg.isUserMessage()) {
      callback(msg.message, msg.sender?.userId || 'unknown')
    }
  }

 sb.groupChannel.addGroupChannelHandler(`handler-${Date.now()}`, handler)

}

// ✅ Mời người dùng vào channel
export const inviteUsersToChannel = async (
  channel: InviteUsersToChannelParams['channel'],
  userIds: InviteUsersToChannelParams['userIds']
): Promise<void> => {
  await channel.inviteWithUserIds(userIds);
};


// ✅ Đăng ký callback khi có tin nhắn mới
export function registerOnMessageCallback(cb: () => void) {
  messageCallback = cb

  const handler = new GroupChannelHandler()
  handler.onMessageReceived = () => {
    if (messageCallback) {
      messageCallback() // ← Gọi hàm từ component
    }
  }

  const handlerId = 'chat-callback-' + Math.random().toString(36).slice(2)
  sb.groupChannel.addGroupChannelHandler(handlerId, handler)
}

export const getAllApplicationUsers = async (id: string) => {
  console.log('id :>> ', id);
    await sb.connect(id)
    try {
        const userQuery = sb.createApplicationUserListQuery({ limit: 100 });
        const users = await userQuery.next();
        console.log('users :>> ', users);

        return users
    } catch (error) {
        return [null, error];
    }
}

export const sendFileMessage = async (file: File) => {
  if (!currentChannel.value) throw new Error('Channel chưa mở');
  const params = { file };
  const sent = await currentChannel.value.sendFileMessage(params)
    .onPending(() => {
      isPendingChat.value = true;
      sendFileSuccess.value = false;
    })
    .onFailed((err: Error) => {
      isPendingChat.value = false;
      sendFileSuccess.value = true;
      console.error('Error sending file message:', err);
    })
    .onSucceeded(() => {
      isPendingChat.value = false;
      sendFileSuccess.value = true;
      nextTick(() => {
        bottomAnchor.value?.scrollIntoView({ behavior: 'smooth' });
      });
    });
  return sent;
};

export const scrollToBottom = () => {
  nextTick(() => {
    bottomAnchor.value?.scrollIntoView({ behavior: 'smooth' })
  })
}

// Hàm đăng ký lắng nghe tin nhắn mới
export function registerMessageListener(

  onNewMessage: (channel: GroupChannel, message: UserMessage | FileMessage) => void
) {
  const handler = new GroupChannelHandler();
 
  handler.onMessageReceived = (channel, message) => {
    if (message.isUserMessage?.()) {
      
      onNewMessage(channel as GroupChannel, message as UserMessage);
       console.log('channel :>> ', channel);
       console.log('message :>> ', message);
    } else if (message.isFileMessage?.()) {
      onNewMessage(channel as GroupChannel, message as FileMessage);
       console.log('channel :>> ', channel);
       console.log('message :>> ', message);
    }
  };

  sb.groupChannel.addGroupChannelHandler('MESSAGE_HANDLER', handler);
}