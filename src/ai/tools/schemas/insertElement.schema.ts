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

// Self-referential schema (children.items -> BuilderElementSchema)
export const BuilderElementSchema: any = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      enum: ELEMENT_TYPES,
      description:
        "Element type to render. 'text' renders a <p>, 'image' renders an <img>, 'link' renders an <a>, 'icon' renders a Lucide icon, 'fragment' renders children only.",
    },
    className: {
      type: Type.STRING,
      description:
        "Tailwind CSS className applied to the rendered element (Tailwind only).",
    },
    visible: {
      type: Type.BOOLEAN,
      description: "Whether the element should be shown.",
    },
    props: {
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
          description:
            "For 'input' and 'textarea': placeholder shown when empty.",
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
          description:
            "For 'icon': Lucide icon name (e.g. 'ArrowRight', 'Menu').",
        },
        size: { type: Type.NUMBER, description: "For 'icon': size in px." },
        color: { type: Type.STRING, description: "For 'icon': stroke color." },
        strokeWidth: {
          type: Type.NUMBER,
          description: "For 'icon': stroke width.",
        },
      },
    },
    children: {
      type: Type.ARRAY,
      description:
        "Nested children. Used by 'fragment' and 'div' directly, and by 'button'/'link' when present (otherwise they use props.text).",
      items: {},
    },
  },
  required: ["type"],
};

BuilderElementSchema.properties.children.items = BuilderElementSchema;

export const InsertElementSchema = {
  name: "insert_element",
  description:
    "Inserts element code. The element should be valid following the BuilderElement schema.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      route: {
        type: Type.STRING,
        description:
          "The route to insert the element at. Example. '/' or '/about' etc.",
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
