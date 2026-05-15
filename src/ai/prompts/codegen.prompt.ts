import { CodegenIndex, CollectedContext, PlanTask } from "../../types/public.js";
import { codegenExamples } from "./examples/codegen.examples.js";
import {
  jsonBlock,
  mdSection,
  projectStateNote,
} from "./helpers/promptParts.helper.js";

export type CodegenNodePromptParams = {
  task: any;
  codegenIndex: CodegenIndex;
  collectedContext: CollectedContext;
  isNewProject: boolean;
};

export const codegenPrompt = (params: CodegenNodePromptParams) => {
  const { task, codegenIndex, collectedContext, isNewProject } = params;

  const intialPrompt = `You are a senior software engineer responsible for implementing ONE coding task precisely and safely within an existing codebase.
${projectStateNote(isNewProject, "codegen")}
    `;

  const context = mdSection(
    "Context (Authoritative)",
    [
      jsonBlock(
        "Project Context (User preferences etc.)",
        collectedContext ?? {},
      ),
    ].join("\n"),
  );

  const projectConfiguration = mdSection(
    "Project Configuration",
    [
      jsonBlock(
        "FRAMEWORK CONFIG",
        codegenIndex.projectConfigs.frameworkConfig,
      ),
      jsonBlock("RUNTIME CONFIG", codegenIndex.projectConfigs.runtimeConfig),
      jsonBlock(
        "RENDERING CONFIGURATION",
        codegenIndex.projectConfigs.renderingConfig,
      ),
    ].join("\n"),
  );

  const toolsInfo = mdSection(
    "Tool Usage",

    `
  You are provided access to the following tools and use them to implement coding tasks.

  read_file: Use when you want to read a file from the codebase.

  list_dir: Use when you want to list the directory structure of a given path.

  create_new_route: Use when you want to create a new route. It will create a new route with a page.tsx and pageConfig.json (initial contents) file.
  
  insert_element: Use when you want to insert a new element in the config
  
  delete_element: Use when you want to delete an element from the config.

  update_classname: Use when you want to update the className of an element.
  
  update_props: Use when you want to update the props of an element.

  submit_codegen_done: Use when you are done with the task and want to submit the codegen to the backend for validation.

  Important things to note:
  1. If a route doesn't exists, please create it using the create_new_route tool.
  2. When you are adding an image, just give the alt, which should be clear description of the image. The src of the image will be taken care by us.
  3. For icons use only lucide-react icons.

  `,
  );

  const taskInfo = mdSection(
    "Task (Authoritative)",
    jsonBlock("TASK (You need to implement)", task ?? null),
  );

  const examples = codegenExamples;

  const sections = [
    intialPrompt,
    context,
    projectConfiguration,
    toolsInfo,
    examples,
    taskInfo,
  ];
  return sections.join("\n\n---\n\n");
};
