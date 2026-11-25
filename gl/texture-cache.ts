import { LinearFilter, LinearMipmapLinearFilter, NoColorSpace, Texture, VideoTexture, type WebGLRenderer } from "three";

/**
 * Refcounted GPU textures built from DOM media.
 *
 * - Images: wait for `decode()`, then key by `currentSrc`, so the texture reuses the
 *   exact `/_next/image` response the DOM already downloaded (same origin, no CORS,
 *   no second request). Uploaded through an ImageBitmap of that element.
 * - Videos: keyed by element (VideoTexture follows the element's frames).
 * - Release drops a ref; at zero the texture lingers for `disposeDelay` (30s) so
 *   back/forward navigation re-acquires it for free. Caps (24 images / 3 videos)
 *   evict the oldest unreferenced entries first.
 *
 * Textures stay in raw sRGB (NoColorSpace): the shaders grade in the same space CSS
 * filters use, so the GL look matches the DOM fallback.
 */
type Kind = "image" | "video";

type Entry = {
  key: string | HTMLVideoElement;
  kind: Kind;
  texture: Texture;
  width: number;
  height: number;
  refs: number;
  timer: number | null;
  lastUsed: number;
};

export type TextureHandle = {
  /** Null until the media is decoded and uploaded. */
  readonly texture: Texture | null;
  readonly width: number;
  readonly height: number;
  readonly ready: boolean;
  release(): void;
};

type Options = { imageCap?: number; videoCap?: number; disposeDelay?: number };

export class TextureCache {
  private images = new Map<string, Entry>();
  private videos = new Map<HTMLVideoElement, Entry>();
  private renderer: WebGLRenderer;
  private imageCap: number;
  private videoCap: number;
  private disposeDelay: number;
  private disposed = false;

  constructor(renderer: WebGLRenderer, opts: Options = {}) {
    this.renderer = renderer;
    this.imageCap = opts.imageCap ?? 24;
    this.videoCap = opts.videoCap ?? 3;
    this.disposeDelay = opts.disposeDelay ?? 30_000;
  }

  acquireImage(img: HTMLImageElement): TextureHandle {
    let entry: Entry | null = null;
    let released = false;
    const handle: TextureHandle = {
      get texture() {
        return entry?.texture ?? null;
      },
      get width() {
        return entry?.width ?? 0;
      },
      get height() {
        return entry?.height ?? 0;
      },
      get ready() {
        return entry !== null;
      },
      release: () => {
        if (released) return;
        released = true;
        if (entry) this.unref(entry);
      },
    };

    const attach = async () => {
      if (released || this.disposed || !img.naturalWidth) return;
      const key = img.currentSrc || img.src;
      let e = this.images.get(key);
      if (!e) {
        // An ImageBitmap, not the <img>: with srcset `w` descriptors naturalWidth is
        // density-corrected, so it under-reports the pixels WebGL would upload.
        // The bitmap carries the true size and is pre-flipped for GL.
        let bitmap: ImageBitmap;
        try {
          bitmap = await createImageBitmap(img, { imageOrientation: "flipY", premultiplyAlpha: "none" });
        } catch {
          return;
        }
        if (released || this.disposed) {
          bitmap.close();
          return;
        }
        e = this.images.get(key);
        if (e) bitmap.close();
        else {
          const texture = new Texture(bitmap);
          configure(texture);
          // Covers are minified (a 4k-tall scroll capture into a 900px viewport):
          // mipmaps keep the fetches cache-friendly and the result alias-free.
          texture.generateMipmaps = true;
          texture.minFilter = LinearMipmapLinearFilter;
          texture.flipY = false;
          texture.needsUpdate = true;
          e = { key, kind: "image", texture, width: bitmap.width, height: bitmap.height, refs: 0, timer: null, lastUsed: 0 };
          this.images.set(key, e);
          // Upload now (off the critical frame) instead of on first draw.
          this.renderer.initTexture(texture);
          this.enforceCap("image");
        }
      }
      this.ref(e);
      entry = e;
    };
    const run = () => {
      void attach();
    };

    const hit = img.complete && img.naturalWidth ? this.images.get(img.currentSrc || img.src) : undefined;
    if (hit) {
      // Already uploaded (e.g. the page was hidden by <Activity> and shown again): no
      // async gap, so the stage never flickers back to the generative layer.
      this.ref(hit);
      entry = hit;
    } else if (img.complete && img.naturalWidth) {
      img.decode().then(run, run);
    } else {
      img.addEventListener("load", () => img.decode().then(run, run), { once: true });
    }
    return handle;
  }

  acquireVideo(video: HTMLVideoElement): TextureHandle {
    let e = this.videos.get(video);
    if (!e) {
      const texture = new VideoTexture(video);
      configure(texture);
      e = { key: video, kind: "video", texture, width: video.videoWidth || 16, height: video.videoHeight || 9, refs: 0, timer: null, lastUsed: 0 };
      this.videos.set(video, e);
      const entry = e;
      const onMeta = () => {
        entry.width = video.videoWidth || entry.width;
        entry.height = video.videoHeight || entry.height;
      };
      if (video.readyState >= 1) onMeta();
      else video.addEventListener("loadedmetadata", onMeta, { once: true });
      this.enforceCap("video");
    }
    this.ref(e);
    const entry = e;
    let released = false;
    return {
      get texture() {
        return video.readyState >= 2 ? entry.texture : null;
      },
      get width() {
        return entry.width;
      },
      get height() {
        return entry.height;
      },
      get ready() {
        return video.readyState >= 2;
      },
      release: () => {
        if (released) return;
        released = true;
        this.unref(entry);
      },
    };
  }

  /** After a context restore every texture must be uploaded again. */
  invalidate() {
    for (const e of this.images.values()) e.texture.needsUpdate = true;
  }

  stats() {
    const count = (m: Map<unknown, Entry>) => {
      let live = 0;
      for (const e of m.values()) if (e.refs > 0) live++;
      return { total: m.size, live };
    };
    return { images: count(this.images), videos: count(this.videos) };
  }

  dispose() {
    this.disposed = true;
    for (const e of [...this.images.values(), ...this.videos.values()]) this.drop(e);
  }

  private ref(e: Entry) {
    e.refs++;
    e.lastUsed = performance.now();
    if (e.timer !== null) {
      window.clearTimeout(e.timer);
      e.timer = null;
    }
  }

  private unref(e: Entry) {
    e.refs = Math.max(0, e.refs - 1);
    e.lastUsed = performance.now();
    if (e.refs > 0 || this.disposed) return;
    e.timer = window.setTimeout(() => this.drop(e), this.disposeDelay);
    this.enforceCap(e.kind);
  }

  private drop(e: Entry) {
    if (e.timer !== null) window.clearTimeout(e.timer);
    e.timer = null;
    e.texture.dispose();
    const source = e.texture.image as unknown;
    if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) source.close();
    if (e.kind === "image") this.images.delete(e.key as string);
    else this.videos.delete(e.key as HTMLVideoElement);
  }

  private enforceCap(kind: Kind) {
    const map: Map<unknown, Entry> = kind === "image" ? this.images : this.videos;
    const cap = kind === "image" ? this.imageCap : this.videoCap;
    if (map.size <= cap) return;
    const idle = [...map.values()].filter((e) => e.refs === 0).sort((a, b) => a.lastUsed - b.lastUsed);
    while (map.size > cap && idle.length > 0) this.drop(idle.shift()!);
  }
}

function configure(texture: Texture) {
  texture.colorSpace = NoColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
}
