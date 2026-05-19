import { Type } from "@google/genai";

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

const OnClickActionSchema = {
  type: Type.OBJECT,
  properties: {
    kind: {
      type: Type.STRING,
      enum: ["route", "back", "reload", "external"],
      description:
        "What happens when the element is clicked. 'route' navigates within the app, 'external' opens a URL, 'back' goes back, 'reload' refreshes.",
    },
    href: {
      type: Type.STRING,
      description:
        "URL to navigate to (used for kind='route' and kind='external').",
    },
    replace: {
      type: Type.BOOLEAN,
      description: "For kind='route': replace history instead of pushing.",
    },
    newTab: {
      type: Type.BOOLEAN,
      description: "For kind='external': open link in a new tab.",
    },
  },
  required: ["kind"],
};

const BuilderElementPropsSchema = {
  type: Type.OBJECT,
  properties: {
    onClick: OnClickActionSchema,
    text: {
      type: Type.STRING,
      description:
        "Text content used by 'text' (<p>), 'button' (label), and as a fallback for 'link' when it has no children.",
    },
    href: {
      type: Type.STRING,
      description: "For 'link': the href attribute (defaults to '#').",
    },
    placeholder: {
      type: Type.STRING,
      description: "For 'input' and 'textarea': placeholder shown when empty.",
    },
    alt: {
      type: Type.STRING,
      description:
        "For 'image': alt text for accessibility AND the query used to fetch a suitable Unsplash image (src is auto-resolved from alt).",
    },
    target: {
      type: Type.STRING,
      description: "For 'link': target attribute (e.g. '_blank').",
    },
    rel: {
      type: Type.STRING,
      description: "For 'link': rel attribute (e.g. 'noreferrer').",
    },
    value: {
      type: Type.STRING,
      description:
        "For 'input' and 'textarea': default value (maps to defaultValue).",
    },
    type: {
      type: Type.STRING,
      description:
        "For 'input': input type (e.g. 'text', 'email', 'password'). Defaults to 'text'.",
    },

    // icon
    name: {
      type: Type.STRING,
      description: "For 'icon': Lucide icon name (e.g. 'ArrowRight', 'Menu').",
    },
    size: { type: Type.NUMBER, description: "For 'icon': size in px." },
    color: { type: Type.STRING, description: "For 'icon': stroke color." },
    strokeWidth: {
      type: Type.NUMBER,
      description: "For 'icon': stroke width.",
    },
  },
};

// NOTE: Gemini tool `parameters` schemas reject `$ref`, so true recursion isn't available here.
// We unroll nesting to a reasonable max depth; for deeper trees, insert in multiple steps.
const buildBuilderElementSchema = (depth: number): any => {
  return {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        enum: ELEMENT_TYPES,
        description:
          "Element type to render. Use 'text' for <p>, 'image' forn <img>, 'link' for <a>, 'icon' for Lucide icon, 'fragment' renders children only",
      },
      className: {
        type: Type.STRING,
        description: "Tailwind CSS className (Tailwind only)",
      },
      visible: {
        type: Type.BOOLEAN,
        description: "Visibility flag",
      },
      props: BuilderElementPropsSchema,
      children: {
        type: Type.ARRAY,
        description:
          "Child elements. Each child can itself have children (children[].children[]...)",
        items:
          depth > 0
            ? buildBuilderElementSchema(depth - 1)
            : {
                type: Type.OBJECT,
                description:
                  "Max depth reached. Insert deeper children separately using the returned inserted_id as parent_id",
              },
      },
    },
    required: ["type"],
  };
};

export const BuilderElementSchema: any = buildBuilderElementSchema(4);

export const InsertElementSchema = {
  name: "insert_element",
  description:
    "Inserts element code. Use element.children to create nested UI. Each child is another BuilderElement and can itself have children.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      route: {
        type: Type.STRING,
        pattern: "^/(?:[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*)?$",
        description:
          "The route to insert the element at. Use URL paths with forward slashes only. Examples: '/', '/about', '/pricing'. Never send Windows-style backslashes (e.g. '\\\\') or filesystem paths like 'app/pricing'. Never send empty string.",
      },
      parent_id: {
        type: Type.STRING,
        description: "The parent id to insert the element at.",
      },
      element: {
        ...BuilderElementSchema,
        description: "The element to insert.",
      },
    },
    required: ["route", "parent_id", "element"],
  },
};
