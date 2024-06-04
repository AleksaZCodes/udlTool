<template>
  <div class="flex flex-col p-2 gap-2">
    <!-- Menubar and other components can be added here -->

    <Card class="h-full flex justify-center items-center p-2 gap-2">
      <Line v-if="sampling" :data="chartData" :options="chartOptions" />
      <p v-else-if="connected" class="text-muted-foreground italic">
        Start the sampling to see data...
      </p>
      <p v-else class="text-muted-foreground italic">Connect the device to begin...</p>
    </Card>

    <footer>
      <Card class="flex justify-center items-center p-2 gap-2">
        <Button
          v-if="!sampling"
          variant="outline"
          :disabled="loading"
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
          v-if="connected"
          variant="outline"
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

        <Dialog v-if="connected && !sampling">
          <DialogTrigger>
            <Button variant="outline" size="icon">
              <i
                class="fa-solid fa-gear text-muted-foreground"
                :class="[loading ? 'fa-fade' : '']"
              ></i>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set recording parameters</DialogTitle>
            </DialogHeader>

            <DialogDescription></DialogDescription>

            <div class="flex gap-2 text-nowrap items-center justify-between">
              <h3>Sampling rate | {{ samplingRate[0] }}Hz</h3>
              <Slider class="w-[60%]" v-model="samplingRate" :min="100" :max="1000" :step="100" />
            </div>

            <div class="flex gap-2 text-nowrap items-center justify-between">
              <h3>Used channels | {{ usedChannels[0] }}</h3>
              <Slider
                class="w-[60%]"
                v-model="usedChannels"
                :min="1"
                :max="channelLabels.length"
                :step="1"
              />
            </div>

            <div class="flex justify-between items-center">
              <Card
                v-for="(n, i) in channelLabels.length"
                :key="i"
                class="flex flex-col justify-center items-center p-2 w-11"
              >
                <p :class="[i < usedChannels ? 'text-primary' : 'text-secondary']">
                  {{ channelLabels[i] }}
                </p>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </footer>
  </div>
</template>

<script setup>
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import DialogDescription from '@/components/ui/dialog/DialogDescription.vue'
import { Slider } from '@/components/ui/slider'
import { computed, ref } from 'vue'

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement)

const loading = ref(false)
const connected = ref(false)

const port = ref(null)
const channels = ref([])
const channelLabels = ref([])
const sampling = ref(false)
const usedChannels = ref([3])
const samplingRate = ref([100])
const readPromise = ref(null)

const bufferSize = ref(1000)
const chartBuffer = computed(() => channelLabels.value.map(() => Array(bufferSize.value).fill(0)))

const chartData = computed(() => {
  return {
    labels: Array(bufferSize.value).fill(''),
    datasets: channelLabels.value.map((label, index) => ({
      label,
      data: chartBuffer.value[index],
      backgroundColor: `rgba(${(index * 50) % 255}, ${(index * 80) % 255}, ${(index * 110) % 255}, 0.2)`,
      borderColor: `rgba(${(index * 50) % 255}, ${(index * 80) % 255}, ${(index * 110) % 255}, 1)`
    }))
  }
})

const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  elements: {
    point: {
      radius: 0
    }
  },
  scales: {
    x: {
      display: false
    },
    y: {
      beginAtZero: true,
      display: false
    }
  }
})

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

    console.log(bufferSize.value, chartBuffer.value)

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

const sendSettings = async () => {
  if (!port.value) return
  const writer = port.value.writable.getWriter()
  const command = `s${sampling.value ? '1' : '0'},${usedChannels.value[0]},${samplingRate.value[0]}\n`
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
    usedChannels.value[0] = parseInt(decoded[0])
    samplingRate.value[0] = parseInt(decoded[1])
    channelLabels.value = decoded.slice(2)
  } else {
    console.error('Invalid info format received')
  }
}

const startSampling = async () => {
  sampling.value = true
  await sendSettings()
  readPromise.value = readSamples()
}

const stopSampling = async () => {
  sampling.value = false
  await readPromise.value
  await sendSettings()
}

const readSamples = async () => {
  if (!port.value) return
  const reader = port.value.readable.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (sampling.value) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let lines = buffer.split('\r\n')
      buffer = lines.pop() // Keep any incomplete line in the buffer

      for (let line of lines) {
        channels.value = line.split(',').map((value) => parseInt(value))
        updateChart()
      }
    }
  } catch (error) {
    console.error('Error reading samples:', error)
  } finally {
    reader.releaseLock()
  }
}

const updateChart = () => {
  if (!channels.value || channels.value.length === 0) return

  channels.value.forEach((channelValue, index) => {
    chartBuffer.value[index].shift()
    chartBuffer.value[index].push(channelValue)
  })
}
</script>
