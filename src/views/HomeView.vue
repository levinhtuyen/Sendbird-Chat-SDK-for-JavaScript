<template>
  <div class="h-screen w-screen flex bg-gray-100">
     <!-- Sidebar -->
    <div class="w-[240px] bg-gray-100  p-2 space-y-4">
      <div class="bg-white rounded-lg shadow p-4 mb-4 h-full">
        <h2 class="text-xs font-bold text-gray-500 mb-2">Channel Chat</h2>
        <div
          v-for="user in users"
          :key="user.id"
          class="flex items-center gap-3 cursor-pointer py- line-clamp-1 py-2"
          :class="user.id === selectedUser?.id ? 'font-bold text-black' : 'text-gray-600'"
          @click="selectUser(user)"
        >
          <div >
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm "
              :class="user.bg"
              >
                {{ user.initial }}
              </div>
          </div>
          <div class="line-clamp-1">
            {{ user.name }}
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Panel -->
    <div class="flex-1 flex flex-col">
      <!-- Header -->
      <div class="flex justify-center p-4 ">
        <button class="bg-gray-100 text-lg font-bold px-4 py-1 rounded-full text-gray-600">
          {{ selectedUser?.name || 'Select User' }}
        </button>
      </div>

      <!-- Messages -->
      <div class="flex-1 px-6 py-4 space-y-4 overflow-y-auto bg-white">
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="flex items-end"
          :class="msg?.sender === selectedUser.name ? 'justify-end' : 'justify-start'"
        >
          <!-- Avatar -->
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-2"
            :class="getUser(msg?.sender).bg"
            v-if="msg?.sender !== selectedUser.name"
          >
            {{ getUser(msg?.sender).initial }}
          </div>

          <!-- Message bubble -->
          <div
            class="max-w-sm px-4 py-2 rounded-xl shadow text-sm"
            :class="msg?.sender === selectedUser.name
              ? 'bg-gray-100 text-gray-900 rounded-br-none'
              : 'bg-white border rounded-bl-none'"
          >
            <p>{{ msg?.text }}</p>
          </div>

          <!-- Avatar (Right) -->
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ml-2"
            :class="getUser(msg.sender).bg"
            v-if="msg.sender === selectedUser.name"
          >
            {{ getUser(msg.sender).initial }}
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
              placeholder="Type your message..."
              class="flex-1 text-sm text-gray-700 focus:outline-none placeholder-gray-400"
              @keydown.enter="send"
            />
            <button
              @click="send"
              class="ml-2 text-sm text-gray-600 font-semibold px-4 py-1.5 rounded-full hover:bg-gray-100 flex items-center gap-1"
            >
              Send
              <span>➤</span>
            </button>
          </div>
        </div>
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
  { id: 'hotel1', name: 'Clark Kent', initial: 'C', bg: 'bg-cyan-500' },
  { id: 'hotel2', name: 'John Stewart', initial: 'J', bg: 'bg-green-400' },
  { id: 'hotel3', name: 'The Empire Strikes Chat', initial: 'T', bg: 'bg-fuchsia-600' },
  { id: 'hotel4', name: 'Chat Royal', initial: 'C', bg: 'bg-orange-400' },
  { id: 'hotel5', name: 'TextTok', initial: 'T', bg: 'bg-red-500' }
])
const currentUser = ref('user1')
const selectedUser = ref({
  id: 'hotel1', name: 'Clark Kent', initial: 'C', bg: 'bg-cyan-500'
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
    const channelInfo = await createOrOpenChannel(currentUser.value, [selectedUser.value.name, currentUser.value])
    channelName.value = channelInfo.name

    const oldMsgs = await loadMessages()
    console.log('oldMsgs :>> ', oldMsgs);
     messages.value = oldMsgs.reverse() 

    onMessage((text, sender) => {
      messages.value.push({ text, sender,isHighlighted: sender !== currentUser.value  })
    })
    channelReady.value = true
  } catch (err) {
    console.error('❌ Mở channel lỗi:', err)
  }
}
const  getUser = (id: any)=> {
  return users.value.find(u => u.id === id) || { initial: '?', bg: 'bg-gray-400' }
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
