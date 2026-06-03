<template>
  <div class="min-h-screen bg-gray-900 text-white font-sans">
    <header class="p-4 bg-black shadow-md border-b border-gray-800 flex justify-between items-center">
      <NuxtLink to="/" class="text-2xl font-bold text-red-600 tracking-wider">
        🎬 HOME THEATER
      </NuxtLink>
      <nav class="space-x-4">
        <NuxtLink to="/" class="hover:text-gray-300">首頁</NuxtLink>
        <NuxtLink to="/admin" class="hover:text-gray-300">上傳影片</NuxtLink>
      </nav>
    </header>

    <main class="p-6 max-w-7xl mx-auto">
      <slot />
    </main>
  </div>
</template>