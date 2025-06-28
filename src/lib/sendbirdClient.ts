import SendbirdChat, { SendbirdChatParams } from '@sendbird/chat'
import { GroupChannelModule,
  GroupChannelHandler,
  GroupChannel,
  GroupChannelCreateParams, } from '@sendbird/chat/groupChannel'
import { ref } from 'vue'

const sb = await SendbirdChat.init({
  appId: '133CC8F6-6ECE-459D-B738-04F6C8C8C59D',
  modules: [new GroupChannelModule()],
})
const currentChannel = ref<GroupChannel | null>(null)

// ✅ Kết nối người dùng
export async function connectSendbird(userId: string) {
   
  await sb.connect(userId)
}

// ✅ Tạo hoặc mở channel với người khác
export async function createOrOpenChannel(currentUserId: string, otherUserIds: string[]) {
  const params: GroupChannelCreateParams = {
    name: `Chat with ${otherUserIds.join(', ')}`,
    invitedUserIds: [currentUserId, ...otherUserIds],
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
  return await currentChannel.value.sendUserMessage({ message: text })
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
      includeMetaArray: false,
      includeReactions: false,
    }
  )

  return messages.map((msg) => ({
    id: msg.messageId,
    text: msg.message,
    sender: (msg.isUserMessage && msg.isUserMessage() && 'sender' in msg && msg.sender?.userId)
      ? msg.sender.userId
      : 'unknown',
  }))
}

// ✅ Nhận tin nhắn realtime
export function onMessage(callback: (text: string, sender: string) => void) {
  const handler = new GroupChannelHandler()
  handler.onMessageReceived = (_, msg) => {
    console.log('_ :>> ', _);
    console.log('msg  :>> ', msg );
    if (msg.isUserMessage()) {
      console.log('msg.message, msg.sender?.userId :>> ', msg.message, msg.sender?.userId);
      callback(msg.message, msg.sender?.userId || 'unknown')
    }
  }

 sb.groupChannel.addGroupChannelHandler(`handler-${Date.now()}`, handler)

}

let messageCallback: (() => void) | null = null

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