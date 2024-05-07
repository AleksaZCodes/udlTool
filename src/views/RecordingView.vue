<template>
  <div class="flex flex-col p-2 gap-2">
    <!-- <header>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem> New Tab <MenubarShortcut>⌘T</MenubarShortcut> </MenubarItem>
            <MenubarItem> New Window <MenubarShortcut>⌘N</MenubarShortcut> </MenubarItem>
            <MenubarItem disabled> New Incognito Window </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Share</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Email link</MenubarItem>
                <MenubarItem>Messages</MenubarItem>
                <MenubarItem>Notes</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem> Print... <MenubarShortcut>⌘P</MenubarShortcut> </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem> Undo <MenubarShortcut>⌘Z</MenubarShortcut> </MenubarItem>
            <MenubarItem> Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut> </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Find</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Search the web</MenubarItem>
                <MenubarSeparator />
                <MenubarItem>Find...</MenubarItem>
                <MenubarItem>Find Next</MenubarItem>
                <MenubarItem>Find Previous</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>Cut</MenubarItem>
            <MenubarItem>Copy</MenubarItem>
            <MenubarItem>Paste</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem>Always Show Bookmarks Bar</MenubarCheckboxItem>
            <MenubarCheckboxItem checked> Always Show Full URLs </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarItem inset> Reload <MenubarShortcut>⌘R</MenubarShortcut> </MenubarItem>
            <MenubarItem disabled inset>
              Force Reload <MenubarShortcut>⇧⌘R</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset> Toggle Fullscreen </MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset> Hide Sidebar </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Help</MenubarTrigger>
          <MenubarContent>
            <MenubarRadioGroup value="benoit">
              <MenubarRadioItem value="andy"> Andy </MenubarRadioItem>
              <MenubarRadioItem value="benoit"> Benoit </MenubarRadioItem>
              <MenubarRadioItem value="Luis"> Luis </MenubarRadioItem>
            </MenubarRadioGroup>
            <MenubarSeparator />
            <MenubarItem inset> About </MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset> Add Profile... </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </header> -->

    <Card class="h-full flex flex-col justify-center items-center"> {{ channels }} </Card>

    <footer>
      <Card class="flex justify-center items-center p-2 gap-2">
        <Button variant="outline" :disabled="loading" @click="connected ? disconnect() : connect()">
          <i
            class="fa-solid"
            :class="[
              connected ? 'text-red-400 fa-link-slash' : 'text-primary fa-link',
              loading ? 'fa-fade' : ''
            ]"
          ></i>
          <span>{{ connected ? 'Disconnect' : 'Connect' }}</span>
        </Button>

        <!-- <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="outline" size="icon">
              <i class="fa-solid fa-gear text-muted-foreground"></i>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Menu</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Team</DropdownMenuItem>
            <DropdownMenuItem>Subscription</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> -->
      </Card>
    </footer>
  </div>
</template>

<script setup>
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ref } from 'vue'
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger
// } from '@/components/ui/dropdown-menu'
// import {
//   Menubar,
//   MenubarCheckboxItem,
//   MenubarContent,
//   MenubarItem,
//   MenubarMenu,
//   MenubarRadioGroup,
//   MenubarRadioItem,
//   MenubarSeparator,
//   MenubarShortcut,
//   MenubarSub,
//   MenubarSubContent,
//   MenubarSubTrigger,
//   MenubarTrigger
// } from '@/components/ui/menubar'

const loading = ref(false)
const connected = ref(false)

const port = ref(null)
const lineBuffer = ref('')
const channels = ref([])

const appendStream = new WritableStream({
  write(chunk) {
    lineBuffer.value += chunk

    let lines = lineBuffer.value.split('\n')

    if (lines.length > 1) {
      lineBuffer.value = lines.pop()
      const line = lines.pop().trim()
      channels.value = line.split(',').map((value) => parseInt(value))
    }
  }
})

const connect = async () => {
  loading.value = true
  try {
    port.value = navigator.serial.requestPort({})
    await port.value.open({ baudRate: 115200 })

    connected.value = true

    port.value.readable.pipeThrough(new TextDecoderStream()).pipeTo(appendStream)
  } catch (error) {
    console.error('Error connecting to serial port:', error)
  }
  loading.value = false
}

const disconnect = () => {
  loading.value = true
  console.log('disconnect')
  loading.value = false
}
</script>
