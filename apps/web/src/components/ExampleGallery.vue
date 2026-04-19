<script setup lang="ts">
import type { GalleryItem } from "../example-gallery";

defineProps<{
  items: GalleryItem[];
}>();
</script>

<template>
  <section class="gallery-panel">
    <div class="section-heading">
      <div>
        <p class="section-heading__eyebrow">Gallery</p>
        <h2>Illustrative dish concepts</h2>
      </div>
      <p class="section-heading__copy">
        The live menu has no official photography, so these visuals stay clearly
        illustrative.
      </p>
    </div>

    <div class="gallery-grid">
      <article v-for="item in items" :key="item.title" class="gallery-card">
        <img
          :src="item.imageUrl"
          :alt="item.title"
          class="gallery-card__image"
        />
        <div class="gallery-card__body">
          <h3>{{ item.title }}</h3>
          <p>{{ item.note }}</p>
        </div>
      </article>
    </div>
  </section>
</template>
