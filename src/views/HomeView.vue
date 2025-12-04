<template>
  <div class="h-screen w-screen flex bg-gray-100">
     <!-- Sidebar -->
    <div class="w-[340px] bg-gray-100  p-2 space-y-4">
      <div class="bg-white rounded-lg shadow p-4 mb-4 h-full">
        <h2 class="text-xs font-bold text-gray-500 mb-2">Channel Chat</h2>
        <div
          v-for="(channel, index) in channelList"
          :key="index"
          @click="changeChannel(channel)">
          <div class="flex items-center gap-1 cursor-pointer py- line-clamp-1 pt-2"
          :class="channel.name === selectedChannelCurrent.name ? 'font-bold': ''">
            <div
              class="w-8 h-8 rounded-full flex items-center bg-white justify-center text-white font-semibold text-sm "
              >
               <img class="rounded-full " src="https://static.sendbird.com/sample/cover/cover_13.jpg" width="26" height="26" alt="">
            </div>
            <div class="line-clamp-1 ">
              {{ channel?.name }}
            </div>
          </div>
          <p class="flex-1 w-full pl-9 text-gray-400 text-sm line-clamp-1"
          :class="userSeen.isSeen === false && channel?.lastMessage?.message === userSeen.message ? 'font-semibold text-gray-800 animate-bounce': ''"
          >{{ channel?.lastMessage?.message }}</p>
        </div>
      </div>
    </div>

    <!-- Chat Panel -->
    <div class="flex-1 flex flex-col" > 
      <!-- Header -->
      <div class="flex justify-center p-4 ">
        <button class="bg-gray-100 text-lg font-bold px-4 py-1 rounded-full text-gray-600">
          {{ getChatTitle() }}
        </button>
      </div>

      <!-- Messages -->
      <div class="flex-1 px-6 py-4 space-y-4 overflow-y-auto overflow-x-hidden bg-white">
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="flex items-end  gap-2 ww-full"
          :class=" msg?.sender?.userId === currentUser.currenUserId ? 'justify-end' : 'justify-start'"
        >
          <!-- Avatar -->
          <!-- Avatar (Right) -->
          <div
            v-if="msg.sender?.userId === 'unknown' || msg?.sender?.userId !== currentUser?.currenUserId"
            class="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ml-2"
            :class="msg.sender === selectedChannelCurrent.currenUserId ? 'bg-amber-400' : 'bg-gray-400'"
          >
            {{ msg.sender?.nickname !== '' ? msg.sender?.nickname?.slice(0, 1) :  msg.sender?.userId.slice(0, 1) }}
          </div>
          <!-- Message bubble -->
          
          <div
            class="px-4 py-2 rounded-xl text-sm bg-white shadow"
            :class="[{
               'bg-gray-100 text-gray-900 ' : msg?.sender?.userId === selectedChannelCurrent?.currenUserId,
               'shadow': !isImage(msg) && !isPdf(msg) && !isOtherFile(msg),
           
            }]"
          >
            <p class="flex pb-1 text-gray-400">{{ msg.sender?.nickname ?? msg.sender?.userId }}</p>
            <div v-if="isImage(msg)">
              <img :src="msg.url" class="max-w-[200px] rounded" />
            </div>
            
            <template v-else-if="isPdf(msg)">
              <a
                :href="(msg as any).url"
                target="_blank"
                class="text-blue-500 underline"
              >
                📄 PDF file - Download
              </a>
            </template>

            <template v-else-if="isOtherFile(msg)">
              <a
                :href="(msg as any).url"
                target="_blank"
                class="text-blue-500"
              >
                📎 {{ (msg as any).name || 'Download file' }}
              </a>
            </template>
            <p v-else>{{ msg?.message }}</p>
            <p class="text-xs text-gray-500 mt-1" style="line-break: anywhere;" :class="msg?.sender?.userId === currentUser.currenUserId ? 'text-right' : 'text-left'">
              {{ new Date(msg?.createdAt).toLocaleTimeString([], {  hour: '2-digit', minute: '2-digit' }) }}
            </p>
          </div>
        </div>
        <div ref="bottomAnchor"></div> <!-- điểm cuộn tới -->
      </div>
      <!-- Input -->
      <div class="p-4 w-full">
        <div class="w-full">
          <div class="flex items-center border rounded-lg px-4 py-2 bg-white w-full shadow-sm">
            <input
              v-model="message"
              type="text"
              :disabled="isPendingChat"
              placeholder="Type your message..."
              class="flex-1 text-sm text-gray-700 focus:outline-none placeholder-gray-400"
              @keydown.enter="sendMessageToChannel"
            />
            <input v-if="!isPendingChat" type="file" ref="fileInput" class="hidden " @change="onFileChange" />
            <button v-if="!isPendingChat"  @click="triggerFileInput" class="!px-0">
              <img width="30" height="30" src="@/assets/choosefile.png" alt="">
            </button>
            <button v-if="!isPendingChat"
              @click="sendMessageToChannel"
              class=" text-sm text-gray-600 font-semibold  py-1.5 rounded-full hover:bg-gray-100 flex items-center gap-1"
            >
              Send
              <span>➤</span>
            
            </button>
            <img v-else width="30" height="30" src="@/assets/loading_2.gif" alt="">
          </div>
        </div>
      </div>
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeMount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  connectSendbird,
  createOrGet1on1Channel,
  getAndOpenChannel,
  // registerMessageListener ,
  initSendbird,
  isPendingChat,
  listenToNewChannels,
  loadMessages,
  registerMessageHandler,
  sendFileMessage,
  sendFileSuccess,
  sendMessageListener
} from '../lib/sendbirdClient';

