import { Type } from "@google/genai";

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

export const UpdatePropsSchema = {
  name: "update_element",
  description: "Updates element code.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      route: {
        type: Type.STRING,
        description:
          "The route to update the element at. Example. '/' or '/about' etc.",
      },
      element_id: {
        type: Type.STRING,
        description: "The id of the element to be updated.",
      },
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
    required: ["route", "element_id"],
  },
};
