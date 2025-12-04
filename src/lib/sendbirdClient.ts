import SendbirdChat from '@sendbird/chat'
import {
  GroupChannel,
  GroupChannelHandler,
  GroupChannelModule
} from '@sendbird/chat/groupChannel'
  
import { BaseMessage, UserMessageCreateParams } from '@sendbird/chat/message'
import { nextTick, ref } from 'vue'

const bottomAnchor = ref<HTMLElement | null>(null)
export const isPendingChat = ref(false)
export const sendFileSuccess = ref(true)
export const checkNewMessage = ref(true)
interface InviteUsersToChannelParams {
  channel: GroupChannel;
  userIds: string[];
}

let sb = await SendbirdChat.init({
  appId: 'A63E8391-FA54-476B-A089-FF6883C8129A',
  modules: [new GroupChannelModule()],
})
export async function initSendbird(userId: string, nickname: string ) {
  if (!userId || userId === 'undefined' || userId === 'null') {
    throw new Error('Invalid userId: userId is required')
  }
  
  sb = await SendbirdChat.init({
    appId: 'A63E8391-FA54-476B-A089-FF6883C8129A',
    modules: [new GroupChannelModule()],
  })
  await sb.connect(userId)
  
  if (nickname && nickname !== 'undefined' && nickname !== 'null') {
    await sb.updateCurrentUserInfo({ nickname: nickname });
  }
  return sb
}

const currentChannel = ref<GroupChannel | null>(null)
let messageCallback: (() => void) | null = null

// ✅ Kết nối người dùng
export async function connectSendbird(userId: string) {
  if (!userId || userId === 'undefined' || userId === 'null') {
    throw new Error('Invalid userId: userId is required')
  }
  await sb.connect(userId)
}

// ✅ Tạo hoặc mở channel với người khác
export const getAndOpenChannel = async(channel:any, users: any) => {

  currentChannel.value = await sb.groupChannel.getChannel(channel.url);
  
  // Filter out invalid userIds
  const userIdsToInvite = [String(users.currenUserId), String(users.userChatId)]
    .filter(id => id && id !== 'undefined' && id !== 'null');

  if (userIdsToInvite.length > 0) {
    try {
      await currentChannel.value.inviteWithUserIds(userIdsToInvite);
    } catch (error) {
      // User already in channel or user not found - ignore
      console.warn('Failed to invite users (may already be members):', error);
    }
  }
  
  return {
    channelUrl: currentChannel.value.url,
    name: currentChannel.value.name,
  }
}

// ✅ Gửi tin nhắn
let lastSentMessageTimestamp = 0