const channelList = ref<any>([])
const unreadChannelUrls = ref<string[]>([]);
const route = useRoute();
const userSeen = ref({
  message: '',
  isSeen: true,
  channelName: ''
})
const router = useRouter();
const currentUser = ref<any>({
  currenUserId: route.query.currenUserId,
  currentUserNickname: route.query.currentUserNickname 
})
const userChat = ref<any>({
  userChatId: route.query.userChatId ,
  userChatNickname: route.query.userChatNickname,
  isUser: route.query.isUser === 'true'
})
watch(sendFileSuccess, (newVal) => {
  sendMessageToChannel()
  setTimeout(() => {
    scrollToBottom()
  }, 1000);
})
const fileInput = ref<HTMLInputElement | null>(null);
const selectedChannelCurrent = ref()
const updateRouterQuery = (channel:any) => {
  let memberDif = channel.members.filter((member:any) => {
    if(member.userId !== currentUser.value.currenUserId && member.userId!=='undefined') {
      return member
    }
  })
  userChat.value.userChatId = memberDif[0]?.userId
  userChat.value.userChatNickname = memberDif[0]?.nickname
  router.replace({
    name: route.name,
    query: {
      currenUserId: route.query?.currenUserId,
      currentUserNickname: route.query?.currentUserNickname,
      userChatId: memberDif[0]?.userId,
      userChatNickname: memberDif[0]?.nickname,
      isUser: route.query?.isUser
    }
  })
}
const  changeChannel = async (channel:any, shouldUpdateUrl = true) =>  {
  selectedChannelCurrent.value = channel
  if(channel.name === userSeen.value.channelName) {
    userSeen.value.isSeen = true
    userSeen.value.message = ''
    userSeen.value.channelName = ''
  }
  
  // Only update URL when user manually clicks on a channel (not on initial load)
  if (shouldUpdateUrl) {
    await updateRouterQuery(channel)
  }
  
  // Only connect if userId is valid
  if (currentUser.value.currenUserId && currentUser.value.currenUserId !== 'undefined') {
    await connectToUser(currentUser.value.currenUserId)
  }
  
  // Open channel and load messages
  await openChannel()
  scrollToBottom()
}

const message = ref('')
const messages = ref<any[]>([])
const keyReload = ref(0)
const connected = ref(false)
const channelReady = ref(false)
const channelName = ref('')
const channelUrlCurren = ref('')

// Get chat title based on isUser value
const getChatTitle = () => {
  if (!selectedChannelCurrent.value?.name && !userChat.value.userChatNickname) {
    return 'Select User'
  }
  
  const nickname = userChat.value.userChatNickname || selectedChannelCurrent.value?.name
  if (userChat.value.isUser) {
    return `Chat với người dùng ${nickname}`
  } else {
    return `Chat với khách sạn ${nickname}`
  }
}

const connectToUser = async(userId: string) => {
  try {
    await connectSendbird(userId)
    connected.value = true
  } catch (err) {
    console.error('❌ Kết nối thất bại:', err)
  }
}
const triggerFileInput = () => {
  fileInput.value?.click();
};

const onFileChange = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    let fileSuccess = await sendFileMessage(file);
    if (fileSuccess) {
      // Tải lại tin nhắn để hiển thị tệp đã gửi
      setTimeout(async() => {
         const oldMsgs = await loadMessages();
        messages.value = oldMsgs.reverse();
        keyReload.value += 1; // Tăng key để buộc Vue cập nhật
        // Cuộn xuống cuối để hiển thị tin nhắn mới
        
      },  1000);
      scrollToBottom();
    } else {
      console.error('Gửi tệp không thành công');
    }
  }
};


const openChannel = async() => {
  // Use current userChat values (may be updated when clicking different channels)
  let paramsUser = {
    currenUserId: currentUser.value.currenUserId,
    currentUserNickname: currentUser.value.currentUserNickname,
    userChatId: userChat.value.userChatId,
    userChatNickname: userChat.value.userChatNickname
  }
  
  if (!selectedChannelCurrent.value?.url) {
    console.warn('No channel selected');
    return;
  }
  
  try {
    const channelInfo = await getAndOpenChannel(selectedChannelCurrent.value, paramsUser)
    channelName.value = channelInfo.name
    channelUrlCurren.value = channelInfo.channelUrl
    const oldMsgs = await loadMessages()
    messages.value = oldMsgs.reverse() 
    console.log('messages :>> ', messages);
    channelReady.value = true
    scrollToBottom()
  } catch (err) {
    console.error(' Mở channel lỗi:', err)
  }
}


