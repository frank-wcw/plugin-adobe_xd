<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import {atom} from "nanostores";

const $count = atom(0)
const count = useStore($count)

function handleClick () {
  $count.set($count.get() + 1)
}
</script>

<template>
<div @click="handleClick">{{count}}</div>
</template>