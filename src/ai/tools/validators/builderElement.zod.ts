import { z } from "zod";

export const ELEMENT_TYPES = [
  "fragment",
  "div",
  "text",
  "image",
  "button",
  "input",
  "textarea",
  "link",
  "icon",
] as const;

export const OnClickActionZod = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("route"),
    href: z.string().min(1),
    replace: z.boolean().optional(),
  }),
  z.object({ kind: z.literal("back") }),
  z.object({ kind: z.literal("reload") }),
  z.object({
    kind: z.literal("external"),
    href: z.string().min(1),
    newTab: z.boolean().optional(),
  }),
]);

export const BuilderElementZod: z.ZodType<any> = z.object({
  type: z.enum(ELEMENT_TYPES),
  className: z.string().optional(),
  visible: z.boolean().optional(),
  props: z
    .object({
      onClick: OnClickActionZod.optional(),
      text: z.string().optional(),
      href: z.string().optional(),
      placeholder: z.string().optional(),
      alt: z.string().optional(),
      target: z.string().optional(),
      rel: z.string().optional(),
      value: z.string().optional(),
      type: z.string().optional(),
      name: z.string().optional(),
      size: z.number().optional(),
      color: z.string().optional(),
      strokeWidth: z.number().optional(),
    })
    .passthrough()
    .optional(),
  children: z.array(z.lazy(() => BuilderElementZod)).optional(),
});

export const InsertElementArgsZod = z.object({
  route: z.string().min(1),
  parent_id: z.string().min(1),
  element: BuilderElementZod,
});

