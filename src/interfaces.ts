import { ApiType, Database, InstallationType, ProjectType } from "./enums";

export interface Apis {
    type: ApiType,
    require: boolean
}

export interface ProjectConfig {
    projectName: string;
    installationType: InstallationType
    projectType: ProjectType
    apis: Apis[]
    socket: boolean
    database: Database
    swagger: {
        enabled: boolean
        path?: string
    },
    docker: boolean
}