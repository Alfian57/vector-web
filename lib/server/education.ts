import { getSchema, type JSONContent } from "@tiptap/core";
import { z } from "zod";
import type {
  Account,
  EducationArticle as Article,
  EducationArticleSummary,
  EducationStatus,
  Page,
} from "@/lib/domain";
import { Prisma } from "../../generated/prisma/client";
import { educationEditorExtensions } from "@/lib/education-editor-extensions";
import { db, transaction } from "./db";
import { writeActivity } from "./activity-log";
import { RequestError } from "./http";

const schema = getSchema(educationEditorExtensions);
const pageSize = 12;
const maxArticleBytes = 100_000;
const statusSchema = z.enum(["draft", "published"]);
const educationImagePath =
  /^\/api\/education\/images\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const articleFields = z.object({
  title: z.string().trim().min(5).max(120),
  category: z.string().trim().min(2).max(50),
  summary: z.string().trim().min(20).max(300),
  content: z.unknown(),
  status: statusSchema.optional(),
});

function validateDocument(input: unknown): JSONContent {
  let encoded: string;
  try {
    encoded = JSON.stringify(input);
  } catch {
    throw new RequestError(422, "Isi artikel tidak valid.");
  }
  if (!encoded || encoded.length > maxArticleBytes) throw new RequestError(422, "Isi artikel terlalu panjang.");

  try {
    const node = schema.nodeFromJSON(input as JSONContent);
    node.check();
    if (!node.textContent.trim()) throw new Error("Document is empty.");
    if (node.nodeSize > 20_000) throw new Error("Document is too large.");
    const visit = (value: JSONContent, depth = 0): void => {
      if (depth > 32) throw new Error("Document is too deep.");
      if (value.type === "image") {
        const source = value.attrs?.src;
        if (typeof source !== "string" || !educationImagePath.test(source)) {
          throw new Error("Images must use the VEKTOR media endpoint.");
        }
      }
      for (const mark of value.marks ?? []) {
        if (mark.type === "link") {
          const href = mark.attrs?.href;
          if (typeof href !== "string") throw new Error("Link is missing a URL.");
          const url = new URL(href);
          if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS links are allowed.");
        }
      }
      for (const child of value.content ?? []) visit(child, depth + 1);
    };
    visit(input as JSONContent);
    return input as JSONContent;
  } catch {
    throw new RequestError(422, "Isi artikel, tautan, atau gambar tidak valid.");
  }
}
function slugFor(title: string) {
  return (
    title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90) || "panduan-padi"
  );
}

function pageFrom(params: URLSearchParams) {
  const page = Number(params.get("page") ?? 0);
  if (!Number.isSafeInteger(page) || page < 0 || page > 10_000)
    throw new RequestError(422, "Nomor halaman tidak valid.");
  return page;
}

