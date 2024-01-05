import { ProjectConfig } from "./interfaces";

export const install = async (projectConfig: ProjectConfig) => {
    await new Promise(resolve => setTimeout(resolve, 1000))
}