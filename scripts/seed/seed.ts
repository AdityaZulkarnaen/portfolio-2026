/**
 * Idempotent content seed (secret-key client, bypasses RLS).
 *
 *   pnpm seed            # upsert everything; keeps existing project layouts
 *   pnpm seed --reset    # wipe content tables + seeded storage objects first
 *
 * Steps: download images from the Sanity CDN → upload to Storage bucket `media`
 * (`projects/<slug>/cover.webp`, `profile/photo-<n>.webp`) → upsert media, projects,
 * default project_media (from layout presets; only for projects without frames),
 * profile, profile_media, experiences, skills, achievements, testimonials (photos from
 * supabase/seed/assets), clients (logos from public/clients), and the admins row
 * for ADMIN_EMAIL (looked up through the auth admin API).
 *
 * Node 22 native TypeScript: erasable syntax only, explicit `.ts` imports, no `@/` alias.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

import type { Database, Json } from "../../lib/supabase/database.types.ts";
import {
  buildSeedBundle,
  type ExtraContent,
  type LegacyContent,
  type LegacyImage,
  type SeedFrame,
  type SeedTestimonial,
} from "../../lib/content/seed-data.ts";
import { findPhoto } from "../../lib/content/section-media.ts";

const BUCKET = "media";
const MAX_WIDTH = 2560;
const SECTION_MAX = 2000;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const secret = process.env.SUPABASE_SECRET_KEY?.trim();
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const reset = process.argv.includes("--reset");

if (!url || !secret) {
  console.error(
    "✗ Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local.\n" +
      "  Seeding needs the secret key; nothing was changed.",
  );
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const seedDir = resolve(here, "..", "..", "supabase", "seed");
const publicDir = resolve(here, "..", "..", "public");
const legacy = JSON.parse(readFileSync(resolve(seedDir, "legacy-content.json"), "utf8")) as LegacyContent;
const extra = JSON.parse(readFileSync(resolve(seedDir, "extra-content.json"), "utf8")) as ExtraContent;
const bundle = buildSeedBundle(legacy, extra);

const db = createClient<Database>(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

function check<T>(label: string, result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

/** Like check(), for `.single()` results: also rejects a null row. */
function must<T>(label: string, result: { data: T; error: { message: string } | null }): NonNullable<T> {
  const data = check(label, result);
  if (data === null || data === undefined) throw new Error(`${label}: no row returned`);
  return data;
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------
async function removeStoragePrefix(prefix: string) {
  const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw new Error(`storage list ${prefix}: ${error.message}`);
  const files: string[] = [];
  for (const entry of data ?? []) {
    const path = `${prefix}/${entry.name}`;
    if (entry.id === null) await removeStoragePrefix(path); // folder
    else files.push(path);
  }
  if (files.length) {
    const removed = await db.storage.from(BUCKET).remove(files);
    if (removed.error) throw new Error(`storage remove ${prefix}: ${removed.error.message}`);
  }
}

async function resetContent() {
  console.log("· --reset: wiping content tables and seeded storage objects");
  const tables = [
    "testimonials",
    "clients",
    "reel_chapters",
    "project_media",
    "profile_media",
    "reels",
    "projects",
    "experiences",
    "skills",
    "achievements",
    "media",
  ] as const;
  for (const table of tables) {
    check(`reset ${table}`, await db.from(table).delete().not("id", "is", null));
  }
  check("reset profile", await db.from("profile").delete().eq("id", 1));
  await removeStoragePrefix("projects");
  await removeStoragePrefix("profile");
  await removeStoragePrefix("testimonials");
  await removeStoragePrefix("clients");
  await removeStoragePrefix("experience");
  await removeStoragePrefix("achievements");
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------
async function uploadImage(image: LegacyImage, path: string, position: number): Promise<string> {
  const cdn = new URL(image.url);
  cdn.searchParams.set("fm", "webp");
  cdn.searchParams.set("q", "85");
  if (image.width > MAX_WIDTH) {
    cdn.searchParams.set("w", String(MAX_WIDTH));
    cdn.searchParams.set("fit", "max");
  }

  const response = await fetch(cdn);
  if (!response.ok) throw new Error(`download ${cdn}: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error(`${path} is larger than the 10MB bucket limit`);

  const uploaded = await db.storage.from(BUCKET).upload(path, bytes, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });
  if (uploaded.error) throw new Error(`upload ${path}: ${uploaded.error.message}`);

  const scale = image.width > MAX_WIDTH ? MAX_WIDTH / image.width : 1;
  const row = must(
    `media ${path}`,
    await db
      .from("media")
      .upsert(
        {
          kind: "image",
          source: "storage",
          path,
          width: Math.round(image.width * scale),
          height: Math.round(image.height * scale),
          alt: image.alt,
          lqip: image.lqip,
          focal_x: image.focal_x,
          focal_y: image.focal_y,
          position,
        },
        { onConflict: "source,path" },
      )
      .select("id")
      .single(),
  );
  return row.id;
}

async function uploadLocalImage(
  photo: Pick<NonNullable<SeedTestimonial["photo"]>, "file" | "width" | "height" | "alt"> &
    Partial<Pick<NonNullable<SeedTestimonial["photo"]>, "focal_x" | "focal_y">>,
  position: number,
  root = resolve(seedDir, "assets"),
): Promise<string> {
  const bytes = new Uint8Array(readFileSync(resolve(root, photo.file)));
  const uploaded = await db.storage.from(BUCKET).upload(photo.file, bytes, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });
  if (uploaded.error) throw new Error(`upload ${photo.file}: ${uploaded.error.message}`);
  const row = must(
    `media ${photo.file}`,
    await db
      .from("media")
      .upsert(
        {
          kind: "image",
          source: "storage",
          path: photo.file,
          width: photo.width,
          height: photo.height,
          alt: photo.alt,
          focal_x: photo.focal_x ?? null,
          focal_y: photo.focal_y ?? null,
          position,
        },
        { onConflict: "source,path" },
      )
      .select("id")
      .single(),
  );
  return row.id;
}

function frameToJson(frame: SeedFrame, mediaId: string): Json {
  return {
    media_id: mediaId,
    placement: frame.placement,
    col_start: frame.colStart,
    col_end: frame.colEnd,
    row_index: frame.rowIndex,
    ratio: Number(frame.ratio.toFixed(4)),
    shift: frame.shift,
    depth: frame.depth,
    format: frame.format,
    frame: frame.frame,
    behavior: frame.behavior,
    mobile_span: frame.mobileSpan,
    caption: frame.caption,
    is_cover: frame.is_cover,
    position: frame.position,
  };
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function seedProjects() {
  for (const project of bundle.projects) {
    const coverId = project.cover
      ? await uploadImage(project.cover, `projects/${project.slug}/cover.webp`, 0)
      : null;

    const row = must(
      `project ${project.slug}`,
      await db
        .from("projects")
        .upsert(
          {
            slug: project.slug,
            name: project.name,
            year: project.year,
            kind: project.kind,
            role: project.role,
            summary: project.summary,
            body: project.body,
            stack: project.stack,
            live_url: project.live_url,
            repo_url: project.repo_url,
            device: project.device,
            accent: project.accent,
            featured: project.featured,
            published: project.published,
            position: project.position,
            cover_media_id: coverId,
          },
          { onConflict: "slug" },
        )
        .select("id")
        .single(),
    );

    // Default layout only when the project has no frames yet (never clobber edited layouts).
    const framesResult = await db
      .from("project_media")
      .select("id", { count: "exact", head: true })
      .eq("project_id", row.id);
    if (framesResult.error) throw new Error(`frames ${project.slug}: ${framesResult.error.message}`);
    const count = framesResult.count;

    if (coverId && (count ?? 0) === 0 && project.frames.length) {
      check(
        `replace_project_media ${project.slug}`,
        await db.rpc("replace_project_media", {
          p_project: row.id,
          p_frames: project.frames.map((f) => frameToJson(f, coverId)),
        }),
      );
    }
    console.log(`  ✓ project ${project.slug}${project.featured ? " (featured)" : ""} · preset ${project.preset}`);
  }
}

async function seedProfile() {
  check("profile", await db.from("profile").upsert({ id: 1, ...bundle.profile }, { onConflict: "id" }));
  for (const photo of bundle.photos) {
    const mediaId = await uploadImage(photo.image, `profile/photo-${photo.position + 1}.webp`, photo.position);
    check(
      `profile_media ${photo.position}`,
      await db
        .from("profile_media")
        .upsert(
          { profile_id: 1, media_id: mediaId, slot: photo.slot, position: photo.position },
          { onConflict: "slot,media_id" },
        ),
    );
  }
  console.log(`  ✓ profile + ${bundle.photos.length} photos`);
}

async function seedLists() {
  check(
    "experiences",
    await db.from("experiences").upsert(
      bundle.experiences.map((e) => ({
        slug: e.slug,
        role: e.role,
        org: e.org,
        start_date: e.start_date,
        end_date: e.end_date,
        summary: e.summary,
        highlights: e.highlights,
        stack: e.stack,
        position: e.position,
        published: true,
      })),
      { onConflict: "slug" },
    ),
  );
  const { retired } = bundle;
  if (retired.experiences.length) {
    check("retire experiences", await db.from("experiences").update({ published: false }).in("slug", retired.experiences));
  }
  if (retired.skills.length) {
    check("retire skills", await db.from("skills").update({ published: false }).in("name", retired.skills));
  }
  if (retired.achievements.length) {
    check("retire achievements", await db.from("achievements").update({ published: false }).in("slug", retired.achievements));
  }
  check(
    "skills",
    await db.from("skills").upsert(
      bundle.skills.map((s) => ({ ...s, published: true })),
      { onConflict: "name" },
    ),
  );
  check(
    "achievements",
    await db.from("achievements").upsert(
      bundle.achievements.map((a) => ({
        slug: a.slug,
        kind: a.kind,
        title: a.title,
        org: a.org,
        period: a.period,
        summary: a.summary,
        url: a.url ?? null,
        position: a.position,
        published: !retired.achievements.includes(a.slug),
      })),
      { onConflict: "slug" },
    ),
  );
  console.log(
    `  ✓ ${bundle.experiences.length} experiences · ${bundle.skills.length} skills · ${bundle.achievements.length} achievements`,
  );
}

async function seedTestimonials() {
  for (const t of bundle.testimonials) {
    const avatarId = t.photo ? await uploadLocalImage(t.photo, t.position) : null;
    let projectId: string | null = null;
    if (t.project_slug) {
      projectId = must(
        `testimonial project ${t.project_slug}`,
        await db.from("projects").select("id").eq("slug", t.project_slug).single(),
      ).id;
    }
    const values = {
      quote: t.quote,
      author_name: t.author_name,
      author_role: t.author_role,
      author_org: t.author_org,
      avatar_media_id: avatarId,
      project_id: projectId,
      position: t.position,
      published: true,
    };
    const existing = check(
      `testimonial ${t.author_name}`,
      await db.from("testimonials").select("id").eq("author_name", t.author_name).limit(1).maybeSingle(),
    );
    check(
      `testimonial ${t.author_name}`,
      existing
        ? await db.from("testimonials").update(values).eq("id", existing.id)
        : await db.from("testimonials").insert(values),
    );
  }
  console.log(`  ✓ ${bundle.testimonials.length} testimonials`);
}

async function seedClients() {
  // `kind` and `project_id` arrive with migration 20261128000100; seed without them until it is applied.
  const extended = !(await db.from("clients").select("kind, project_id").limit(1)).error;
  if (!extended) console.warn("  ! clients.kind / project_id missing: run `pnpm db:push`, then re-seed.");
  for (const c of bundle.clients) {
    const logoId = c.logo ? await uploadLocalImage(c.logo, c.position, publicDir) : null;
    let projectId: string | null = null;
    if (c.project_slug) {
      projectId = must(
        `client project ${c.project_slug}`,
        await db.from("projects").select("id").eq("slug", c.project_slug).single(),
      ).id;
    }
    const values = {
      name: c.name,
      url: c.url,
      logo_media_id: logoId,
      position: c.position,
      published: true,
      ...(extended ? { kind: c.kind, project_id: projectId } : {}),
    };
    const existing = check(
      `client ${c.name}`,
      await db.from("clients").select("id").eq("name", c.name).limit(1).maybeSingle(),
    );
    check(
      `client ${c.name}`,
      existing ? await db.from("clients").update(values).eq("id", existing.id) : await db.from("clients").insert(values),
    );
  }
  console.log(`  ✓ ${bundle.clients.length} clients`);
}

/**
 * Section images (experience reels, trophy cards), linked by path: `experience/<key>.webp`,
 * `achievements/<key>.webp`. Sources in supabase/seed/assets may be any size or format:
 * each is downscaled to ≤2000px WebP with a tiny LQIP, uploaded, and written to public/seed
 * for the offline fallback. Optional owner photos are skipped while absent.
 */
async function seedSectionMedia() {
  const assets = resolve(seedDir, "assets");
  let count = 0;
  for (const [i, m] of bundle.sectionMedia.entries()) {
    const source = findPhoto(assets, m.dir, m.key);
    if (!source) {
      if (!m.optional) console.warn(`  ! section image ${m.dir}/${m.key} is missing from supabase/seed/assets.`);
      continue;
    }
    const image = sharp(readFileSync(resolve(assets, source))).rotate();
    const { data, info } = await image
      .clone()
      .resize({ width: SECTION_MAX, height: SECTION_MAX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const lqip = await image.clone().resize({ width: 16 }).webp({ quality: 40 }).toBuffer();
    const file = `${m.dir}/${m.key}.webp`;
    const uploaded = await db.storage.from(BUCKET).upload(file, data, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });
    if (uploaded.error) throw new Error(`upload ${file}: ${uploaded.error.message}`);
    check(
      `media ${file}`,
      await db.from("media").upsert(
        {
          kind: "image",
          source: "storage",
          path: file,
          width: info.width,
          height: info.height,
          alt: m.alt,
          lqip: `data:image/webp;base64,${lqip.toString("base64")}`,
          focal_x: m.focal_x ?? null,
          focal_y: m.focal_y ?? null,
          position: i,
        },
        { onConflict: "source,path" },
      ),
    );
    mkdirSync(resolve(publicDir, "seed", m.dir), { recursive: true });
    writeFileSync(resolve(publicDir, "seed", file), data);
    count++;
  }
  console.log(`  ✓ ${count} section images`);
}

async function seedAdmin() {
  if (!adminEmail) {
    console.warn("  ! ADMIN_EMAIL is not set — skipping the admins row.");
    return;
  }
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`auth listUsers: ${error.message}`);
    const user = data.users.find((u) => u.email?.toLowerCase() === adminEmail);
    if (user) {
      check(
        "admins",
        await db.from("admins").upsert({ user_id: user.id, email: adminEmail }, { onConflict: "user_id" }),
      );
      console.log("  ✓ admin row for ADMIN_EMAIL");
      return;
    }
    if (data.users.length < 200) break;
  }
  console.warn("  ! No auth user matches ADMIN_EMAIL — create it in the Supabase dashboard, then re-run.");
}

async function main() {
  console.log(`Seeding ${new URL(url as string).host}${reset ? " (reset)" : ""}`);
  if (reset) await resetContent();
  await seedProjects();
  await seedProfile();
  await seedLists();
  await seedTestimonials();
  await seedClients();
  await seedSectionMedia();
  await seedAdmin();
  console.log("Done. Revalidate the site (tag `content`) to see changes.");
}

main().catch((error: unknown) => {
  console.error(`✗ Seed failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