const sendMessageToChannel = async() => {
  if (!message.value.trim()) return
  if (!channelReady.value) {
    console.warn('Channel is not ready')
    return
  }
  try {
    const messageText = message.value
    message.value = ''  // Clear input immediately
    await sendMessageListener(messageText)
    // Messages reloaded in sendMessageListener via reloadMessagesNow
    scrollToBottom()
  } catch (err) {
    console.error(' Gửi lỗi:', err)
  }
}
const getAllChannelForUserid = async() => {
  const result = await createOrGet1on1Channel(
    currentUser.value.currenUserId, 
    currentUser.value.currentUserNickname, 
    userChat.value.userChatId, 
    userChat.value.userChatNickname
  )
  
  if (!result) {
    console.warn('Failed to get/create channel');
    return;
  }
  
  channelList.value = JSON.parse(JSON.stringify(result.channels || []))
  console.log('channelList.value :>> ', channelList.value);
  
  if (channelList.value?.length) {
    // If we have a target channel from query params, use it
    if (result.targetChannel) {
      selectedChannelCurrent.value = JSON.parse(JSON.stringify(result.targetChannel))
    } else {
      // Otherwise find channel matching userChatId or use first channel
      const channel = channelList.value.find((channel: any) => {
        const memberIds = channel.members.map((m: any) => m.userId);
        return (
          channel.memberCount === 2 &&
          memberIds.includes(currentUser.value.currenUserId) &&
          memberIds.includes(userChat.value.userChatId)
        );
      });
      selectedChannelCurrent.value = channel || channelList.value[0]
    }
    
    await changeChannel(selectedChannelCurrent.value, false)  // Don't update URL on initial load
  }
  
  // Register message handler for real-time updates (only once)
  registerMessageHandler(async () => {
    const oldMsgs = await loadMessages()
    messages.value = oldMsgs.reverse() 
    keyReload.value += 1
    
    // Also refresh channel list to update last message preview
    const result = await createOrGet1on1Channel(
      currentUser.value.currenUserId, 
      currentUser.value.currentUserNickname, 
      userChat.value.userChatId, 
      userChat.value.userChatNickname
    )
    if (result?.channels) {
      channelList.value = JSON.parse(JSON.stringify(result.channels))
    }
    
    setTimeout(() => {
      scrollToBottom()
    }, 300);
  })
}
const onNewMessage = async(channel: any, message: any) => {
  // This is now only called for channel-level events, not message events
  console.log('Channel event - channel:', channel);
  if(channel.name !== selectedChannelCurrent.value?.name) {
    userSeen.value.isSeen = false
    userSeen.value.message = channel.lastMessage?.message
    userSeen.value.channelName = channel.name
  }
};

const onNewChannel = () => {
  console.log('Có kênh mới liên quan tới bạn :>> ');
};
// onBeforeMount trước khi khởi tạo DOM
onBeforeMount(async () => {
  const userId = currentUser.value.currenUserId
  const nickname = currentUser.value.currentUserNickname
  
  if (!userId || userId === 'undefined') {
    console.warn('Missing currenUserId in query params. Please provide currenUserId.')
    return
  }
  
  initSendbird(userId, nickname || userId).then((sb) => {
    
  }).catch((err) => {
    console.error('Error initializing Sendbird:', err)
  })
})

// onMounted sau khi khởi tạo DOM
onMounted(async() => {
  setTimeout(async() => {
    await getAllChannelForUserid()
  }, 500);
  listenToNewChannels(onNewMessage, onNewChannel);
  // registerMessageListener((channel, message) => {
  //   unreadChannelUrls.value.push(channel.url);
  //   console.log('unreadChannelUrls.value :>> ', unreadChannelUrls.value);
  //   if (message.isUserMessage?.()) {
  //     console.log('message component :>> ', message);
  //   } else if (message.isFileMessage?.()) {
      
  //   }
  // })
})
const bottomAnchor = ref<HTMLElement | null>(null)
const isImage = (msg: any) => {
  return msg && typeof msg === 'object' && 'url' in msg && typeof msg.type === 'string' && msg.type.startsWith('image');
};
const isPdf = (msg: any) => {
  return msg && typeof msg === 'object' && 'url' in msg && typeof msg.type === 'string' && msg.type === 'application/pdf';
};
const isOtherFile = (msg: any) => {
  return msg && typeof msg === 'object' && 'url' in msg && typeof msg.type === 'string' && !msg.type.startsWith('image') && msg.type !== 'application/pdf';
};
const scrollToBottom = () => {
  nextTick(() => {
    bottomAnchor.value?.scrollIntoView({ behavior: 'smooth' })
  })
}
</script>

<style scoped>
.chat-container {
  max-width: 500px;
  margin: auto;
  padding: 16px;
}
.messages {
  border: 1px solid #ccc;
  padding: 10px;
  max-height: 300px;
  overflow-y: auto;
  margin: 12px 0;
  background: #f9f9f9;
}
.input-box {
  display: flex;
  gap: 8px;
}
input {
  flex: 1;
  padding: 6px;
}
button {
  padding: 6px 12px;
}
</style>
