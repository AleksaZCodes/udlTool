<template>
  <div class="flex flex-col p-2 gap-2">
    <!-- Menubar and other components can be added here -->

    <Card class="h-full flex justify-center items-center gap-2">
      <div v-if="sampling" class="flex justify-center items-center gap-2">
        <Card
          v-for="(n, i) in usedChannels"
          :key="i"
          class="flex flex-col justify-center items-center p-2 w-20"
        >
          <h2>{{ channels[i] }}</h2>
          <p class="text-muted-foreground">{{ channelLabels[i] }}</p>
        </Card>
      </div>
      <p v-else-if="connected" class="text-muted-foreground italic">
        Start the sampling to see data...
      </p>
      <p v-else class="text-muted-foreground italic">Connect the device to begin...</p>
    </Card>

    <footer>
      <Card class="flex justify-center items-center p-2 gap-2">
        <Button
          variant="outline"
          :disabled="loading || sampling"
          @click="connected ? disconnect() : connect()"
        >
          <i
            class="fa-solid"
            :class="[
              connected ? 'text-red-400 fa-link-slash' : 'text-primary fa-link',
              loading ? 'fa-fade' : ''
            ]"
          ></i>
          <span>{{ connected ? 'Disconnect' : 'Connect' }}</span>
        </Button>

        <Button
          variant="outline"
          :disabled="!connected"
          @click="sampling ? stopSampling() : startSampling()"
        >
          <i
            class="fa-solid"
            :class="[
              sampling ? 'text-red-400 fa-stop' : 'text-primary fa-play',
              loading ? 'fa-fade' : ''
            ]"
          ></i>
          <span>{{ sampling ? 'Stop' : 'Start' }}</span>
        </Button>
      </Card>
    </footer>
  </div>
</template>

<script setup>
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ref } from 'vue'

const loading = ref(false)
const connected = ref(false)

const port = ref(null)
const channels = ref([])
const channelLabels = ref([])
const sampling = ref(false)
const usedChannels = ref(3)
const samplingRate = ref(100)
const readPromise = ref(null)

const connect = async () => {
  try {
    loading.value = true
    port.value = await navigator.serial.requestPort()
    await port.value.open({ baudRate: 115200 })

    // Create a reader to read from the serial port
    const reader = port.value.readable.getReader()
    const decoder = new TextDecoder()

    // Wait for "READY\r\n"
    let received = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        throw new Error('Port closed before READY signal received')
      }
      received += decoder.decode(value)
      if (received.includes('READY\r\n')) {
        break
      }
    }

    // Release the reader lock after reading "READY\r\n"
    reader.releaseLock()

    await getInfo()

    connected.value = true
    loading.value = false
  } catch (error) {
    console.error('Failed to connect:', error)
    loading.value = false
  }
}

const disconnect = async () => {
  if (port.value) {
    await port.value.close()
    port.value = null
    connected.value = false
    sampling.value = false
  }
}

// const sendSettings = async (sampling, usedChannels, samplingRate) => {
//   if (!port.value) return

//   // Send the command
//   const writer = port.value.writable.getWriter()
//   const command = `s${sampling ? '1' : '0'},${usedChannels},${samplingRate}\n`
//   await writer.write(new TextEncoder().encode(command))
//   writer.releaseLock()

//   // Wait for the "OK\r\n" response
//   const reader = port.value.readable.getReader()
//   const decoder = new TextDecoder()
//   let received = ''

//   try {
//     while (true) {
//       const { value, done } = await reader.read()
//       if (done) {
//         throw new Error('Port closed before OK response received')
//       }
//       received += decoder.decode(value, { stream: true })
//       if (received.includes('OK\r\n')) {
//         break
//       }
//     }
//   } catch (error) {
//     console.error('Failed to receive OK response:', error)
//   } finally {
//     reader.releaseLock()
//   }
// }

const sendSettings = async (sampling, usedChannels, samplingRate) => {
  if (!port.value) return
  const writer = port.value.writable.getWriter()
  const command = `s${sampling ? '1' : '0'},${usedChannels},${samplingRate}\n`
  await writer.write(new TextEncoder().encode(command))
  writer.releaseLock()
}

const getInfo = async () => {
  if (!port.value) return
  const writer = port.value.writable.getWriter()
  const command = 'i\n'
  await writer.write(new TextEncoder().encode(command))
  writer.releaseLock()

  const reader = port.value.readable.getReader()
  const decoder = new TextDecoder()
  let received = ''

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        throw new Error('Port closed before complete info received')
      }
      received += decoder.decode(value, { stream: true })
      if (received.includes('\r\n')) {
        break
      }
    }
  } catch (error) {
    console.error('Failed to receive info:', error)
  } finally {
    reader.releaseLock()
  }

  const decoded = received.trim().split('\r\n')[0].split(',')

  if (decoded.length >= 2) {
    usedChannels.value = parseInt(decoded[0])
    samplingRate.value = parseInt(decoded[1])
    channelLabels.value = decoded.slice(2)
  } else {
    console.error('Invalid info format received')
  }
}

const startSampling = async () => {
  sampling.value = true
  await sendSettings(true, usedChannels.value, samplingRate.value)
  readPromise.value = readSamples()
}

const stopSampling = async () => {
  sampling.value = false
  await readPromise.value
  await sendSettings(false, usedChannels.value, samplingRate.value)
}

const readSamples = async () => {
  if (!port.value) return
  const reader = port.value.readable.getReader()

  try {
    while (sampling.value) {
      const { value, done } = await reader.read()
      if (done) break
      channels.value = new TextDecoder()
        .decode(value)
        .split('\r\n')[0]
        .split(',')
        .map((value) => parseInt(value))
    }
  } catch (error) {
    console.error('Error reading samples:', error)
  } finally {
    reader.releaseLock()
  }
}
</script>
