import SendbirdChat, { SendbirdChatParams } from '@sendbird/chat'
import { GroupChannelModule,
  GroupChannelHandler,
  GroupChannel,
  GroupChannelCreateParams,
  GroupChannelListOrder, } from '@sendbird/chat/groupChannel'
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
  await sb.connect(userId)
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
export const getAndOpenChannel = async(channel:any, users: any) => {

  currentChannel.value = await sb.groupChannel.getChannel(channel.url);
  await currentChannel.value.inviteWithUserIds([String(users.currenUserId),String(users.userChatId)]); // 🔒 cần gọi nếu user chưa là member; 
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

// ✅ Check 1 kênh đã tồn tại với user cần chat nếu không thì tạo mới
export const createOrGet1on1Channel = async (
  currentUserId: string, currenNickName: string,
  targetUserId: string, targetNickname: string
)  => {
  try {
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
    // Check if a 1-on-1 channel with target user already exists
    const existingChannel = channels.find((channel) => {
      const memberIds = channel.members.map((m) => m.userId);
      return (
        channel.memberCount === 2 &&
        memberIds.includes(currentUserId) &&
        memberIds.includes(targetUserId)
      );
    });

    if (channels?.length) {
      return channels
    }
    let dataBookingTest = {
      sn: 3235215,
      bookingNo: 3335215,
      hotelName: "Test",
      type: 1,
      bookingStatus: 3,
      roomTypeSn: 8,
      roomTypeName: "Standard room",
      totalPrice: 801000,
      checkIn: "2025-02-18 10:00:00",
      checkOut: "2025-02-18 12:00:00",
      createTime: "2025-02-18 09:24:31",
      paymentProvider: 60,
      origin: 1,
      partnerUserBookingId: null,
      paymentInfo: null,
      paymentStatus: 0,
      overCheckoutTime: true,
      roomTypeImagePath: "hotel/467_1483676317282/f57fc912c7a41784ef08f07ffa0cd9f8.jpg",
      haveConfirmedNoShow: false,
      isAction: true,
      hasReview: false,
      cancelBooking: false,
      displayCancel: false,
      hotelSn: 467,
      roomPrice: 706000,
      districtName: "Quận 5",
      isAbleReview: false,
      confirmCheckInBefore: null
    }
    // If not found, create a new channel
    const newChannel = await sb.groupChannel.createChannel({
      invitedUserIds: [currentUserId,targetUserId],
      name: `${targetNickname}`,
      data: JSON.stringify(dataBookingTest),
      isDistinct: true,
      customType: 'support-chat', // optional
    });
    await newChannel.inviteWithUserIds([currentUserId,targetUserId]); // 🔒 cần gọi nếu user chưa là member
    return [newChannel];
  } catch (error) {
    console.error('Error in createOrGet1on1Channel:', error);
    return null;
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
    } else if (message.isFileMessage?.()) {
      onNewMessage(channel as GroupChannel, message as FileMessage);
    }
  };

  sb.groupChannel.addGroupChannelHandler('MESSAGE_HANDLER', handler);
}