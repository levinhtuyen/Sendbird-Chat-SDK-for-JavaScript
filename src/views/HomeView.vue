<template>
  <div class="h-screen w-screen flex bg-gray-100">
    <!-- Sidebar -->
    <div class="w-[300px] bg-white border-r overflow-y-auto">
      <div class="p-4 font-bold text-xl border-b">Messages</div>
      <div
        v-for="(user, idx) in users"
        :key="idx"
        @click="selectUser(user)"
        :class="[
          'p-4 cursor-pointer border-b hover:bg-gray-100',
          selectedUser?.id === user.id ? 'bg-blue-50 font-semibold' : ''
        ]"
      >
        {{ user.name }}
      </div>
    </div>

    <!-- Chat window -->
    <div class="flex-1 flex flex-col">
      <!-- Chat Header -->
      <div class="px-6 py-4 bg-white border-b text-lg font-semibold">
        {{ selectedUser?.name || 'Select a user to chat' }}
      </div>

      <!-- Messages -->
      <div
        ref="chatBox"
        class="flex-1 px-6 py-4 overflow-y-auto space-y-3 bg-gray-50"
        :key="keyReload"
      >
        <div
          v-for="(msg, index) in messages"
          :key="index"
          :class="[
            'max-w-[70%] px-4 py-2 rounded-xl',
            msg.sender === selectedUser.name
              ? 'ml-auto bg-blue-500 text-white rounded-br-none'
              : 'mr-auto bg-gray-200 text-gray-800 rounded-bl-none'
          ]"
        >
          {{ msg.text }}
        </div>
         <div ref="bottomAnchor"></div> <!-- điểm cuộn tới -->
      </div>

      <!-- Input -->
      <div class="p-4 bg-white border-t flex gap-2 items-center">
        <input
          v-model="message"
          placeholder="Type a message..."
          class="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none"
          @keydown.enter="send"
        />
        <button
          class="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600"
          @click="send"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import {
  connectSendbird,
  createOrOpenChannel,
  loadMessages,
  registerOnMessageCallback,
  sendMessage,
  onMessage,
  } from '../lib/sendbirdClient'
  
const users = ref([
  { id: 'u1', name: 'hotelAdmin1' },
  { id: 'u2', name: 'hotelAdmin2' },
  { id: 'u3', name: 'hotelAdmin3' }
])
const currentUser = ref('user1')
const selectedUser = ref({
  id: 'u1',
  name: 'hotelAdmin1'
})


const message = ref('')
const messages = ref<any[]>([])
const keyReload = ref(0)
const connected = ref(false)
const channelReady = ref(false)
const channelName = ref('')

async function connect() {
  try {
    await connectSendbird(selectedUser.value.name)
    connected.value = true
  } catch (err) {
    console.error('❌ Kết nối thất bại:', err)
  }
}

async function openChannel() {
  try {
    const channelInfo = await createOrOpenChannel(currentUser.value, [selectedUser.value.name])
    channelName.value = channelInfo.name

    const oldMsgs = await loadMessages()
    console.log('oldMsgs :>> ', oldMsgs);
     messages.value = oldMsgs.reverse() 

    onMessage((text, sender) => {
      messages.value.push({ text, sender,isHighlighted: sender !== currentUser.value  })
    })
    await loadMessages()    
    channelReady.value = true
  } catch (err) {
    console.error('❌ Mở channel lỗi:', err)
  }
}
const  selectUser = async (user:any) =>  {
  selectedUser.value = user
  await connect()
  await openChannel()
  scrollToBottom()
}

async function send() {
  if (!message.value.trim()) return
  try {
    await sendMessage(message.value)
    messages.value.push({ text: message.value, sender: selectedUser.value.name })
    message.value = ''
    scrollToBottom()
  } catch (err) {
    console.error('❌ Gửi lỗi:', err)
  }
}

onMounted(async() => {
  
  registerOnMessageCallback(async () => {
    console.log('📩 Nhận tin nhắn mới từ người khác')
    const oldMsgs = await loadMessages()
    console.log('oldMsgs :>> ', oldMsgs);
    messages.value = oldMsgs.reverse() 
    keyReload.value+=1
    scrollToBottom()
  })
})
const bottomAnchor = ref<HTMLElement | null>(null)

function scrollToBottom() {
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
