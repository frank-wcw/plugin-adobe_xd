<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { $count } from './store.ts'
const count = useStore($count)

function handleClick () {
  $count.set($count.get() + 1)
}
</script>

<template>
<div @click="handleClick">{{count}}</div>
</template>