export async function sendMessageListener(text: string): Promise<any> {
  if (!currentChannel.value) throw new Error('Channel chưa mở')
  const params: UserMessageCreateParams = {
      message: text,
  };

  return new Promise((resolve, reject) => {
    currentChannel.value!.sendUserMessage(params)
      .onPending((message: any) => {
        isPendingChat.value = true
      })
      .onFailed((err: Error, message: any) => {
        isPendingChat.value = false
        console.log('err :>> ', err);
        reject(err)
      })
      .onSucceeded(async (message) => {
        isPendingChat.value = false
        // Record the timestamp of sent message to skip duplicate reload in onMessageReceived
        lastSentMessageTimestamp = Date.now()
        
        // Reload messages immediately so sender can see their message
        await reloadMessagesNow()
        
        nextTick(() => {
          bottomAnchor.value?.scrollIntoView({ behavior: 'smooth' })
        })
        resolve(message)
      });
  })
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

// ✅ Nhận tin nhắn realtime - Chỉ dùng 1 handler duy nhất
let messageHandlerRegistered = false
let reloadMessagesCallback: (() => Promise<void>) | null = null
let inboxUpdateCallback: ((channel: any, message: BaseMessage) => Promise<void> | void) | null = null

export function registerMessageHandler(
  reloadCallback: () => Promise<void>,
  onInboxUpdate?: (channel: any, message: BaseMessage) => Promise<void> | void
) {
  // Chỉ đăng ký handler 1 lần
  if (messageHandlerRegistered) {
    // Cập nhật callback mới
    reloadMessagesCallback = reloadCallback
    inboxUpdateCallback = onInboxUpdate ?? null
    return
  }
  
  reloadMessagesCallback = reloadCallback
  inboxUpdateCallback = onInboxUpdate ?? null
  
  const handler = new GroupChannelHandler()
  handler.onMessageReceived = async (channel, message) => {
    console.log('onMessageReceived - channel:', channel.url);
    console.log('onMessageReceived - currentChannel:', currentChannel.value?.url);
    
    // Kiểm tra xem đây có phải tin nhắn của chính user gửi không
    // Nếu là tin nhắn vừa gửi (trong 1 giây), bỏ qua để tránh reload 2 lần
    const timeSinceSent = Date.now() - lastSentMessageTimestamp
    if (timeSinceSent < 1000) {
      console.log('⏭️ Bỏ qua reload vì đây là tin nhắn vừa gửi');
      return
    }
    
    // Nếu là tin nhắn thuộc channel đang mở -> reload messages hiện tại
    if (currentChannel.value && channel.url === currentChannel.value.url) {
      if (reloadMessagesCallback) {
        console.log('📥 Tin nhắn mới nhận - reload messages của channel hiện tại')
        await reloadMessagesCallback()
      }
      return
    }

    // Nếu tin nhắn thuộc channel khác, call inbox update callback để UI cập nhật
    if (inboxUpdateCallback) {
      console.log('📥 Tin nhắn mới - cập nhật inbox (last message, unread count)')
      await inboxUpdateCallback(channel, message)
    }
  }
  
  const handlerId = 'main-message-handler'
  sb.groupChannel.removeGroupChannelHandler(handlerId)
  sb.groupChannel.addGroupChannelHandler(handlerId, handler)
  messageHandlerRegistered = true
}

// Manual trigger to reload messages (for sender to see their own message)
export async function reloadMessagesNow() {
  if (reloadMessagesCallback) {
    await reloadMessagesCallback()
  }
}

// Legacy onMessage - kept for compatibility but now uses single handler
export function onMessage(callback: (text: string, sender: string) => void) {
  // This is now a no-op since we use registerMessageHandler
  // Keeping for backward compatibility
  console.warn('onMessage is deprecated, use registerMessageHandler instead')
}

// ✅ Mời người dùng vào channel
export const inviteUsersToChannel = async (
  channel: InviteUsersToChannelParams['channel'],
  userIds: InviteUsersToChannelParams['userIds']
): Promise<void> => {
  await channel.inviteWithUserIds(userIds);
};


// ✅ Check 1 kênh đã tồn tại với user cần chat nếu không thì tạo mới
export const createOrGet1on1Channel = async (
  currentUserId: string, currenNickName: string,
  targetUserId: string, targetNickname: string
)  => {
  try {
    // Validate currentUserId
    if (!currentUserId || currentUserId === 'undefined' || currentUserId === 'null') {
      console.warn('Invalid currentUserId, cannot get channels');
      return { channels: [], targetChannel: null };
    }
    
    // Ensure connected as current user
    if (!sb.currentUser || sb.currentUser.userId !== currentUserId) {
      await sb.connect(currentUserId);
    }

    const query = sb.groupChannel.createMyGroupChannelListQuery({
      includeEmpty: true,
      limit: 50,
    });

    const channels = await query.next();

    console.log('channels :>> ', channels);
    
    // If targetUserId is invalid, just return existing channels without creating new one
    if (!targetUserId || targetUserId === 'undefined' || targetUserId === 'null') {
      console.warn('Invalid targetUserId, returning existing channels only');
      return { channels, targetChannel: channels[0] || null };
    }
    
    // Check if a 1-on-1 channel with target user already exists
    const existingChannel = channels.find((channel) => {
      const memberIds = channel.members.map((m) => m.userId);
      return (
        channel.memberCount === 2 &&
        memberIds.includes(currentUserId) &&
        memberIds.includes(targetUserId)
      );
    });

    // If channel with target user exists, return all channels (with existing channel info)
    if (existingChannel) {
      console.log('Found existing channel with target user:', existingChannel.name);
      return { channels, targetChannel: existingChannel };
    }
    
    // If no channel with target user, create a new one
    let dataBookingTest = {
      sn: 3235215,
      bookingNo: 3335215,
      hotelName: "Test",
      type: 1,
      hotelSn: 467,
      roomPrice: 706000,
    }
    // If not found, create a new channel

    const newChannel = await sb.groupChannel.createChannel({
      invitedUserIds: [currentUserId,targetUserId],
      name: `Channel chat ${targetNickname} - ${currenNickName}`,
      data: JSON.stringify(dataBookingTest),
      isDistinct: true,
      customType: 'support-chat', // optional
    });
    // inviteWithUserIds is not needed since we already included users in invitedUserIds
    return { channels: [newChannel, ...channels], targetChannel: newChannel };
  } catch (error) {
    console.error('Error in createOrGet1on1Channel:', error);
    return { channels: [], targetChannel: null };
  }
};

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

// Hàm đăng ký lắng nghe tin nhắn mới
// export function registerMessageListener(

//   onNewMessage: (channel: GroupChannel, message: UserMessage | FileMessage) => void
// ) {
//   const handler = new GroupChannelHandler();
//   handler.onMessageReceived = (channel, message) => {
//     if (message.isUserMessage?.()) {
//       onNewMessage(channel as GroupChannel, message as UserMessage);
//     } else if (message.isFileMessage?.()) {
//       onNewMessage(channel as GroupChannel, message as FileMessage);
//     }
//   };
//   sb.groupChannel.addGroupChannelHandler('MESSAGE_HANDLER', handler);
// }
// ✅ Lấy số tin nhắn chưa đọc cho channel hiện tại
export async function getUnreadMessageCount(channel: GroupChannel): Promise<number> {
  try {
    // SDK keeps unreadMessageCount property
    return channel.unreadMessageCount || 0
  } catch (err) {
    console.warn('Failed to get unread count for channel', err)
    return 0
  }
}

// ✅ Đánh dấu kênh là đã đọc
export async function markChannelAsRead(channel: GroupChannel): Promise<void> {
  try {
    if (!channel) return;
    // Some SDK versions expose markAsRead; use (any) to be safe
    if ((channel as any).markAsRead) {
      await (channel as any).markAsRead();
    }
    // unread count will be updated by SDK events; set 0 for local usage
    (channel as any).unreadMessageCount = 0;
  } catch (err) {
    console.warn('Failed to mark channel as read:', err);
  }
}

export const listenToNewChannels = (  
  onNewMessage: (channel: GroupChannel, message: BaseMessage) => void,
  onNewChannel: (channel: GroupChannel) => void
) => {
  const handler = new GroupChannelHandler();
  
  // Don't add onMessageReceived here - let registerMessageHandler handle it
  // This handler is only for channel-level events (new channel, channel changed)

  handler.onChannelChanged = (channel) => {
    // Only call onNewChannel if channel is a GroupChannel
    if ((channel as GroupChannel).isGroupChannel && (channel as GroupChannel).isGroupChannel()) {
      onNewChannel(channel as GroupChannel);
    }
    console.log('channel changed :>> ', channel);
  };

  // Xoá handler cũ nếu có
  const handlerId = 'new-channel-listener';
  sb.groupChannel.removeGroupChannelHandler(handlerId);
  sb.groupChannel.addGroupChannelHandler(handlerId, handler);
};