export async function listPublishedArticles(params: URLSearchParams): Promise<Page<EducationArticleSummary>> {
  const page = pageFrom(params);
  const category = params.get("category")?.trim();
  const query = params.get("q")?.trim().slice(0, 100);
  const rows = await db().educationArticle.findMany({
    where: {
      status: "published",
      ...(category ? { category: { equals: category.slice(0, 50), mode: "insensitive" as const } } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" as const } },
              { summary: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      summary: true,
      status: true,
      updatedAt: true,
      publishedAt: true,
      author: { select: { name: true } },
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    skip: page * pageSize,
    take: pageSize + 1,
  });
  return {
    entries: rows
      .slice(0, pageSize)
      .map(({ author, id, slug, title, category, summary, status, updatedAt, publishedAt }) => ({
        id,
        slug,
        title,
        category,
        summary,
        status: status as EducationStatus,
        author: author.name,
        updatedAt: updatedAt.toISOString(),
        publishedAt: publishedAt?.toISOString() ?? null,
      })),
    hasMore: rows.length > pageSize,
  };
}

export async function getPublishedArticle(slug: string): Promise<Article> {
  const row = await db().educationArticle.findFirst({
    where: { slug, status: "published" },
    include: { author: { select: { name: true } } },
  });
  if (!row) throw new RequestError(404, "Artikel tidak ditemukan.");
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    status: row.status as EducationStatus,
    content: row.content as Record<string, unknown>,
    author: row.author.name,
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

export async function listEducationForAdmin(params: URLSearchParams): Promise<Page<EducationArticleSummary>> {
  const page = pageFrom(params);
  const status = params.get("status");
  if (status && !["draft", "published", "archived"].includes(status))
    throw new RequestError(422, "Filter artikel tidak valid.");
  const rows = await db().educationArticle.findMany({
    where: status ? { status } : {},
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      summary: true,
      status: true,
      updatedAt: true,
      publishedAt: true,
      author: { select: { name: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: page * pageSize,
    take: pageSize + 1,
  });
  return {
    entries: rows
      .slice(0, pageSize)
      .map(({ author, id, slug, title, category, summary, status, updatedAt, publishedAt }) => ({
        id,
        slug,
        title,
        category,
        summary,
        status: status as EducationStatus,
        author: author.name,
        updatedAt: updatedAt.toISOString(),
        publishedAt: publishedAt?.toISOString() ?? null,
      })),
    hasMore: rows.length > pageSize,
  };
}

export async function getEducationForAdmin(id: string): Promise<Article> {
  const row = await db().educationArticle.findUnique({
    where: { id },
    include: { author: { select: { name: true } } },
  });
  if (!row) throw new RequestError(404, "Artikel tidak ditemukan.");
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    status: row.status as EducationStatus,
    content: row.content as Record<string, unknown>,
    author: row.author.name,
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

export async function saveEducationArticle(actor: Account, id: string | undefined, body: unknown) {
  const parsed = articleFields.parse(body);
  const content = validateDocument(parsed.content);
  const status = parsed.status ?? "draft";
  const slug = id ? undefined : slugFor(parsed.title);
  try {
    return await transaction(async (client) => {
      const current = id ? await client.educationArticle.findUnique({ where: { id } }) : null;
      if (id && !current) throw new RequestError(404, "Artikel tidak ditemukan.");
      if (current?.status === "archived") throw new RequestError(409, "Artikel arsip tidak dapat diubah.");
      const publishedAt = status === "published" ? (current?.publishedAt ?? new Date()) : null;
      const article = id
        ? await client.educationArticle.update({
            where: { id },
            data: {
              title: parsed.title,
              category: parsed.category,
              summary: parsed.summary,
              content: content as Prisma.InputJsonValue,
              status,
              publishedAt,
              updatedAt: new Date(),
            },
            select: { id: true, slug: true, status: true },
          })
        : await client.educationArticle.create({
            data: {
              slug: slug!,
              title: parsed.title,
              category: parsed.category,
              summary: parsed.summary,
              content: content as Prisma.InputJsonValue,
              status,
              authorId: actor.id,
              publishedAt,
            },
            select: { id: true, slug: true, status: true },
          });
      const imageIds = new Set<string>();
      const collectImages = (value: JSONContent) => {
        if (value.type === "image" && typeof value.attrs?.src === "string") {
          const match = value.attrs.src.match(
            /^\/api\/education\/images\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
          );
          if (match) imageIds.add(match[1]);
        }
        for (const child of value.content ?? []) collectImages(child);
      };
      collectImages(content);
      if (imageIds.size) {
        const ownedImages = await client.educationImage.count({
          where: { articleId: article.id, id: { in: [...imageIds] } },
        });
        if (ownedImages !== imageIds.size)
          throw new RequestError(422, "Gunakan hanya gambar yang diunggah untuk artikel ini.");
      }
      await client.educationImage.deleteMany({
        where: imageIds.size ? { articleId: article.id, id: { notIn: [...imageIds] } } : { articleId: article.id },
      });
      await writeActivity(
        {
          category: "education",
          action: id ? "education.article.updated" : "education.article.created",
          actor,
          targetType: "education_article",
          targetId: article.id,
          summary: id ? "Artikel diperbarui." : "Artikel dibuat.",
        },
        client,
      );
      if (status !== current?.status) {
        await writeActivity(
          {
            category: "education",
            action: `education.article.${status}`,
            actor,
            targetType: "education_article",
            targetId: article.id,
            summary: status === "published" ? "Artikel diterbitkan." : "Artikel disimpan sebagai draf.",
          },
          client,
        );
      }
      return article;
    });
  } catch (error) {
    if (error instanceof RequestError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new RequestError(409, "Judul artikel menghasilkan tautan yang sudah dipakai. Ubah judul lalu coba lagi.");
    }
    throw error;
  }
}

export async function archiveEducationArticle(actor: Account, id: string) {
  await transaction(async (client) => {
    const current = await client.educationArticle.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!current) throw new RequestError(404, "Artikel tidak ditemukan.");
    if (current.status === "archived") return;
    await client.educationArticle.update({ where: { id }, data: { status: "archived", updatedAt: new Date() } });
    await writeActivity(
      {
        category: "education",
        action: "education.article.archived",
        actor,
        targetType: "education_article",
        targetId: id,
        summary: "Artikel diarsipkan.",
      },
      client,
    );
  });
}

export async function restoreEducationArticle(actor: Account, id: string) {
  await transaction(async (client) => {
    const current = await client.educationArticle.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!current) throw new RequestError(404, "Artikel tidak ditemukan.");
    if (current.status !== "archived") return;
    await client.educationArticle.update({
      where: { id },
      data: { status: "draft", publishedAt: null, updatedAt: new Date() },
    });
    await writeActivity(
      {
        category: "education",
        action: "education.article.restored",
        actor,
        targetType: "education_article",
        targetId: id,
        summary: "Artikel dipulihkan sebagai draf.",
      },
      client,
    );
  });
}
